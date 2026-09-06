import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import Ring from '../components/Ring'
import {
  Card,
  Checkbox,
  EmptyState,
  ErrorNote,
  PageHeader,
  ProgressBar,
  SectionTitle,
  Skeleton,
} from '../components/ui'
import EditableList from '../components/EditableList'
import { useToast } from '../components/Toast'
import { useEditMode, useNeu } from '../lib/hooks'

export default function NEU() {
  const { sections, toggleItem, loading, error, refresh } = useNeu()
  const [expanded, setExpanded] = useState(() => new Set())
  const [editMode] = useEditMode()
  const toast = useToast()

  function toggleSection(id) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function onToggle(item) {
    try {
      await toggleItem(item)
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Northeastern" />
        <div className="space-y-3">
          <Skeleton className="h-28" />
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !sections.length) {
    return (
      <div className="space-y-8">
        <PageHeader title="Northeastern" />
        {error ? (
          <ErrorNote error={error} onRetry={refresh} />
        ) : (
          <EmptyState>No sections yet.</EmptyState>
        )}
      </div>
    )
  }

  const allItems = sections.flatMap((s) => s.neu_items)
  const doneCount = allItems.filter((i) => i.done).length

  return (
    <div className="space-y-8">
      <PageHeader title="Northeastern" />

      <Card className="flex items-center gap-5 p-5">
        <Ring value={allItems.length ? doneCount / allItems.length : 0} size={96} sublabel="ready" />
        <div className="min-w-0">
          <p className="font-display text-base font-semibold text-ink-50">
            {doneCount} of {allItems.length} items done
          </p>
          <p className="mt-1 text-sm text-ink-300">
            across {sections.length} pre-arrival {sections.length === 1 ? 'section' : 'sections'}
          </p>
        </div>
      </Card>

      <section className="space-y-3">
        <SectionTitle>Checklists</SectionTitle>

        <EditableList
          items={sections}
          table="neu_sections"
          labelField="title"
          onMutate={refresh}
          addLabel="Add section"
          deleteMessage={(section) =>
            `"${section.title}" and its ${section.neu_items.length} items will be removed. This cannot be undone.`
          }
          renderItem={(section) => {
          const items = section.neu_items
          const done = items.filter((i) => i.done).length
          const ratio = items.length ? done / items.length : 0
          const isOpen = expanded.has(section.id)

          return (
            <Card key={section.id} className={ratio === 1 ? 'border-accent-line' : ''}>
              <button
                onClick={() => toggleSection(section.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-[15px] font-semibold text-ink-50">
                    {section.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-400">
                    {done}/{items.length}
                  </span>
                </span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-ink-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>

              <div className="px-4 pb-3.5">
                <ProgressBar value={ratio} />
              </div>

              {isOpen ? (
                <div className="fade-in border-t border-ink-700 py-1">
                  <EditableList
                    items={items}
                    table="neu_items"
                    labelField="text"
                    newRow={{ section_id: section.id }}
                    onMutate={refresh}
                    addLabel="Add item"
                    itemClassName="px-2"
                    renderItem={(item) => (
                      <div key={item.id} className="px-4 py-2.5">
                        <Checkbox
                          checked={item.done}
                          onChange={() => onToggle(item)}
                          label={item.text}
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
      </section>
    </div>
  )
}
