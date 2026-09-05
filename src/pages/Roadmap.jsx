import { useEffect, useState } from 'react'
import { ChevronDown, StickyNote } from 'lucide-react'
import {
  Button,
  Card,
  Checkbox,
  EmptyState,
  ErrorNote,
  Modal,
  ProgressBar,
  Skeleton,
} from '../components/ui'
import EditableList from '../components/EditableList'
import { useToast } from '../components/Toast'
import { useRoadmap } from '../lib/hooks'

export default function Roadmap() {
  const { phases, stats, loading, error, refresh, toggleTask, saveNotes } = useRoadmap()
  const [expanded, setExpanded] = useState(() => new Set())
  const [noteTask, setNoteTask] = useState(null)
  const toast = useToast()

  // Open the current phase once it is known, without fighting later manual toggles.
  const currentId = stats.currentPhase?.id
  useEffect(() => {
    if (currentId) setExpanded((prev) => (prev.size ? prev : new Set([currentId])))
  }, [currentId])

  function togglePhase(id) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function onToggleTask(task) {
    try {
      await toggleTask(task)
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    )
  }

  if (error) return <ErrorNote error={error} onRetry={refresh} />
  if (!phases.length) return <EmptyState>No phases yet.</EmptyState>

  return (
    <div className="space-y-6">
      <section className="flex items-center gap-4">
        <div className="flex-1">
          <p className="font-display text-sm font-semibold text-ink-50">
            {stats.done} of {stats.total} tasks
          </p>
          <ProgressBar value={stats.ratio} className="mt-2" />
        </div>
        <span className="font-display text-2xl font-semibold text-accent">
          {Math.round(stats.ratio * 100)}%
        </span>
      </section>

      <div className="space-y-3">
        <EditableList
          items={phases}
          table="phases"
          labelField="name"
          onMutate={refresh}
          addLabel="Add phase"
          deleteMessage={(phase) =>
            `Phase "${phase.name}" and all of its task groups will be removed. This cannot be undone.`
          }
          renderItem={(phase) => {
          const stat = stats.perPhase[phase.id] ?? { done: 0, total: 0, ratio: 0 }
          const isOpen = expanded.has(phase.id)
          const isCurrent = phase.id === currentId

          return (
            <Card key={phase.id} className={isCurrent ? 'border-accent-line' : ''}>
              <button
                onClick={() => togglePhase(phase.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
              >
                <span
                  className={[
                    'rounded-lg px-2 py-1 font-display text-xs font-semibold',
                    stat.ratio === 1
                      ? 'bg-ink-600 text-ink-300'
                      : isCurrent
                        ? 'bg-accent-soft text-accent'
                        : 'bg-ink-700 text-ink-200',
                  ].join(' ')}
                >
                  {phase.code}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-[15px] font-semibold text-ink-50">
                    {phase.name} {phase.tag}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-400">
                    {phase.weeks} · {stat.done}/{stat.total}
                  </span>
                </span>

                <ChevronDown
                  size={16}
                  className={`shrink-0 text-ink-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>

              <div className="px-4 pb-3.5">
                <ProgressBar value={stat.ratio} />
              </div>

              {isOpen ? (
                <div className="fade-in border-t border-ink-700">
                  <EditableList
                    items={phase.task_groups}
                    table="task_groups"
                    labelField="title"
                    newRow={{ phase_id: phase.id }}
                    onMutate={refresh}
                    addLabel="Add group"
                    deleteMessage={(group) =>
                      `Group "${group.title}" and its ${group.tasks.length} tasks will be removed. This cannot be undone.`
                    }
                    renderItem={(group) => (
                      <div key={group.id} className="border-b border-ink-700 last:border-b-0">
                        <p className="px-4 pb-1.5 pt-3.5 font-display text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                          {group.title}
                        </p>
                        <EditableList
                          items={group.tasks}
                          table="tasks"
                          labelField="title"
                          newRow={{ group_id: group.id }}
                          onMutate={refresh}
                          addLabel="Add task"
                          itemClassName="px-2"
                          renderItem={(task) => (
                            <div key={task.id} className="flex items-start gap-2 px-4 py-2.5">
                              <Checkbox
                                checked={task.done}
                                onChange={() => onToggleTask(task)}
                                label={task.title}
                                sublabel={task.notes ? task.notes.split('\n')[0] : null}
                              />
                              <button
                                onClick={() => setNoteTask(task)}
                                aria-label={`Notes for ${task.title}`}
                                className={[
                                  'mt-0.5 shrink-0 rounded-lg p-1.5 transition-colors hover:bg-ink-700',
                                  task.notes ? 'text-accent' : 'text-ink-500 hover:text-ink-200',
                                ].join(' ')}
                              >
                                <StickyNote size={14} />
                              </button>
                            </div>
                          )}
                        />
                      </div>
                    )}
                  />
                </div>
              ) : null}
            </Card>
          )
          }}
        />
      </div>

      <NotesModal
        task={noteTask}
        onClose={() => setNoteTask(null)}
        onSave={async (notes) => {
          try {
            await saveNotes(noteTask.id, notes)
            toast('Notes saved')
            setNoteTask(null)
          } catch (err) {
            toast(err.message, 'error')
          }
        }}
      />
    </div>
  )
}

function NotesModal({ task, onClose, onSave }) {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setValue(task?.notes ?? '')
  }, [task])

  async function handleSave() {
    setBusy(true)
    await onSave(value)
    setBusy(false)
  }

  return (
    <Modal
      open={Boolean(task)}
      onClose={onClose}
      title={task?.title ?? ''}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={7}
        autoFocus
        placeholder="Notes, links, blockers…"
        className="w-full resize-none rounded-xl border border-ink-500 bg-ink-900 px-3.5 py-3 text-sm leading-relaxed text-ink-100 placeholder:text-ink-500 focus:border-accent focus:outline-none"
      />
    </Modal>
  )
}
