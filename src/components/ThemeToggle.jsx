import { Moon, Sun } from 'lucide-react'
import { THEME_OPTIONS, useTheme } from '../lib/theme'

/** One-tap light/dark flip. Lives in the nav bar. */
export function ThemeToggle({ className = '' }) {
  const { theme, toggle } = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      onClick={toggle}
      title={`Switch to ${next} theme`}
      aria-label={`Switch to ${next} theme`}
      className={`rounded-lg p-2 text-ink-300 transition-colors hover:bg-ink-700 hover:text-ink-100 ${className}`}
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}

/** Full three-way choice, including "follow the OS". Lives in Settings. */
export function ThemePicker() {
  const { preference, setPreference } = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex rounded-xl border border-ink-600 bg-ink-900 p-1"
    >
      {THEME_OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          role="radio"
          aria-checked={preference === value}
          onClick={() => setPreference(value)}
          className={[
            'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
            preference === value
              ? 'bg-accent text-on-accent'
              : 'text-ink-300 hover:text-ink-100',
          ].join(' ')}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
