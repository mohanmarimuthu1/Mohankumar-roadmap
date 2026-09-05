// Supabase client + the two write paths the worker needs: upsert articles,
// prune stale ones.
//
// The service role key is used deliberately: under supabase/schema.sql,
// `news_articles` has RLS on with a read-only policy for signed-in users and
// no insert policy at all, so only a role that bypasses RLS can write to it.
//
// Column names are detected at runtime rather than hard-coded -- see
// `resolveShape` below for why.

import { createClient } from '@supabase/supabase-js'
import { log, get, toIso, clip, stripHtml } from './util.js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  throw new Error(
    'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (copy worker/.env.example to worker/.env)'
  )
}

// Legacy anon JWTs decode to {"role":"anon"}; catching that here beats a wall
// of silent RLS-denied inserts.
if (/^eyJ/.test(key)) {
  try {
    const claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString('utf8'))
    if (claims.role && claims.role !== 'service_role') {
      throw new Error(
        `SUPABASE_SERVICE_ROLE_KEY looks like a "${claims.role}" key; the worker needs the service_role key`
      )
    }
  } catch (error) {
    if (String(error.message).startsWith('SUPABASE_SERVICE_ROLE_KEY')) throw error
  }
}

const BASE_URL = url.replace(/\/+$/, '').replace(/\/rest\/v1$/, '')

export const supabase = createClient(BASE_URL, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { 'x-client-info': 'mohan-roadmap-worker/1.0' } },
})

export const TABLE = 'news_articles'

/**
 * Category values. The app's Live tab (LIVE_CATEGORIES in src/lib/hooks.js)
 * filters on exactly these five, and supabase/schema.sql pins them with a
 * CHECK constraint, so they stay plural regardless of which schema is live.
 */
export const CATEGORIES = {
  news: 'news',
  models: 'models',
  papers: 'papers',
  repos: 'repos',
  hn: 'hn',
}

const CHUNK_SIZE = 100

/* --------------------------------------------------------------- schema */

// Two different `news_articles` layouts exist in the wild for this project:
//
//   supabase/schema.sql   id uuid  | url  | published_at | unique(category,url)
//   the deployed database id bigint| link | published    | unique(link)
//
// Rather than pick one and break the other, the worker reads the column list
// from PostgREST's OpenAPI document once per process and maps onto whatever it
// finds. The conflict target is then confirmed by trying it -- constraints are
// not exposed in that document.
let shapePromise = null

function resolveShape() {
  // Cache the promise, not the result: nine sources ask for this at once and
  // only one of them should go and fetch the document.
  shapePromise ??= loadShape()
  return shapePromise
}

async function loadShape() {
  const { data } = await get(`${BASE_URL}/rest/v1/`, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
  })

  const columns = Object.keys(data?.definitions?.[TABLE]?.properties ?? {})
  if (columns.length === 0) {
    throw new Error(
      `${TABLE} is not exposed by the API. Apply supabase/schema.sql, then run: notify pgrst, 'reload schema';`
    )
  }

  const pick = (...candidates) => candidates.find((name) => columns.includes(name))

  const link = pick('url', 'link')
  const published = pick('published_at', 'published')

  if (!link || !published) {
    throw new Error(
      `${TABLE} is missing a link column (url/link) or a date column (published_at/published); found: ${columns.join(', ')}`
    )
  }

  const shape = {
    columns,
    link,
    published,
    metadata: columns.includes('metadata'),
    // Most specific first; upsertChunk falls back if the constraint is absent.
    conflictTargets: [`category,${link}`, link],
  }

  log.info('resolved news_articles shape', {
    link,
    published,
    metadata: shape.metadata,
  })

  return shape
}

/* ---------------------------------------------------------------- write */

/**
 * Drop junk, normalise fields, and collapse duplicates within a run. Returns
 * canonical articles; `toRow` renames them to the live table's columns.
 */
export function normalise(articles) {
  const seen = new Set()
  const clean = []

  for (const article of articles) {
    const link = String(article.url ?? '').trim()
    const title = stripHtml(article.title ?? '')

    if (!title || !/^https?:\/\//i.test(link)) {
      log.debug('dropping malformed article', { source: article.source, title, url: link })
      continue
    }

    const category = CATEGORIES[article.category]
    if (!category) {
      log.warn('dropping article with unknown category', { category: article.category, url: link })
      continue
    }

    // Postgres aborts an entire upsert if one batch hits the same conflict key
    // twice, so within-run duplicates have to go before the request is built.
    // Keyed on the link alone: that is the narrower of the two constraints in
    // play, so it is safe under both. The cost is that a link appearing in two
    // categories in one run (an HN story about a GitHub repo) keeps only the
    // first, which is what a link-unique table would end up with anyway.
    if (seen.has(link)) continue
    seen.add(link)

    clean.push({
      category,
      source: String(article.source ?? '').slice(0, 120),
      title: clip(title, 300),
      url: link,
      summary: clip(article.summary ?? '', 600),
      published_at: toIso(article.published_at),
      metadata: article.metadata ?? {},
    })
  }

  return clean
}

function toRow(article, target) {
  const row = {
    category: article.category,
    source: article.source,
    title: article.title,
    summary: article.summary,
    fetched_at: new Date().toISOString(),
    [target.link]: article.url,
    [target.published]: article.published_at,
  }

  if (target.metadata) row.metadata = article.metadata

  return row
}

/**
 * Upsert so re-running never duplicates a story; an item already on file just
 * has its metadata and fetched_at refreshed. Returns rows written.
 */
export async function saveArticles(articles) {
  const target = await resolveShape()
  const rows = normalise(articles).map((article) => toRow(article, target))
  if (rows.length === 0) return 0

  let written = 0

  for (let index = 0; index < rows.length; index += CHUNK_SIZE) {
    written += await upsertChunk(rows.slice(index, index + CHUNK_SIZE), target)
  }

  return written
}

async function upsertChunk(chunk, target) {
  const onConflict = target.conflictTargets[0]

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(chunk, { onConflict })
    .select('id')

  if (!error) return data?.length ?? chunk.length

  // 42P10: no unique constraint matches the ON CONFLICT clause. Retire that
  // candidate and retry. Sources run concurrently, so a chunk can also fail on
  // a target another source has already retired -- that one just retries on
  // the current best candidate without shifting again.
  if (error.code === '42P10') {
    if (onConflict === target.conflictTargets[0] && target.conflictTargets.length > 1) {
      target.conflictTargets.shift()
      log.info('conflict target not backed by a constraint, falling back', {
        tried: onConflict,
        using: target.conflictTargets[0],
      })
    }

    if (onConflict !== target.conflictTargets[0]) return upsertChunk(chunk, target)
  }

  throw new Error(`${error.message}${error.hint ? ` (${error.hint})` : ''}`)
}

/* ---------------------------------------------------------------- prune */

/**
 * Delete anything older than `days`. Returns rows removed.
 *
 * "Older" means published date for real articles, but fetched_at for models:
 * the Hub is sorted by downloads, so the top 20 are dominated by long-lived
 * releases whose lastModified is often a year or more in the past. Pruning
 * those by publish date would empty the Models tab every night. Instead a
 * model row survives as long as the worker keeps seeing it, and ages out 30
 * days after it drops off the leaderboard.
 */
export async function pruneOlderThan(days) {
  const target = await resolveShape()
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString()

  const passes = [
    supabase.from(TABLE).delete().neq('category', 'models').lt(target.published, cutoff).select('id'),
    supabase.from(TABLE).delete().eq('category', 'models').lt('fetched_at', cutoff).select('id'),
  ]

  let removed = 0

  for (const pass of passes) {
    const { data, error } = await pass
    if (error) throw new Error(error.message)
    removed += data?.length ?? 0
  }

  return removed
}

/** Startup check: the table is reachable and its columns are understood. */
export async function ping() {
  const target = await resolveShape()

  const { error } = await supabase.from(TABLE).select('id', { count: 'exact', head: true })
  if (error) throw new Error(`cannot reach ${TABLE}: ${error.message}`)

  return target
}
