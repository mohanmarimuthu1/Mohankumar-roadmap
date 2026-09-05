// Hacker News stories about AI/LLMs with real traction -> category "hn".
//
// Algolia ranks by relevance, not recency, so the query is also bounded to the
// retention window. Without that the worker would keep re-inserting 2019
// classics that the nightly prune deletes hours later.

import { get, toIso, daysAgo, PER_SOURCE_LIMIT } from '../util.js'

const ENDPOINT = 'https://hn.algolia.com/api/v1/search'
const SOURCE = 'Hacker News'
const MIN_POINTS = 100

export async function fetchHackerNews({ limit = PER_SOURCE_LIMIT, windowDays = 30 } = {}) {
  const since = Math.floor(daysAgo(windowDays).getTime() / 1000)

  const { data } = await get(ENDPOINT, {
    params: {
      // Algolia ANDs query terms and has no OR operator, so a literal
      // "AI OR LLM" searches for stories containing the word "or" too and
      // returns almost nothing. optionalWords is how the OR is expressed.
      query: 'AI LLM',
      optionalWords: 'AI,LLM',
      tags: 'story',
      numericFilters: `points>${MIN_POINTS},created_at_i>${since}`,
      hitsPerPage: limit,
    },
  })

  return (data.hits ?? []).slice(0, limit).map((hit) => {
    const discussion = `https://news.ycombinator.com/item?id=${hit.objectID}`

    return {
      category: 'hn',
      source: SOURCE,
      // Ask/Show HN posts carry no outbound link, so the thread is the item.
      url: hit.url || discussion,
      title: hit.title ?? hit.story_title ?? '',
      summary: [
        `${hit.points ?? 0} points`,
        `${hit.num_comments ?? 0} comments`,
        hit.author ? `by ${hit.author}` : null,
      ]
        .filter(Boolean)
        .join(' | '),
      published_at: toIso(hit.created_at),
      metadata: {
        points: hit.points ?? 0,
        comments: hit.num_comments ?? 0,
        author: hit.author ?? null,
        hn_id: hit.objectID,
        discussion_url: discussion,
      },
    }
  })
}
