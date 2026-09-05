import { useEffect, useState } from 'react'
import { ChevronDown, Dumbbell, History, Timer } from 'lucide-react'
import { Button, Card, EmptyState, ErrorNote, Modal, SectionTitle, Skeleton } from '../components/ui'
import EditableList from '../components/EditableList'
import { useToast } from '../components/Toast'
import { useGym } from '../lib/hooks'
import { currentWeekDays, formatRelative, todayKey } from '../lib/dates'

export default function Gym() {
  const gym = useGym()
  const [openDay, setOpenDay] = useState(null)
  const [activeExercise, setActiveExercise] = useState(null)
  const today = todayKey()

  useEffect(() => {
    if (!openDay && gym.days.length) setOpenDay(gym.days[0].id)
  }, [gym.days, openDay])

  if (gym.error) return <ErrorNote error={gym.error} onRetry={gym.refresh} />

  if (gym.loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24" />
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    )
  }

  if (!gym.days.length) return <EmptyState>No training days yet.</EmptyState>

  return (
    <div className="space-y-6">
      <WeekView gym={gym} />

      <section className="space-y-3">
        <SectionTitle>Split</SectionTitle>

        <EditableList
          items={gym.days}
          table="gym_days"
          labelField="name"
          onMutate={gym.refresh}
          addLabel="Add training day"
          deleteMessage={(day) =>
            `"${day.name}" and its ${day.exercises.length} exercises will be removed. This cannot be undone.`
          }
          renderItem={(day) => {
          const isOpen = openDay === day.id
          const doneToday = (gym.trainedDays.get(today) ?? new Set()).has(day.id)

          return (
            <Card key={day.id} className={doneToday ? 'border-accent-line' : ''}>
              <button
                onClick={() => setOpenDay(isOpen ? null : day.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
              >
                <Dumbbell size={16} className={doneToday ? 'text-accent' : 'text-ink-400'} />
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-[15px] font-semibold text-ink-50">
                    {day.name}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-ink-400">
                    {day.focus} · {day.exercises.length} exercises
                  </span>
                </span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-ink-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isOpen ? (
                <div className="fade-in border-t border-ink-700">
                  <EditableList
                    items={day.exercises}
                    table="exercises"
                    labelField="name"
                    newRow={{ day_id: day.id, sets: 3, reps: '8-12', rest_seconds: 60 }}
                    onMutate={gym.refresh}
                    addLabel="Add exercise"
                    itemClassName="px-2"
                    renderItem={(exercise) => (
                      <ExerciseRow
                        key={exercise.id}
                        exercise={exercise}
                        gym={gym}
                        onOpen={() => setActiveExercise(exercise)}
                      />
                    )}
                  />
                </div>
              ) : null}
            </Card>
          )
          }}
        />
      </section>

      <LogModal
        exercise={activeExercise}
        gym={gym}
        onClose={() => setActiveExercise(null)}
      />
    </div>
  )
}

function ExerciseRow({ exercise, gym, onOpen }) {
  const todaySets = gym.setsFor(exercise.id)
  const last = gym.lastSessionFor(exercise.id)

  return (
    <div className="border-b border-ink-700 last:border-b-0">
      <button onClick={onOpen} className="w-full px-4 py-3 text-left transition-colors hover:bg-ink-700/40">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink-100">{exercise.name}</p>
            <p className="mt-0.5 text-xs text-ink-400">
              {exercise.sets} × {exercise.reps}
              <span className="mx-1.5 text-ink-600">|</span>
              <Timer size={11} className="mb-0.5 mr-1 inline" />
              {exercise.rest_seconds}s
            </p>
            {exercise.notes ? (
              <p className="mt-1 text-xs leading-snug text-ink-500">{exercise.notes}</p>
            ) : null}
          </div>

          <div className="shrink-0 text-right">
            {todaySets.length ? (
              <span className="rounded-lg bg-accent-soft px-2 py-1 font-display text-[11px] font-semibold text-accent">
                {todaySets.length}/{exercise.sets} today
              </span>
            ) : null}
            {last ? (
              <p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-ink-500">
                <History size={10} />
                {summariseSets(last.sets)}
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-ink-600">no history</p>
            )}
          </div>
        </div>
      </button>
    </div>
  )
}

function summariseSets(sets) {
  const weights = sets.map((s) => s.weight_kg).filter((w) => w !== null && w !== undefined)
  if (!weights.length) return `${sets.length} sets`
  const top = Math.max(...weights)
  return `${top}kg × ${sets.length}`
}

function LogModal({ exercise, gym, onClose }) {
  const [rows, setRows] = useState([])
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  const last = exercise ? gym.lastSessionFor(exercise.id) : null

  useEffect(() => {
    if (!exercise) return
    const logged = gym.setsFor(exercise.id)
    const count = Math.max(exercise.sets, logged.length)
    setRows(
      Array.from({ length: count }, (_, i) => {
        const existing = logged.find((l) => l.set_number === i + 1)
        const previous = last?.sets.find((l) => l.set_number === i + 1)
        return {
          setNumber: i + 1,
          weightKg: existing?.weight_kg ?? '',
          repsCompleted: existing?.reps_completed ?? '',
          placeholderWeight: previous?.weight_kg ?? '',
          placeholderReps: previous?.reps_completed ?? '',
          saved: Boolean(existing),
        }
      })
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise])

  function update(setNumber, field, value) {
    setRows((current) =>
      current.map((r) => (r.setNumber === setNumber ? { ...r, [field]: value } : r))
    )
  }

  async function save() {
    setBusy(true)
    try {
      for (const row of rows) {
        const filled = row.weightKg !== '' || row.repsCompleted !== ''
        if (filled) {
          await gym.logSet({
            exerciseId: exercise.id,
            setNumber: row.setNumber,
            weightKg: row.weightKg,
            repsCompleted: row.repsCompleted,
          })
        } else if (row.saved) {
          await gym.clearSet({ exerciseId: exercise.id, setNumber: row.setNumber })
        }
      }
      toast('Session logged')
      onClose()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={Boolean(exercise)}
      onClose={busy ? undefined : onClose}
      title={exercise?.name ?? ''}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-xs text-ink-400">
        Target {exercise?.sets} × {exercise?.reps} · rest {exercise?.rest_seconds}s
        {last ? (
          <>
            <span className="mx-1.5 text-ink-600">|</span>
            last {formatRelative(`${last.date}T12:00:00`)}
          </>
        ) : null}
      </p>

      <div className="space-y-2">
        <div className="grid grid-cols-[2rem_1fr_1fr] gap-2 px-1 text-[10px] uppercase tracking-wide text-ink-500">
          <span>Set</span>
          <span>Weight (kg)</span>
          <span>Reps</span>
        </div>

        {rows.map((row) => (
          <div key={row.setNumber} className="grid grid-cols-[2rem_1fr_1fr] items-center gap-2">
            <span className="text-center font-display text-xs text-ink-400">{row.setNumber}</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              value={row.weightKg}
              placeholder={row.placeholderWeight === '' ? '—' : String(row.placeholderWeight)}
              onChange={(e) => update(row.setNumber, 'weightKg', e.target.value)}
              className="w-full rounded-lg border border-ink-500 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 focus:border-accent focus:outline-none"
            />
            <input
              type="number"
              inputMode="numeric"
              value={row.repsCompleted}
              placeholder={row.placeholderReps === '' ? '—' : String(row.placeholderReps)}
              onChange={(e) => update(row.setNumber, 'repsCompleted', e.target.value)}
              className="w-full rounded-lg border border-ink-500 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 focus:border-accent focus:outline-none"
            />
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] text-ink-500">
        Greyed numbers are last session — beat them. Clear a row to delete that set.
      </p>
    </Modal>
  )
}

function WeekView({ gym }) {
  const week = currentWeekDays()
  const today = todayKey()
  const dayName = (id) => gym.days.find((d) => d.id === id)?.name

  return (
    <Card className="p-4">
      <SectionTitle>This week</SectionTitle>
      <div className="grid grid-cols-7 gap-1.5">
        {week.map(({ label, date }) => {
          const trained = [...(gym.trainedDays.get(date) ?? new Set())].map(dayName).filter(Boolean)
          const isToday = date === today

          return (
            <div key={date} className="flex flex-col items-center gap-1.5">
              <span
                className={`text-[10px] uppercase tracking-wide ${isToday ? 'text-accent' : 'text-ink-500'}`}
              >
                {label}
              </span>
              <div
                title={trained.join(', ')}
                className={[
                  'flex h-11 w-full flex-col items-center justify-center rounded-lg border px-0.5 text-[9px] font-medium leading-tight',
                  trained.length
                    ? 'border-accent-line bg-accent-soft text-accent'
                    : date > today
                      ? 'border-ink-600 text-ink-600'
                      : 'border-ink-600 text-ink-500',
                ].join(' ')}
              >
                {trained.length ? (
                  trained.slice(0, 2).map((name) => <span key={name}>{name}</span>)
                ) : (
                  <span>·</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
