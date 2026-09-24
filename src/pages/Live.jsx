import { useState } from 'react'
import { ArrowUpRight, RefreshCw } from 'lucide-react'
import { Card, EmptyState, ErrorNote, PageHeader, SkeletonList } from '../components/ui'
import { LIVE_CATEGORIES, useNews } from '../lib/hooks'
import { formatRelative } from '../lib/dates'

export default function Live() {
  const [category, setCategory] = useState('news')
  const { articles, loading, error, refresh } = useNews(category)
  const [refreshing, setRefreshing] = useState(false)

  // The actual fetching happens on a schedule (GitHub Actions, every 30
  // minutes, see worker/README.md) and writes straight to Supabase. This
  // button just re-reads what's already there — there's no on-demand fetch
  // path from the browser, since that would need the service role key.
  async function reload() {
    setRefreshing(true)
    try {
      await refresh()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <button
            onClick={reload}
            disabled={refreshing}
            aria-label="Reload feeds"
            title="Reload feeds"
            className="rounded-xl border border-ink-600 p-2.5 text-ink-300 transition-colors hover:bg-ink-700 hover:text-ink-100 disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        }
      />

      {/* Category filter. Scrolls rather than wraps so the row stays one line. */}
      <nav aria-label="Feed category" className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1">
        {LIVE_CATEGORIES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setCategory(key)}
            aria-current={key === category ? 'true' : undefined}
            className={[
              'shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors',
              key === category
                ? 'bg-accent-soft text-accent'
                : 'text-ink-300 hover:bg-ink-700 hover:text-ink-100',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </nav>

      {error ? <ErrorNote error={error} onRetry={refresh} /> : null}

      {loading ? (
        <SkeletonList rows={8} className="h-16" />
      ) : articles.length ? (
        <Card className="divide-y divide-ink-700">
          {articles.map((item) => (
            <a
              key={item.id}
              href={item.link}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-start gap-3 px-4 py-3.5 transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-ink-700"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[11px] text-ink-400">
                  <span className="font-medium uppercase tracking-wide text-accent">
                    {item.source || item.category}
                  </span>
                  <span className="text-ink-500">·</span>
                  <span>{formatRelative(item.published)}</span>
                </div>
                <p className="mt-1 text-sm leading-snug text-ink-100">{item.title}</p>
                {item.summary ? (
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-400">
                    {item.summary}
                  </p>
                ) : null}
              </div>
              <ArrowUpRight size={14} className="mt-1 shrink-0 text-ink-400" />
            </a>
          ))}
        </Card>
      ) : (
        <EmptyState>
          Nothing here yet. Hit refresh to pull the feeds — the first fetch can take a few seconds.
        </EmptyState>
      )}

      <p className="text-center text-[11px] text-ink-400">
        New items land every 30 minutes · this tab re-checks every 5
      </p>
    </div>
  )
}
