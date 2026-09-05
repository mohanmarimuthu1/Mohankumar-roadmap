import { useState } from 'react'
import { ArrowUpRight, Pencil, Plus } from 'lucide-react'
import {
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Modal,
  SectionTitle,
  SkeletonList,
} from '../components/ui'
import EditableList from '../components/EditableList'
import { useToast } from '../components/Toast'
import { useAuth, useEditMode, useResources } from '../lib/hooks'
import { supabase } from '../lib/supabase'

export default function Resources() {
  const { grouped, resources, loading, error, refresh } = useResources()
  const { user } = useAuth()
  const [editMode] = useEditMode()
  const [editing, setEditing] = useState(null) // resource object, or {} for new
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  async function saveResource(form) {
    setBusy(true)
    try {
      if (editing?.id) {
        const { error: err } = await supabase
          .from('resources')
          .update({ name: form.name, url: form.url, category: form.category })
          .eq('id', editing.id)
        if (err) throw new Error(err.message)
        toast('Resource updated')
      } else {
        const siblings = resources.filter((r) => r.category === form.category)
        const { error: err } = await supabase.from('resources').insert({
          user_id: user.id,
          name: form.name,
          url: form.url,
          category: form.category,
          order_idx: siblings.length,
        })
        if (err) throw new Error(err.message)
        toast('Resource added')
      }
      setEditing(null)
      await refresh()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  if (error) return <ErrorNote error={error} onRetry={refresh} />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-300">
          {resources.length} links · {grouped.length} categories
        </p>
        <Button variant="primary" onClick={() => setEditing({})}>
          <Plus size={15} />
          Add
        </Button>
      </div>

      {loading ? (
        <SkeletonList rows={6} className="h-14" />
      ) : grouped.length ? (
        grouped.map(({ category, items }) => (
          <section key={category}>
            <SectionTitle>{category}</SectionTitle>
            <Card>
              <EditableList
                items={items}
                table="resources"
                labelField="name"
                onMutate={refresh}
                renameInline={false}
                allowAdd={false}
                itemClassName="px-2 border-b border-ink-700 last:border-b-0"
                renderItem={(resource) => (
                  <div key={resource.id} className="flex items-center gap-1 border-b border-ink-700 pr-2 last:border-b-0">
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 transition-colors hover:bg-ink-700/40"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink-100">{resource.name}</span>
                        <span className="mt-0.5 block truncate text-xs text-ink-500">
                          {hostOf(resource.url)}
                        </span>
                      </span>
                      <ArrowUpRight size={14} className="shrink-0 text-ink-400" />
                    </a>

                    {editMode ? (
                      <button
                        onClick={() => setEditing(resource)}
                        aria-label={`Edit ${resource.name}`}
                        className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-ink-700 hover:text-ink-100"
                      >
                        <Pencil size={14} />
                      </button>
                    ) : null}
                  </div>
                )}
              />
            </Card>
          </section>
        ))
      ) : (
        <EmptyState>No resources yet — add your first link.</EmptyState>
      )}

      {!editMode && !loading ? (
        <p className="text-center text-xs text-ink-500">
          Turn on edit mode in Settings to rename or delete links.
        </p>
      ) : null}

      <ResourceModal
        resource={editing}
        categories={grouped.map((g) => g.category)}
        busy={busy}
        onClose={() => setEditing(null)}
        onSave={saveResource}
      />

   </div>
  )
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function ResourceModal({ resource, categories, busy, onClose, onSave }) {
  const open = Boolean(resource)
  const [form, setForm] = useState({ name: '', url: '', category: '' })
  const [initialised, setInitialised] = useState(false)

  // Reset the form each time the modal opens on a different resource.
  if (open && !initialised) {
    setForm({
      name: resource.name ?? '',
      url: resource.url ?? '',
      category: resource.category ?? categories[0] ?? 'General',
    })
    setInitialised(true)
  }
  if (!open && initialised) setInitialised(false)

  const valid = form.name.trim() && form.url.trim()

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title={resource?.id ? 'Edit resource' : 'New resource'}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => onSave(form)} disabled={busy || !valid}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field
          label="Name"
          value={form.name}
          onChange={(name) => setForm((f) => ({ ...f, name }))}
          placeholder="NeetCode"
        />
        <Field
          label="URL"
          value={form.url}
          onChange={(url) => setForm((f) => ({ ...f, url }))}
          placeholder="https://neetcode.io/"
          type="url"
        />
        <div>
          <label className="mb-1.5 block text-[11px] uppercase tracking-wide text-ink-400">
            Category
          </label>
          <input
            list="resource-categories"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            placeholder="DSA"
            className="w-full rounded-lg border border-ink-500 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 focus:border-accent focus:outline-none"
          />
          <datalist id="resource-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
      </div>
    </Modal>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] uppercase tracking-wide text-ink-400">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-ink-500 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 focus:border-accent focus:outline-none"
      />
    </div>
  )
}
