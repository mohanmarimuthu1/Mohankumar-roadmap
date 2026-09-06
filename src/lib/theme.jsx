import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

/**
 * Theme preference: 'light' | 'dark' | 'system'.
 *
 * Stored as a bare string (not JSON) because the no-flash script in index.html
 * reads the same key before React boots and has to stay tiny. The two must
 * agree on STORAGE_KEY and on the background colours below.
 */
const STORAGE_KEY = 'roadmap:theme'
const THEME_COLOR = { dark: '#0A0A0B', light: '#F7F8F9' }

export const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

const ThemeContext = createContext({
  preference: 'system',
  theme: 'dark',
  setPreference: () => {},
  toggle: () => {},
})

function readPreference() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system'
  } catch {
    return 'system'
  }
}

function prefersDark() {
  return typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : true
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(readPreference)
  const [systemDark, setSystemDark] = useState(prefersDark)

  // Follow the OS while the preference is 'system'.
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event) => setSystemDark(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const theme = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.style.colorScheme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
  }, [theme])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, preference)
    } catch {
      /* quota / private mode -- non-fatal, the theme just won't persist */
    }
  }, [preference])

  // The icon button flips to the opposite of what is on screen, which also
  // means the first tap always leaves 'system' for something explicit.
  const toggle = useCallback(() => {
    setPreference(theme === 'dark' ? 'light' : 'dark')
  }, [theme])

  const value = useMemo(
    () => ({ preference, theme, setPreference, toggle }),
    [preference, theme, toggle]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
