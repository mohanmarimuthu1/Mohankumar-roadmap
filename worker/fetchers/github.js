// LLM repos created in the last 30 days, most stars first -> category "repos".
//
// Unauthenticated search is capped at 10 requests/minute; four runs a day sits
// well inside that, but GITHUB_TOKEN (no scopes needed) triples the ceiling
// and is worth setting if the schedule ever gets tighter.

import { get, clip, toIso, daysAgo, PER_SOURCE_LIMIT } from '../util.js'

const ENDPOINT = 'https://api.github.com/search/repositories'
const SOURCE = 'GitHub'
const WINDOW_DAYS = 30

export async function fetchGithub({ limit = PER_SOURCE_LIMIT } = {}) {
  const since = daysAgo(WINDOW_DAYS).toISOString().slice(0, 10)

  const headers = { accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' }
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`

  const { data } = await get(ENDPOINT, {
    params: {
      q: `topic:llm created:>${since}`,
      sort: 'stars',
      order: 'desc',
      per_page: limit,
    },
    headers,
  })

  return (data.items ?? []).slice(0, limit).map((repo) => ({
    category: 'repos',
    source: SOURCE,
    title: repo.full_name ?? repo.name ?? '',
    url: repo.html_url ?? '',
    summary: clip(repo.description ?? ''),
    published_at: toIso(repo.created_at),
    metadata: {
      stars: repo.stargazers_count ?? 0,
      forks: repo.forks_count ?? 0,
      language: repo.language ?? null,
      owner: repo.owner?.login ?? null,
      topics: repo.topics?.slice(0, 8) ?? [],
      pushed_at: repo.pushed_at ?? null,
    },
  }))
}
