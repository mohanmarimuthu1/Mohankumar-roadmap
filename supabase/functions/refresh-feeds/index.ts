// Refreshes the shared `news_articles` table from public sources.
//
// Deploy:  supabase functions deploy refresh-feeds
// Invoke:  the Live tab calls it via supabase.functions.invoke('refresh-feeds')
//
// Only signed-in users can call it (verify_jwt defaults to on), and it writes
// with the service role key, which bypasses RLS.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Article = {
  category: 'news' | 'models' | 'papers' | 'repos' | 'hn'
  source: string
  title: string
  url: string
  summary: string
  published_at: string
}

const PER_SOURCE = 20
const TIMEOUT_MS = 12_000

/* ----------------------------------------------------------------- utils */

async function get(url: string, headers: Record<string, string> = {}) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'mohan-roadmap/1.0', ...headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`${url} -> ${response.status}`)
  return response
}

function decodeEntities(text: string) {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function tag(block: string, name: string) {
  const match = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))
  return match ? decodeEntities(match[1]) : ''
}

function clip(text: string, max = 280) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}

function isoOr(value: string, fallback = new Date()) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString()
}

/* --------------------------------------------------------------- sources */

/** Generic RSS 2.0 / Atom reader -- enough for the handful of feeds below. */
async function rss(url: string, source: string, category: Article['category']) {
  const xml = await (await get(url)).text()
  const blocks = xml.match(/<(item|entry)[\s\S]*?<\/(item|entry)>/gi) ?? []

  return blocks.slice(0, PER_SOURCE).map((block) => {
    // Atom puts the URL in an attribute; RSS uses a <link> element.
    const href = block.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1] ?? tag(block, 'link')

    return {
      category,
      source,
      title: tag(block, 'title'),
      url: href,
      summary: clip(tag(block, 'description') || tag(block, 'summary')),
      published_at: isoOr(tag(block, 'pubDate') || tag(block, 'published') || tag(block, 'updated')),
    }
  })
}

async function news(): Promise<Article[]> {
  const feeds: Array<[string, string]> = [
    ['https://www.deeplearning.ai/the-batch/feed/', 'The Batch'],
    ['https://openai.com/news/rss.xml', 'OpenAI'],
    ['https://www.anthropic.com/rss.xml', 'Anthropic'],
    ['https://huggingface.co/blog/feed.xml', 'Hugging Face'],
  ]

  const results = await Promise.allSettled(
    feeds.map(([url, source]) => rss(url, source, 'news'))
  )
  return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
}

async function models(): Promise<Article[]> {
  const data = await (
    await get('https://huggingface.co/api/models?sort=lastModified&direction=-1&limit=25')
  ).json()

  return (data as Array<Record<string, unknown>>).map((model) => ({
    category: 'models' as const,
    source: 'Hugging Face',
    title: String(model.modelId ?? model.id),
    url: `https://huggingface.co/${model.modelId ?? model.id}`,
    summary: [
      model.pipeline_tag ? String(model.pipeline_tag) : null,
      model.downloads ? `${model.downloads} downloads` : null,
      model.likes ? `${model.likes} likes` : null,
    ]
      .filter(Boolean)
      .join(' · '),
    published_at: isoOr(String(model.lastModified ?? '')),
  }))
}

async function papers(): Promise<Article[]> {
  const query =
    'http://export.arxiv.org/api/query?search_query=' +
    encodeURIComponent('cat:cs.CL OR cat:cs.LG OR cat:cs.AI') +
    `&sortBy=submittedDate&sortOrder=descending&max_results=${PER_SOURCE}`

  const xml = await (await get(query)).text()
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? []

  return entries.map((entry) => ({
    category: 'papers' as const,
    source: 'arXiv',
    title: tag(entry, 'title'),
    url: entry.match(/<id>([\s\S]*?)<\/id>/)?.[1]?.trim() ?? '',
    summary: clip(tag(entry, 'summary')),
    published_at: isoOr(tag(entry, 'published')),
  }))
}

async function repos(): Promise<Article[]> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)
  const query =
    'https://api.github.com/search/repositories?q=' +
    encodeURIComponent(`topic:llm pushed:>${since}`) +
    `&sort=stars&order=desc&per_page=${PER_SOURCE}`

  const data = await (await get(query, { accept: 'application/vnd.github+json' })).json()

  return (data.items ?? []).map((repo: Record<string, unknown>) => ({
    category: 'repos' as const,
    source: 'GitHub',
    title: String(repo.full_name),
    url: String(repo.html_url),
    summary: clip(`★ ${repo.stargazers_count} · ${repo.description ?? ''}`),
    published_at: isoOr(String(repo.pushed_at ?? '')),
  }))
}

async function hn(): Promise<Article[]> {
  const data = await (
    await get(
      'https://hn.algolia.com/api/v1/search_by_date?tags=story&query=AI&hitsPerPage=' + PER_SOURCE
    )
  ).json()

  return (data.hits ?? [])
    .filter((hit: Record<string, unknown>) => hit.title)
    .map((hit: Record<string, unknown>) => ({
      category: 'hn' as const,
      source: 'Hacker News',
      title: String(hit.title),
      url: String(hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`),
      summary: `${hit.points ?? 0} points · ${hit.num_comments ?? 0} comments`,
      published_at: isoOr(String(hit.created_at ?? '')),
    }))
}

/* ------------------------------------------------------------------ main */

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const sources = { news, models, papers, repos, hn }
  const settled = await Promise.allSettled(Object.values(sources).map((fn) => fn()))

  const failures: string[] = []
  const articles: Article[] = []

  settled.forEach((result, i) => {
    const name = Object.keys(sources)[i]
    if (result.status === 'fulfilled') articles.push(...result.value)
    else failures.push(`${name}: ${result.reason?.message ?? result.reason}`)
  })

  // Drop anything unusable, then de-duplicate on the table's unique key.
  const seen = new Set<string>()
  const rows = articles
    .filter((a) => a.title && a.url?.startsWith('http'))
    .filter((a) => {
      const key = `${a.category}|${a.url}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map((a) => ({ ...a, fetched_at: new Date().toISOString() }))

  const { error, count } = await supabase
    .from('news_articles')
    .upsert(rows, { onConflict: 'category,url', ignoreDuplicates: true, count: 'exact' })

  if (error) {
    return new Response(JSON.stringify({ error: error.message, failures }), {
      status: 500,
      headers: { ...CORS, 'content-type': 'application/json' },
    })
  }

  // Keep the table from growing without bound: drop anything over 30 days old.
  const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString()
  await supabase.from('news_articles').delete().lt('published_at', cutoff)

  return new Response(
    JSON.stringify({ fetched: rows.length, inserted: count ?? 0, failures }),
    { headers: { ...CORS, 'content-type': 'application/json' } }
  )
})
