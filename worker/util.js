// Small shared helpers: logging, HTTP with retry, and text/date normalisation.

import axios from 'axios'

/* ------------------------------------------------------------------ log */

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 }
const threshold = LEVELS[process.env.LOG_LEVEL ?? 'info'] ?? LEVELS.info

function emit(level, message, fields) {
  if (LEVELS[level] < threshold) return

  const parts = [new Date().toISOString(), level.toUpperCase().padEnd(5), message]
  for (const [key, value] of Object.entries(fields ?? {})) {
    if (value === undefined || value === null) continue
    const text = typeof value === 'string' ? value : JSON.stringify(value)
    parts.push(`${key}=${/\s/.test(text) ? JSON.stringify(text) : text}`)
  }

  const line = parts.join(' ')
  if (level === 'error' || level === 'warn') console.error(line)
  else console.log(line)
}

export const log = {
  debug: (message, fields) => emit('debug', message, fields),
  info: (message, fields) => emit('info', message, fields),
  warn: (message, fields) => emit('warn', message, fields),
  error: (message, fields) => emit('error', message, fields),
}

/* ----------------------------------------------------------------- http */

const USER_AGENT =
  'mohan-roadmap-worker/1.0 (+https://github.com/mohankumarmarimuthu1) node-fetcher'

export const http = axios.create({
  timeout: Number(process.env.HTTP_TIMEOUT_MS ?? 20_000),
  maxRedirects: 5,
  headers: { 'user-agent': USER_AGENT, accept: '*/*' },
})

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * GET with a couple of retries. Only worth retrying transport errors, 429s and
 * 5xx -- a 404 will still be a 404 in two seconds.
 */
export async function get(url, config = {}, { retries = 2, backoffMs = 1500 } = {}) {
  let lastError

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await http.get(url, config)
    } catch (error) {
      lastError = error
      const status = error.response?.status
      const retryable = status === undefined || status === 429 || status >= 500
      if (!retryable || attempt === retries) break

      const wait = backoffMs * 2 ** attempt
      log.debug('retrying request', { url, status: status ?? 'network', attempt: attempt + 1, wait })
      await sleep(wait)
    }
  }

  const status = lastError.response?.status
  throw new Error(status ? `HTTP ${status} from ${url}` : `${lastError.message} (${url})`)
}

/* ----------------------------------------------------------------- text */

export function stripHtml(text = '') {
  return String(text)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

export function clip(text = '', max = 500) {
  const clean = stripHtml(text)
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean
}

/** Parse anything date-ish into an ISO string, falling back to "now". */
export function toIso(value, fallback = new Date()) {
  if (value == null || value === '') return fallback.toISOString()
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString()
}

/** YYYY-MM-DD, `days` ago -- GitHub's search qualifiers want a plain date. */
export function daysAgo(days) {
  return new Date(Date.now() - days * 86_400_000)
}

export const PER_SOURCE_LIMIT = Number(process.env.PER_SOURCE_LIMIT ?? 20)
