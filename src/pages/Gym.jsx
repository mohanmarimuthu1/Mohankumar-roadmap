import { useEffect, useState } from 'react'
import { ChevronDown, Dumbbell, History, Pencil, Timer } from 'lucide-react'
import {
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Modal,
  PageHeader,
  SectionTitle,
  Skeleton,
} from '../components/ui'
import EditableList from '../components/EditableList'
import { useToast } from '../components/Toast'
import { useEditMode, useGym } from '../lib/hooks'
import { supabase } from '../lib/supabase'
import { currentWeekDays, formatRelative, todayKey } from '../lib/dates'

export default function Gym() {
  const gym = useGym()
  const [editMode] = useEditMode()
  const [openDay, setOpenDay] = useState(null)
  const [activeExercise, setActiveExercise] = useState(null)
  const [editingDay, setEditingDay] = useState(null)
  const [editingExercise, setEditingExercise] = useState(null)
  const today = todayKey()

  useEffect(() => {
    if (!openDay && gym.days.length) setOpenDay(gym.days[0].id)
  }, [gym.days, openDay])

  if (gym.loading) {
    return (
      <div className="space-y-8">
        <PageHeader />
        <div className="space-y-3">
          <Skeleton className="h-28" />
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    )
  }

  if (gym.error || !gym.days.length) {
    return (
      <div className="space-y-8">
        <PageHeader />
        {gym.error ? (
          <ErrorNote error={gym.error} onRetry={gym.refresh} />
        ) : (
          <EmptyState>No training days yet.</EmptyState>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader />

      <WeekView gym={gym} />

      <section className="space-y-3">
        <SectionTitle>Split</SectionTitle>

        <EditableList
          items={gym.days}
          table="gym_days"
          labelField="name"
          renameInline={false}
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
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setOpenDay(isOpen ? null : day.id)}
                  aria-expanded={isOpen}
                  className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5 text-left"
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

                {editMode ? (
                  <button
                    onClick={() => setEditingDay(day)}
                    aria-label={`Edit ${day.name}`}
                    className="shrink-0 rounded-lg p-2 text-ink-400 transition-colors hover:bg-ink-700 hover:text-ink-100"
                  >
                    <Pencil size={14} />
                  </button>
                ) : null}
              </div>

              {isOpen ? (
                <div className="fade-in border-t border-ink-700">
                  <EditableList
                    items={day.exercises}
                    table="exercises"
                    labelField="name"
                    renameInline={false}
                    newRow={{ day_id: day.id, sets: 3, reps: '8-12', rest_seconds: 60 }}
                    onMutate={gym.refresh}
                    addLabel="Add exercise"
                    itemClassName="px-2"
                    renderItem={(exercise) => (
                      <ExerciseRow
                        key={exercise.id}
                        exercise={exercise}
                        gym={gym}
                        editMode={editMode}
                        onOpen={() => setActiveExercise(exercise)}
                        onEdit={() => setEditingExercise(exercise)}
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

      <DayModal
        day={editingDay}
        onClose={() => setEditingDay(null)}
        onSaved={gym.refresh}
      />

      <ExerciseModal
        exercise={editingExercise}
        onClose={() => setEditingExercise(null)}
        onSaved={gym.refresh}
      />
    </div>
  )
}

function ExerciseRow({ exercise, gym, editMode, onOpen, onEdit }) {
  const todaySets = gym.setsFor(exercise.id)
  const last = gym.lastSessionFor(exercise.id)

  return (
    <div className="flex items-start gap-1 border-b border-ink-700 last:border-b-0">
      <button onClick={onOpen} className="w-full min-w-0 flex-1 px-4 py-3 text-left transition-colors hover:bg-ink-700">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink-100">{exercise.name}</p>
            <p className="mt-0.5 text-xs text-ink-400">
              {exercise.sets} × {exercise.reps}
              <span className="mx-1.5 text-ink-500">|</span>
              <Timer size={11} className="mb-0.5 mr-1 inline" />
              {exercise.rest_seconds}s
            </p>
            {exercise.notes ? (
              <p className="mt-1 text-xs leading-snug text-ink-400">{exercise.notes}</p>
            ) : null}
          </div>

          <div className="shrink-0 text-right">
            {todaySets.length ? (
              <span className="rounded-lg bg-accent-soft px-2 py-1 font-display text-[11px] font-semibold text-accent">
                {todaySets.length}/{exercise.sets} today
              </span>
            ) : null}
            {last ? (
              <p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-ink-400">
                <History size={10} />
                {summariseSets(last.sets)}
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-ink-400">no history</p>
            )}
          </div>
        </div>
      </button>

      {editMode ? (
        <button
          onClick={onEdit}
          aria-label={`Edit ${exercise.name}`}
          className="mt-3 shrink-0 rounded-lg p-2 text-ink-400 transition-colors hover:bg-ink-700 hover:text-ink-100"
        >
          <Pencil size={14} />
        </button>
      ) : null}
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
            <span className="mx-1.5 text-ink-500">|</span>
            last {formatRelative(`${last.date}T12:00:00`)}
          </>
        ) : null}
      </p>

      <div className="space-y-2">
        <div className="grid grid-cols-[2rem_1fr_1fr] gap-2 px-1 text-[10px] uppercase tracking-wide text-ink-400">
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
              className="w-full rounded-lg border border-ink-500 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-400 focus:border-accent focus:outline-none"
            />
            <input
              type="number"
              inputMode="numeric"
              value={row.repsCompleted}
              placeholder={row.placeholderReps === '' ? '—' : String(row.placeholderReps)}
              onChange={(e) => update(row.setNumber, 'repsCompleted', e.target.value)}
              className="w-full rounded-lg border border-ink-500 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-400 focus:border-accent focus:outline-none"
            />
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] text-ink-400">
        Greyed numbers are last session — beat them. Clear a row to delete that set.
      </p>
    </Modal>
  )
}

function DayModal({ day, onClose, onSaved }) {
  const open = Boolean(day)
  const [form, setForm] = useState({ name: '', focus: '' })
  const [initialised, setInitialised] = useState(false)
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  if (open && !initialised) {
    setForm({ name: day.name ?? '', focus: day.focus ?? '' })
    setInitialised(true)
  }
  if (!open && initialised) setInitialised(false)

  async function save() {
    setBusy(true)
    try {
      const { error } = await supabase
        .from('gym_days')
        .update({ name: form.name.trim(), focus: form.focus.trim() })
        .eq('id', day.id)
      if (error) throw new Error(error.message)
      toast('Training day updated')
      onClose()
      await onSaved?.()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title="Edit training day"
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} disabled={busy || !form.name.trim()}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Name" value={form.name} onChange={(name) => setForm((f) => ({ ...f, name }))} />
        <Field
          label="Focus"
          value={form.focus}
          onChange={(focus) => setForm((f) => ({ ...f, focus }))}
          placeholder="Chest, shoulders, triceps"
        />
      </div>
    </Modal>
  )
}

function ExerciseModal({ exercise, onClose, onSaved }) {
  const open = Boolean(exercise)
  const [form, setForm] = useState({ name: '', sets: '', reps: '', rest_seconds: '', notes: '' })
  const [initialised, setInitialised] = useState(false)
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  if (open && !initialised) {
    setForm({
      name: exercise.name ?? '',
      sets: exercise.sets ?? '',
      reps: exercise.reps ?? '',
      rest_seconds: exercise.rest_seconds ?? '',
      notes: exercise.notes ?? '',
    })
    setInitialised(true)
  }
  if (!open && initialised) setInitialised(false)

  async function save() {
    setBusy(true)
    try {
      const { error } = await supabase
        .from('exercises')
        .update({
          name: form.name.trim(),
          sets: form.sets === '' ? null : Number(form.sets),
          reps: form.reps.trim(),
          rest_seconds: form.rest_seconds === '' ? null : Number(form.rest_seconds),
          notes: form.notes.trim() || null,
        })
        .eq('id', exercise.id)
      if (error) throw new Error(error.message)
      toast('Exercise updated')
      onClose()
      await onSaved?.()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title="Edit exercise"
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} disabled={busy || !form.name.trim()}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Name" value={form.name} onChange={(name) => setForm((f) => ({ ...f, name }))} />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Sets"
            type="number"
            value={form.sets}
            onChange={(sets) => setForm((f) => ({ ...f, sets }))}
          />
          <Field
            label="Reps"
            value={form.reps}
            onChange={(reps) => setForm((f) => ({ ...f, reps }))}
            placeholder="8-12"
          />
        </div>
        <Field
          label="Rest (seconds)"
          type="number"
          value={form.rest_seconds}
          onChange={(rest_seconds) => setForm((f) => ({ ...f, rest_seconds }))}
        />
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-300">Form notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={3}
            placeholder="Grip width, cues, whatever you need to remember"
            className="w-full resize-none rounded-xl border border-ink-500 bg-ink-900 px-3.5 py-2.5 text-sm leading-relaxed text-ink-100 placeholder:text-ink-400 focus:border-accent focus:outline-none"
          />
        </div>
      </div>
    </Modal>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-ink-300">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-ink-500 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-400 focus:border-accent focus:outline-none"
      />
    </div>
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
                className={`text-[10px] uppercase tracking-wide ${isToday ? 'text-accent' : 'text-ink-400'}`}
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
                      ? 'border-ink-600 text-ink-500'
                      : 'border-ink-600 bg-ink-700/60 text-ink-400',
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
