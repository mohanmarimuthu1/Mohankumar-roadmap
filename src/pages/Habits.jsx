import { Flame, ShieldCheck } from 'lucide-react'
import {
  Card,
  Checkbox,
  EmptyState,
  ErrorNote,
  PageHeader,
  ProgressBar,
  SectionTitle,
  SkeletonList,
} from '../components/ui'
import EditableList from '../components/EditableList'
import { useToast } from '../components/Toast'
import { useEditMode, useHabits } from '../lib/hooks'
import { currentWeekDays, todayKey } from '../lib/dates'

const SECTIONS = [
  { key: 'daily', title: 'Daily', note: 'Resets every day' },
  { key: 'weekly', title: 'Weekly', note: 'Resets Monday' },
  { key: 'monthly', title: 'Monthly', note: 'Resets on the 1st' },
]

export default function Habits() {
  const habits = useHabits()
  const [editMode] = useEditMode()
  const toast = useToast()

  async function onToggle(habit) {
    try {
      await habits.toggleHabit(habit)
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  if (habits.error) {
    return (
      <div className="space-y-8">
        <PageHeader />
        <ErrorNote error={habits.error} onRetry={habits.refresh} />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader />

      <StreakStrip habits={habits} />

      {SECTIONS.map(({ key, title, note }) => {
        const list = habits.byCadence[key]
        const done = list.filter((h) => habits.isDone(h)).length

        return (
          <section key={key}>
            <SectionTitle
              action={
                <span className="font-display text-xs text-ink-300">
                  {done}/{list.length}
                </span>
              }
            >
              {title}
            </SectionTitle>

            {habits.loading ? (
              <SkeletonList rows={4} className="h-11" />
            ) : list.length || editMode ? (
              <Card>
                <EditableList
                  items={list}
                  table="habits"
                  labelField="label"
                  newRow={{ type: key }}
                  onMutate={habits.refresh}
                  addLabel={`Add ${title.toLowerCase()} habit`}
                  itemClassName="px-2"
                  renderItem={(habit) => (
                    <div key={habit.id} className="border-b border-ink-700 px-4 py-3 last:border-b-0">
                      <Checkbox
                        checked={habits.isDone(habit)}
                        onChange={() => onToggle(habit)}
                        label={habit.label}
                      />
                    </div>
                  )}
                />
                <div className="border-t border-ink-700 px-4 py-2.5">
                  <p className="text-[11px] text-ink-400">{note}</p>
                </div>
              </Card>
            ) : (
              <EmptyState>No {title.toLowerCase()} habits yet.</EmptyState>
            )}
          </section>
        )
      })}

      {/* ------------------------------------------------------------ rules */}
      <section>
        <SectionTitle>Rules</SectionTitle>
        {habits.loading ? (
          <SkeletonList rows={5} className="h-9" />
        ) : habits.rules.length || editMode ? (
          <Card className="py-2">
            <EditableList
              items={habits.rules}
              table="rules"
              labelField="text"
              onMutate={habits.refresh}
              addLabel="Add rule"
              itemClassName="px-2"
              renderItem={(rule) => (
                <div key={rule.id} className="flex items-start gap-2.5 px-4 py-2">
                  <ShieldCheck size={14} className="mt-0.5 shrink-0 text-accent" />
                  <span className="text-sm leading-snug text-ink-200">{rule.text}</span>
                </div>
              )}
            />
          </Card>
        ) : (
          <EmptyState>No rules yet.</EmptyState>
        )}
      </section>
    </div>
  )
}

/** Week-at-a-glance for the daily habits, plus the streak. */
function StreakStrip({ habits }) {
  const week = currentWeekDays()
  const today = todayKey()
  const dailyCount = habits.byCadence.daily.length

  const completion = (date) => {
    if (!dailyCount) return 0
    const doneCount = habits.byCadence.daily.filter((h) =>
      habits.isDone(h, new Date(`${date}T12:00:00`))
    ).length
    return doneCount / dailyCount
  }

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <Flame size={16} className={habits.streak > 0 ? 'text-accent' : 'text-ink-400'} />
        <span className="font-display text-lg font-semibold text-ink-50">{habits.streak}</span>
        <span className="text-sm text-ink-300">day streak</span>
        <span className="ml-auto text-xs text-ink-400">
          {habits.dailyProgress.done}/{habits.dailyProgress.total} today
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {week.map(({ label, date }) => {
          const ratio = completion(date)
          const isToday = date === today
          const isFuture = date > today

          return (
            <div key={date} className="flex flex-col items-center gap-1.5">
              <span
                className={`text-[10px] uppercase tracking-wide ${isToday ? 'text-accent' : 'text-ink-400'}`}
              >
                {label}
              </span>
              <div
                className={[
                  'flex h-8 w-full items-center justify-center rounded-lg border text-[11px] font-medium',
                  isFuture
                    ? 'border-ink-600 text-ink-500'
                    : ratio === 1
                      ? 'border-accent bg-accent text-on-accent'
                      : ratio > 0
                        ? 'border-accent-line bg-accent-soft text-accent'
                        : 'border-ink-600 bg-ink-700/60 text-ink-400',
                ].join(' ')}
                title={`${Math.round(ratio * 100)}% of daily habits`}
              >
                {isFuture ? '·' : `${Math.round(ratio * 100)}`}
              </div>
            </div>
          )
        })}
      </div>

      <ProgressBar value={habits.dailyProgress.ratio} className="mt-4" />
    </Card>
  )
}
