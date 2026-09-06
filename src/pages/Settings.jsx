import { useRef, useState } from 'react'
import { Download, LogOut, Palette, Pencil, RotateCcw, Upload } from 'lucide-react'
import { Button, Card, ConfirmModal, PageHeader, SectionTitle } from '../components/ui'
import { ThemePicker } from '../components/ThemeToggle'
import { useToast } from '../components/Toast'
import { useAuth, useEditMode } from '../lib/hooks'
import { exportAll, downloadJson, importAll } from '../lib/backup'
import { resetToDefaults } from '../lib/seed'
import { isoDate } from '../lib/dates'

export default function Settings() {
  const { user, signOut } = useAuth()
  const [editMode, setEditMode] = useEditMode()
  const [busy, setBusy] = useState(null) // 'export' | 'import' | 'reset' | null
  const [confirm, setConfirm] = useState(null) // 'reset' | 'import'
  const pendingImport = useRef(null)
  const fileInput = useRef(null)
  const toast = useToast()

  async function handleExport() {
    setBusy('export')
    try {
      const payload = await exportAll(user.id)
      downloadJson(payload, `mohan-roadmap-${isoDate()}.json`)
      toast('Exported')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(null)
    }
  }

  function pickFile(event) {
    const file = event.target.files?.[0]
    event.target.value = '' // let the same file be picked twice
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        pendingImport.current = JSON.parse(reader.result)
        setConfirm('import')
      } catch {
        toast('That file is not valid JSON', 'error')
      }
    }
    reader.onerror = () => toast('Could not read that file', 'error')
    reader.readAsText(file)
  }

  async function handleImport() {
    setBusy('import')
    try {
      await importAll(user.id, pendingImport.current)
      toast('Imported — reloading')
      setConfirm(null)
      setTimeout(() => window.location.reload(), 600)
    } catch (err) {
      toast(err.message, 'error')
      setBusy(null)
    }
  }

  async function handleReset() {
    setBusy('reset')
    try {
      await resetToDefaults(user.id)
      toast('Reset to defaults — reloading')
      setConfirm(null)
      setTimeout(() => window.location.reload(), 600)
    } catch (err) {
      toast(err.message, 'error')
      setBusy(null)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader />

      {/* ----------------------------------------------------------- account */}
      <section>
        <SectionTitle>Account</SectionTitle>
        <Card className="flex items-center gap-3 p-4">
          {user?.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt=""
              referrerPolicy="no-referrer"
              className="h-10 w-10 rounded-full border border-ink-600 object-cover"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink-50">
              {user?.user_metadata?.full_name ?? 'Signed in'}
            </p>
            <p className="truncate text-xs text-ink-400">{user?.email}</p>
          </div>
        </Card>
      </section>

      {/* ---------------------------------------------------------- appearance */}
      <section>
        <SectionTitle>Appearance</SectionTitle>
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Palette size={16} className="shrink-0 text-ink-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink-100">Theme</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-400">
                System follows your device&apos;s light/dark setting.
              </p>
            </div>
            <ThemePicker />
          </div>
        </Card>
      </section>

      {/* --------------------------------------------------------- edit mode */}
      <section>
        <SectionTitle>Edit mode</SectionTitle>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Pencil size={16} className={editMode ? 'text-accent' : 'text-ink-400'} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink-100">Enable editing</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-400">
                Shows drag handles, rename and delete controls on every list.
              </p>
            </div>
            <Toggle checked={editMode} onChange={() => setEditMode((v) => !v)} label="Edit mode" />
          </div>
        </Card>
      </section>

      {/* ------------------------------------------------------------- data */}
      <section>
        <SectionTitle>Data</SectionTitle>
        <Card className="divide-y divide-ink-700">
          <Row
            icon={Download}
            title="Export as JSON"
            note="Everything you own, including notes and gym history."
            action={
              <Button onClick={handleExport} disabled={busy !== null}>
                {busy === 'export' ? 'Exporting…' : 'Export'}
              </Button>
            }
          />
          <Row
            icon={Upload}
            title="Import JSON"
            note="Replaces all current data with the contents of the file."
            action={
              <>
                <input
                  ref={fileInput}
                  type="file"
                  accept="application/json,.json"
                  onChange={pickFile}
                  className="hidden"
                />
                <Button onClick={() => fileInput.current?.click()} disabled={busy !== null}>
                  Choose file
                </Button>
              </>
            }
          />
          <Row
            icon={RotateCcw}
            title="Reset to defaults"
            note="Wipes your data and re-seeds the original template."
            action={
              <Button variant="danger" onClick={() => setConfirm('reset')} disabled={busy !== null}>
                Reset
              </Button>
            }
          />
        </Card>
      </section>

      {/* ---------------------------------------------------------- session */}
      <section>
        <SectionTitle>Session</SectionTitle>
        <Card className="p-4">
          <Button onClick={signOut} className="w-full">
            <LogOut size={15} />
            Sign out
          </Button>
        </Card>
      </section>

      <p className="pb-2 text-center text-[11px] text-ink-400">Mohan Roadmap</p>

      <ConfirmModal
        open={confirm === 'reset'}
        title="Reset to defaults"
        message="Every task, habit log, gym set and resource you own will be deleted and replaced with the original template. This cannot be undone."
        confirmLabel="Reset everything"
        busy={busy === 'reset'}
        onCancel={() => setConfirm(null)}
        onConfirm={handleReset}
      />

      <ConfirmModal
        open={confirm === 'import'}
        title="Import backup"
        message="Your current data will be deleted and replaced with the contents of this file. This cannot be undone."
        confirmLabel="Replace my data"
        busy={busy === 'import'}
        onCancel={() => setConfirm(null)}
        onConfirm={handleImport}
      />
    </div>
  )
}

function Row({ icon: Icon, title, note, action }) {
  return (
    <div className="flex items-center gap-3 p-4">
      <Icon size={16} className="shrink-0 text-ink-400" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink-100">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-400">{note}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  )
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={[
        'relative h-6 w-11 shrink-0 rounded-full transition-colors',
        checked ? 'bg-accent' : 'bg-ink-500',
      ].join(' ')}
    >
      <span
        className={[
          'absolute top-0.5 h-5 w-5 rounded-full bg-ink-800 transition-transform',
          checked ? 'translate-x-[1.375rem]' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  )
}
