// Mohan Roadmap news worker.
//
//   node index.js          long-running: one fetch on startup, then on cron
//   node index.js --once   single fetch pass, then exit (handy for testing)
//   node index.js --prune  single prune pass, then exit
//
// Every source is attempted independently: one dead feed logs a failure and
// the other eight still land in Supabase.

import './env.js'

import cron from 'node-cron'

import { saveArticles, pruneOlderThan, ping } from './db.js'
import { log, PER_SOURCE_LIMIT } from './util.js'
import { RSS_FEEDS, fetchRss } from './fetchers/rss.js'
import { fetchHuggingFace } from './fetchers/huggingface.js'
import { fetchArxiv } from './fetchers/arxiv.js'
import { fetchGithub } from './fetchers/github.js'
import { fetchHackerNews } from './fetchers/hn.js'

const FETCH_SCHEDULE = process.env.CRON_SCHEDULE ?? '0 */6 * * *'
const PRUNE_SCHEDULE = process.env.PRUNE_SCHEDULE ?? '15 3 * * *'
const TIMEZONE = process.env.TZ ?? 'Asia/Kolkata'
const RETENTION_DAYS = Number(process.env.RETENTION_DAYS ?? 30)
const RUN_ON_STARTUP = (process.env.RUN_ON_STARTUP ?? 'true') !== 'false'

/** Every source the worker knows about, in the order they are reported. */
const SOURCES = [
  ...RSS_FEEDS.map((feed) => ({
    name: feed.source,
    category: 'news',
    fetch: () => fetchRss({ ...feed, limit: PER_SOURCE_LIMIT }),
  })),
  { name: 'Hugging Face', category: 'models', fetch: () => fetchHuggingFace() },
  { name: 'arXiv', category: 'papers', fetch: () => fetchArxiv() },
  { name: 'GitHub', category: 'repos', fetch: () => fetchGithub() },
  { name: 'Hacker News', category: 'hn', fetch: () => fetchHackerNews() },
]

// Guards against a slow run still being in flight when the next tick fires.
let running = false

async function runSource(source) {
  const startedAt = Date.now()

  try {
    const articles = await source.fetch()
    const written = await saveArticles(articles)

    log.info('fetch ok', {
      source: source.name,
      category: source.category,
      fetched: articles.length,
      written,
      ms: Date.now() - startedAt,
    })

    return { ok: true, written }
  } catch (error) {
    log.error('fetch failed', {
      source: source.name,
      category: source.category,
      ms: Date.now() - startedAt,
      error: error.message,
    })

    return { ok: false, written: 0 }
  }
}

export async function runAll(trigger = 'manual') {
  if (running) {
    log.warn('skipping run, previous one still in flight', { trigger })
    return null
  }

  running = true
  const startedAt = Date.now()
  log.info('run started', { trigger, sources: SOURCES.length })

  try {
    const results = await Promise.all(SOURCES.map(runSource))

    const summary = {
      trigger,
      ok: results.filter((result) => result.ok).length,
      failed: results.filter((result) => !result.ok).length,
      written: results.reduce((total, result) => total + result.written, 0),
      ms: Date.now() - startedAt,
    }

    log.info('run finished', summary)
    return summary
  } finally {
    running = false
  }
}

export async function runPrune(trigger = 'manual') {
  try {
    const removed = await pruneOlderThan(RETENTION_DAYS)
    log.info('prune finished', { trigger, removed, retention_days: RETENTION_DAYS })
    return removed
  } catch (error) {
    log.error('prune failed', { trigger, error: error.message })
    return null
  }
}

async function main() {
  const args = new Set(process.argv.slice(2))

  await ping()

  if (args.has('--prune')) {
    await runPrune('cli')
    return
  }

  if (args.has('--once')) {
    await runAll('cli')
    return
  }

  for (const [label, expression] of [
    ['CRON_SCHEDULE', FETCH_SCHEDULE],
    ['PRUNE_SCHEDULE', PRUNE_SCHEDULE],
  ]) {
    if (!cron.validate(expression)) throw new Error(`${label} is not a valid cron expression: ${expression}`)
  }

  cron.schedule(FETCH_SCHEDULE, () => runAll('cron'), { timezone: TIMEZONE })
  cron.schedule(PRUNE_SCHEDULE, () => runPrune('cron'), { timezone: TIMEZONE })

  log.info('worker ready', {
    fetch: FETCH_SCHEDULE,
    prune: PRUNE_SCHEDULE,
    timezone: TIMEZONE,
    retention_days: RETENTION_DAYS,
    node: process.version,
  })

  // Registered before the startup fetch so a PM2 stop during that first run
  // still exits cleanly.
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      log.info('shutting down', { signal })
      process.exit(0)
    })
  }

  if (RUN_ON_STARTUP) await runAll('startup')
}

// A source that throws is already handled per-source; anything reaching here is
// a real defect, so let PM2 restart the process rather than limp along.
process.on('unhandledRejection', (reason) => {
  log.error('unhandled rejection', { error: reason?.message ?? String(reason) })
  process.exit(1)
})

main().catch((error) => {
  log.error('worker failed to start', { error: error.message })
  process.exit(1)
})
