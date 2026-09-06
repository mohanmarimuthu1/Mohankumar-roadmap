import { useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { Check, GripVertical, Pencil, Plus, Trash2, X } from 'lucide-react'
import { ConfirmModal } from './ui'
import { useToast } from './Toast'
import { useEditMode } from '../lib/hooks'
import { supabase } from '../lib/supabase'

/**
 * A list that becomes editable when edit mode is on: drag to reorder, pencil to
 * rename inline, trash to delete, and a + row at the end to append.
 *
 * All writes go straight to `table`; the parent is told to refetch through
 * `onMutate`. With edit mode off this renders nothing but `renderItem`, so the
 * drag machinery costs nothing in the normal reading view.
 */
export default function EditableList({
  items,
  table,
  labelField,
  newRow = {},
  onMutate,
  renderItem,
  addLabel = 'Add item',
  itemClassName = '',
  renameInline = true,
  allowAdd = true,
  deleteMessage = (item) => `"${item[labelField]}" will be removed. This cannot be undone.`,
}) {
  const [editMode] = useEditMode()
  const [order, setOrder] = useState(null) // local override while a drag settles
  const [editingId, setEditingId] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // `order` is only a transient view of the server list between drop and refetch.
  const list = order ? order.map((id) => items.find((i) => i.id === id)).filter(Boolean) : items

  if (!editMode) {
    return <>{items.map((item) => renderItem(item))}</>
  }

  async function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return

    const from = list.findIndex((i) => i.id === active.id)
    const to = list.findIndex((i) => i.id === over.id)
    const next = arrayMove(list, from, to)
    setOrder(next.map((i) => i.id))

    try {
      const changed = next
        .map((item, idx) => ({ item, idx }))
        .filter(({ item, idx }) => item.order_idx !== idx)

      for (const { item, idx } of changed) {
        const { error } = await supabase.from(table).update({ order_idx: idx }).eq('id', item.id)
        if (error) throw new Error(error.message)
      }
      await onMutate?.()
    } catch (err) {
      toast(err.message, 'error')
      await onMutate?.()
    } finally {
      setOrder(null)
    }
  }

  async function rename(item, value) {
    const trimmed = value.trim()
    setEditingId(null)
    if (!trimmed || trimmed === item[labelField]) return

    const { error } = await supabase
      .from(table)
      .update({ [labelField]: trimmed })
      .eq('id', item.id)
    if (error) toast(error.message, 'error')
    else await onMutate?.()
  }

  async function remove() {
    setBusy(true)
    try {
      const { error } = await supabase.from(table).delete().eq('id', deleting.id)
      if (error) throw new Error(error.message)
      setDeleting(null)
      await onMutate?.()
      toast('Deleted')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function add(value) {
    const trimmed = value.trim()
    setAdding(false)
    if (!trimmed) return

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase.from(table).insert({
      ...newRow,
      user_id: user.id,
      [labelField]: trimmed,
      order_idx: items.length,
    })
    if (error) toast(error.message, 'error')
    else {
      await onMutate?.()
      toast('Added')
    }
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={list.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {list.map((item) => (
            <SortableRow
              key={item.id}
              item={item}
              className={itemClassName}
              editing={editingId === item.id}
              onEdit={() => setEditingId(item.id)}
              onCancelEdit={() => setEditingId(null)}
              onRename={(value) => rename(item, value)}
              onDelete={() => setDeleting(item)}
              labelField={labelField}
              renameInline={renameInline}
            >
              {renderItem(item)}
            </SortableRow>
          ))}
        </SortableContext>
      </DndContext>

      {!allowAdd ? null : adding ? (
        <div className={`px-4 py-2.5 ${itemClassName}`}>
          <InlineInput placeholder={addLabel} onSubmit={add} onCancel={() => setAdding(false)} />
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-ink-400 transition-colors hover:text-accent ${itemClassName}`}
        >
          <Plus size={15} />
          {addLabel}
        </button>
      )}

      <ConfirmModal
        open={Boolean(deleting)}
        title="Delete"
        message={deleting ? deleteMessage(deleting) : ''}
        confirmLabel="Delete"
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={remove}
      />
    </>
  )
}

function SortableRow({
  item,
  children,
  className,
  editing,
  onEdit,
  onCancelEdit,
  onRename,
  onDelete,
  labelField,
  renameInline,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : undefined,
    position: 'relative',
  }

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-1 ${className}`}>
      <button
        {...attributes}
        {...listeners}
        aria-label="Reorder"
        className="shrink-0 cursor-grab touch-none rounded-lg p-1.5 text-ink-400 hover:text-ink-100 active:cursor-grabbing"
      >
        <GripVertical size={15} />
      </button>

      <div className="min-w-0 flex-1">
        {editing && renameInline ? (
          <InlineInput
            defaultValue={item[labelField] ?? ''}
            onSubmit={onRename}
            onCancel={onCancelEdit}
          />
        ) : (
          children
        )}
      </div>

      {!editing ? (
        <>
          {renameInline ? (
          <button
            onClick={onEdit}
            aria-label="Rename"
            className="shrink-0 rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-700 hover:text-ink-100"
          >
            <Pencil size={14} />
          </button>
          ) : null}
          <button
            onClick={onDelete}
            aria-label="Delete"
            className="shrink-0 rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-700 hover:text-accent"
          >
            <Trash2 size={14} />
          </button>
        </>
      ) : null}
    </div>
  )
}

function InlineInput({ defaultValue = '', placeholder, onSubmit, onCancel }) {
  const [value, setValue] = useState(defaultValue)

  return (
    <div className="flex items-center gap-1.5">
      <input
        autoFocus
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit(value)
          if (e.key === 'Escape') onCancel()
        }}
        className="w-full rounded-lg border border-ink-500 bg-ink-900 px-3 py-1.5 text-sm text-ink-100 placeholder:text-ink-400 focus:border-accent focus:outline-none"
      />
      <button
        onClick={() => onSubmit(value)}
        aria-label="Save"
        className="shrink-0 rounded-lg p-1.5 text-accent hover:bg-ink-700"
      >
        <Check size={15} />
      </button>
      <button
        onClick={onCancel}
        aria-label="Cancel"
        className="shrink-0 rounded-lg p-1.5 text-ink-400 hover:bg-ink-700"
      >
        <X size={15} />
      </button>
    </div>
  )
}
