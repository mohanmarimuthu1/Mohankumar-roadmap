import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Check, AlertTriangle, Info, X } from 'lucide-react'

const ToastContext = createContext({ toast: () => {} })

const ICONS = {
  success: Check,
  error: AlertTriangle,
  info: Info,
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const toast = useCallback(
    (message, type = 'success', duration = 2600) => {
      const id = Math.random().toString(36).slice(2)
      setToasts((list) => [...list.slice(-2), { id, message, type }])
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), duration)
      )
      return id
    },
    [dismiss]
  )

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 md:bottom-8">
        {toasts.map(({ id, message, type }) => {
          const Icon = ICONS[type] ?? Info
          return (
            <div
              key={id}
              role="status"
              className="toast-in pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border border-ink-600 bg-ink-800 px-4 py-3 shadow-soft"
            >
              <Icon
                size={16}
                className={type === 'error' ? 'shrink-0 text-ink-100' : 'shrink-0 text-accent'}
              />
              <span className="flex-1 text-sm text-ink-100">{message}</span>
              <button
                onClick={() => dismiss(id)}
                aria-label="Dismiss"
                className="text-ink-300 transition-colors hover:text-ink-100"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext).toast
}
