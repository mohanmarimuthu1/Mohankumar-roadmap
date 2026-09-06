import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Check, AlertTriangle, X } from 'lucide-react'
import { navItemFor } from '../lib/nav'

/* ------------------------------------------------------------- skeletons */

export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />
}

export function SkeletonList({ rows = 4, className = 'h-12' }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={className} />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------- structure */

/**
 * The one heading every page opens with. Title and description default to the
 * current route's entry in src/lib/nav.js, so a page only spells them out when
 * it wants something other than its nav label.
 */
export function PageHeader({ title, description, actions, className = '' }) {
  const { pathname } = useLocation()
  const item = navItemFor(pathname)
  const heading = title ?? item?.label
  const sub = description === undefined ? item?.description : description

  return (
    <header className={`flex items-start gap-4 ${className}`}>
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-xl font-semibold tracking-tight text-ink-50 sm:text-[26px]">
          {heading}
        </h1>
        {sub ? <p className="mt-1 text-sm leading-relaxed text-ink-300">{sub}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  )
}

export function Card({ className = '', children, ...rest }) {
  return (
    <div
      className={`rounded-2xl border border-ink-600 bg-ink-800 ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}

export function SectionTitle({ children, action }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
        {children}
      </h2>
      {action}
    </div>
  )
}

export function EmptyState({ children }) {
  return (
    <p className="rounded-2xl border border-ink-600 bg-ink-800 px-4 py-8 text-center text-sm leading-relaxed text-ink-300">
      {children}
    </p>
  )
}

export function ErrorNote({ error, onRetry }) {
  if (!error) return null
  return (
    <div className="flex items-start gap-3 rounded-xl border border-ink-500 bg-ink-800 p-4">
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-accent" />
      <div className="flex-1 text-sm">
        <p className="text-ink-100">Could not load this.</p>
        <p className="mt-1 break-words text-xs text-ink-300">{error.message}</p>
      </div>
      {onRetry ? (
        <button
          onClick={onRetry}
          className="shrink-0 rounded-lg border border-ink-500 px-2.5 py-1 text-xs text-ink-200 hover:bg-ink-700"
        >
          Retry
        </button>
      ) : null}
    </div>
  )
}

/* ---------------------------------------------------------------- inputs */

export function Checkbox({ checked, onChange, label, sublabel, className = '' }) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={checked}
      className={`group flex w-full items-start gap-3 text-left ${className}`}
    >
      <span
        className={[
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
          checked
            ? 'border-accent bg-accent text-on-accent'
            : 'border-ink-400 text-transparent group-hover:border-ink-300',
        ].join(' ')}
      >
        <Check size={13} strokeWidth={3} />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={[
            'block text-sm leading-snug transition-colors',
            checked ? 'text-ink-400 line-through' : 'text-ink-100',
          ].join(' ')}
        >
          {label}
        </span>
        {sublabel ? <span className="mt-0.5 block text-xs text-ink-400">{sublabel}</span> : null}
      </span>
    </button>
  )
}

export function ProgressBar({ value = 0, className = '' }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-ink-600 ${className}`}>
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function Button({ variant = 'ghost', size = 'md', className = '', children, ...rest }) {
  const styles = {
    primary: 'bg-accent text-on-accent hover:opacity-90',
    ghost: 'border border-ink-600 text-ink-200 hover:bg-ink-700 hover:text-ink-100',
    danger: 'border border-ink-600 text-ink-100 hover:border-accent hover:text-accent',
    quiet: 'text-ink-300 hover:bg-ink-700 hover:text-ink-100',
  }[variant]

  const sizes = {
    sm: 'gap-1.5 rounded-lg px-2.5 py-1.5 text-xs',
    md: 'gap-2 rounded-xl px-3.5 py-2 text-sm',
  }[size]

  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${sizes} ${styles} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

/** Small labelled figure -- used for the counters that sit beside a heading. */
export function Metric({ value, label, className = '' }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="font-display text-lg font-semibold leading-none text-ink-50">{value}</p>
      <p className="mt-1 truncate text-[11px] uppercase tracking-wide text-ink-400">{label}</p>
    </div>
  )
}

/* ---------------------------------------------------------------- modals */

export function Modal({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fade-in fixed inset-0 z-50 flex items-end justify-center bg-scrim p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="pb-safe shadow-soft relative w-full max-w-md rounded-t-2xl border border-ink-600 bg-ink-800 sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-ink-600 px-5 py-3.5">
          <h3 className="font-display text-sm font-semibold text-ink-50">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-ink-300 hover:bg-ink-700 hover:text-ink-100"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-ink-600 px-5 py-3.5">{footer}</div>
        ) : null}
      </div>
    </div>
  )
}

export function ConfirmModal({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
  busy = false,
}) {
  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onCancel}
      title={title}
      footer={
        <>
          <Button onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-ink-200">{message}</p>
    </Modal>
  )
}
