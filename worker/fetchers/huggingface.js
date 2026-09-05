// Most-downloaded text-generation models on the Hub -> category "models".
//
// The Hub returns the repo id ("meta-llama/Llama-3.1-8B") rather than a
// display name, which is what people recognise anyway, so it doubles as the
// title. Download counts live in metadata.

import { get, toIso, PER_SOURCE_LIMIT } from '../util.js'

const ENDPOINT = 'https://huggingface.co/api/models'
const SOURCE = 'Hugging Face'

export async function fetchHuggingFace({ limit = PER_SOURCE_LIMIT } = {}) {
  const { data } = await get(ENDPOINT, {
    params: {
      sort: 'downloads',
      direction: -1,
      limit,
      filter: 'text-generation',
    },
  })

  const models = Array.isArray(data) ? data : []

  return models.map((model) => {
    const downloads = model.downloads ?? 0

    return {
      category: 'models',
      source: SOURCE,
      title: model.id ?? model.modelId ?? '',
      url: `https://huggingface.co/${model.id ?? model.modelId ?? ''}`,
      summary: [
        `${downloads.toLocaleString('en-US')} downloads`,
        model.likes ? `${model.likes.toLocaleString('en-US')} likes` : null,
        model.pipeline_tag ?? null,
      ]
        .filter(Boolean)
        .join(' | '),
      // Sorting is by downloads, so lastModified is the only date that moves;
      // it is what keeps a freshly-trending model near the top of the tab.
      published_at: toIso(model.lastModified || model.createdAt),
      metadata: {
        downloads,
        likes: model.likes ?? 0,
        pipeline_tag: model.pipeline_tag ?? null,
        library: model.library_name ?? null,
        tags: model.tags?.slice(0, 8) ?? [],
      },
    }
  })
}
