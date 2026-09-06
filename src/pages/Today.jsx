import { Link } from 'react-router-dom'
import { ArrowUpRight, ChevronRight, Radio } from 'lucide-react'
import Ring from '../components/Ring'
import {
  Card,
  Checkbox,
  EmptyState,
  ErrorNote,
  Metric,
  PageHeader,
  ProgressBar,
  SectionTitle,
  Skeleton,
  SkeletonList,
} from '../components/ui'
import { useToast } from '../components/Toast'
import { useHabits, useRoadmap, useTopNews } from '../lib/hooks'
import { formatLongDate, formatRelative } from '../lib/dates'

export default function Today() {
  const roadmap = useRoadmap()
  const habits = useHabits()
  const news = useTopNews(5)
  const toast = useToast()

  async function onToggleHabit(habit) {
    try {
      await habits.toggleHabit(habit)
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const phase = roadmap.stats.currentPhase
  const phaseStat = phase ? roadmap.stats.perPhase[phase.id] : null
  const daily = habits.dailyProgress
  const dayComplete = daily.total > 0 && daily.done === daily.total

  return (
    <div className="space-y-8">
      <PageHeader title={dayComplete ? 'Day complete' : 'Today'} description={formatLongDate()} />

      {/* --------------------------------------------------------- overview */}
      <Card className="flex items-center gap-5 p-5">
        {roadmap.loading ? (
          <Skeleton className="h-24 w-24 shrink-0 rounded-full" />
        ) : (
          <Ring value={roadmap.stats.ratio} size={96} sublabel="complete" />
        )}

        <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
          <Metric
            value={
              <span className={habits.streak > 0 ? 'text-accent' : undefined}>
                {habits.loading ? '—' : habits.streak}
              </span>
            }
            label={`day${habits.streak === 1 ? '' : 's'} streak`}
          />
          <Metric value={`${daily.done}/${daily.total}`} label="habits today" />
          <Metric value={`${roadmap.stats.done}/${roadmap.stats.total}`} label="roadmap tasks" />
        </div>
      </Card>

      {/* ---------------------------------------------------- current phase */}
      <section>
        <SectionTitle>Current phase</SectionTitle>
        {roadmap.loading ? (
          <Skeleton className="h-24" />
        ) : phase ? (
          <Link to="/roadmap" className="block">
            <Card className="p-4 transition-colors hover:border-ink-500">
              <div className="flex items-start gap-3">
                <span className="rounded-lg bg-accent-soft px-2 py-1 font-display text-xs font-semibold text-accent">
                  {phase.code}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-base font-semibold text-ink-50">
                    {phase.name} {phase.tag}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-400">{phase.weeks}</p>
                </div>
                <ChevronRight size={16} className="mt-1 shrink-0 text-ink-400" />
              </div>
              <div className="mt-3.5 flex items-center gap-3">
                <ProgressBar value={phaseStat?.ratio ?? 0} />
                <span className="shrink-0 font-display text-xs text-ink-300">
                  {phaseStat?.done ?? 0}/{phaseStat?.total ?? 0}
                </span>
              </div>
            </Card>
          </Link>
        ) : (
          <EmptyState>No phases yet.</EmptyState>
        )}
      </section>

      {/* ---------------------------------------------------- daily habits */}
      <section>
        <SectionTitle
          action={
            <span className="font-display text-xs text-ink-300">
              {daily.done}/{daily.total}
            </span>
          }
        >
          Daily habits
        </SectionTitle>

        {habits.error ? <ErrorNote error={habits.error} onRetry={habits.refresh} /> : null}

        {habits.loading ? (
          <SkeletonList rows={5} className="h-11" />
        ) : habits.byCadence.daily.length ? (
          <Card className="divide-y divide-ink-700">
            {habits.byCadence.daily.map((habit) => (
              <div key={habit.id} className="px-4 py-3">
                <Checkbox
                  checked={habits.isDone(habit)}
                  onChange={() => onToggleHabit(habit)}
                  label={habit.label}
                />
              </div>
            ))}
          </Card>
        ) : (
          <EmptyState>No daily habits yet.</EmptyState>
        )}
      </section>

      {/* ------------------------------------------------------- today in AI */}
      <section>
        <SectionTitle
          action={
            <Link to="/live" className="text-xs font-medium text-accent hover:underline">
              All feeds
            </Link>
          }
        >
          Today in AI
        </SectionTitle>

        {news.loading ? (
          <SkeletonList rows={3} className="h-14" />
        ) : news.data?.length ? (
          <Card className="divide-y divide-ink-700">
            {news.data.map((item) => (
              <a
                key={item.id}
                href={item.link}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-start gap-3 px-4 py-3 transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-ink-700"
              >
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm leading-snug text-ink-100">{item.title}</p>
                  <p className="mt-1 text-xs text-ink-400">
                    {item.source || item.category} · {formatRelative(item.published)}
                  </p>
                </div>
                <ArrowUpRight size={14} className="mt-0.5 shrink-0 text-ink-400" />
              </a>
            ))}
          </Card>
        ) : (
          <Card className="flex items-center gap-3 px-4 py-5">
            <Radio size={16} className="shrink-0 text-ink-400" />
            <p className="text-sm leading-relaxed text-ink-300">
              No articles yet — hit refresh on the{' '}
              <Link to="/live" className="text-accent hover:underline">
                Live
              </Link>{' '}
              tab to pull the feeds.
            </p>
          </Card>
        )}
      </section>

      {/* ------------------------------------------------------ this week */}
      <section>
        <SectionTitle
          action={
            <span className="font-display text-xs text-ink-300">
              {habits.byCadence.weekly.filter((h) => habits.isDone(h)).length}/
              {habits.byCadence.weekly.length}
            </span>
          }
        >
          This week
        </SectionTitle>

        {habits.loading ? (
          <SkeletonList rows={4} className="h-11" />
        ) : habits.byCadence.weekly.length ? (
          <Card className="divide-y divide-ink-700">
            {habits.byCadence.weekly.map((habit) => (
              <div key={habit.id} className="px-4 py-3">
                <Checkbox
                  checked={habits.isDone(habit)}
                  onChange={() => onToggleHabit(habit)}
                  label={habit.label}
                />
              </div>
            ))}
          </Card>
        ) : (
          <EmptyState>No weekly habits yet.</EmptyState>
        )}
      </section>
    </div>
  )
}
