// RSS/Atom newsletters -> category "news".
//
// The XML is fetched through the shared axios helper (retries, timeout, UA)
// and only then handed to rss-parser, so every source in the worker gets the
// same network behaviour.

import Parser from 'rss-parser'
import { get, clip, toIso, PER_SOURCE_LIMIT } from '../util.js'

export const RSS_FEEDS = [
  { source: 'TLDR AI', url: 'https://tldr.tech/api/rss/ai' },
  // Heads up: deeplearning.ai has taken this feed down (it answers 404 as of
  // Sep 2026) and the site advertises no replacement. Left in place so it
  // resumes on its own if they restore it -- until then it logs one
  // "fetch failed" line per run, which is the intended, visible behaviour.
  { source: 'The Batch', url: 'https://www.deeplearning.ai/the-batch/feed/' },
  { source: 'Latent Space', url: 'https://www.latent.space/feed' },
  { source: 'Import AI', url: 'https://jack-clark.net/feed/' },
  { source: 'Ahead of AI', url: 'https://magazine.sebastianraschka.com/feed' },
]

const parser = new Parser({
  customFields: { item: [['content:encoded', 'contentEncoded']] },
})

export async function fetchRss({ source, url, limit = PER_SOURCE_LIMIT }) {
  const response = await get(url, { responseType: 'text' })
  const feed = await parser.parseString(response.data)

  return (feed.items ?? []).slice(0, limit).map((item) => ({
    category: 'news',
    source,
    title: item.title ?? '',
    url: item.link ?? item.guid ?? '',
    summary: clip(item.contentSnippet || item.summary || item.contentEncoded || item.content || ''),
    published_at: toIso(item.isoDate || item.pubDate),
    metadata: {
      feed: feed.title ?? source,
      author: item.creator || item.author || null,
      categories: item.categories?.slice(0, 6) ?? [],
    },
  }))
}
