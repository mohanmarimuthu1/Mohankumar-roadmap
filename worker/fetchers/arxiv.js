// Newest cs.CL / cs.LG submissions -> category "papers".
//
// The arXiv API answers with Atom, but not the kind rss-parser is happy with:
// authors are repeated elements and the abstract lives in <summary>. A small
// hand-rolled reader over <entry> blocks keeps every field we want.

import { get, stripHtml, clip, toIso, PER_SOURCE_LIMIT } from '../util.js'

const SOURCE = 'arXiv'

// Built as a literal string: arXiv's parser treats "+" as the term separator,
// and letting a query serialiser re-encode it tends to break the OR.
function endpoint(limit) {
  return (
    'http://export.arxiv.org/api/query' +
    '?search_query=cat:cs.CL+OR+cat:cs.LG' +
    '&sortBy=submittedDate&sortOrder=descending' +
    `&max_results=${limit}`
  )
}

function tag(block, name) {
  const match = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))
  return match ? stripHtml(match[1]) : ''
}

function attrs(block, name) {
  return [...block.matchAll(new RegExp(`<${name}\\b([^>]*)/?>`, 'gi'))].map((match) => match[1])
}

function attr(fragment, name) {
  return fragment.match(new RegExp(`${name}=["']([^"']+)["']`, 'i'))?.[1] ?? null
}

export async function fetchArxiv({ limit = PER_SOURCE_LIMIT } = {}) {
  const { data } = await get(endpoint(limit), { responseType: 'text' })
  const xml = String(data)
  const entries = xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? []

  return entries.slice(0, limit).map((entry) => {
    const links = attrs(entry, 'link')
    const abstractPage = links.find((link) => attr(link, 'type') === 'text/html')
    const pdf = links.find((link) => attr(link, 'title') === 'pdf')

    const authors = [...entry.matchAll(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/gi)]
      .map((match) => stripHtml(match[1]))
      .filter(Boolean)

    const categories = attrs(entry, 'category')
      .map((fragment) => attr(fragment, 'term'))
      .filter(Boolean)

    return {
      category: 'papers',
      source: SOURCE,
      title: tag(entry, 'title'),
      url: (abstractPage && attr(abstractPage, 'href')) || tag(entry, 'id'),
      summary: clip(tag(entry, 'summary')),
      published_at: toIso(tag(entry, 'published') || tag(entry, 'updated')),
      metadata: {
        authors: authors.slice(0, 12),
        author_count: authors.length,
        categories: categories.slice(0, 8),
        pdf_url: pdf ? attr(pdf, 'href') : null,
        comment: tag(entry, 'arxiv:comment') || null,
      },
    }
  })
}
