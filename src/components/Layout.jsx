import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  CalendarCheck,
  Map,
  Radio,
  Dumbbell,
  Repeat,
  GraduationCap,
  Library,
  Settings as SettingsIcon,
  LogOut,
  Compass,
} from 'lucide-react'
import { useAuth } from '../lib/hooks'
import { ThemeToggle } from './ThemeToggle'

export const TABS = [
  { to: '/today', label: 'Today', icon: CalendarCheck },
  { to: '/roadmap', label: 'Roadmap', icon: Map },
  { to: '/live', label: 'Live', icon: Radio },
  { to: '/gym', label: 'Gym', icon: Dumbbell },
  { to: '/habits', label: 'Habits', icon: Repeat },
  { to: '/neu', label: 'NEU', icon: GraduationCap },
  { to: '/resources', label: 'Resources', icon: Library },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]

export default function Layout() {
  const { user, signOut } = useAuth()
  const { pathname } = useLocation()
  const current = TABS.find((t) => pathname.startsWith(t.to))

  return (
    <div className="flex min-h-screen flex-col bg-ink-900">
      {/* ---------------------------------------------------------- header */}
      <header className="pt-safe sticky top-0 z-30 border-b border-ink-600 bg-ink-900/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-4">
          <Compass size={18} className="shrink-0 text-accent" />
          <span className="font-display text-[15px] font-semibold tracking-tight text-ink-50">
            {current?.label ?? 'Mohan Roadmap'}
          </span>

          {/* desktop tabs */}
          <nav className="ml-4 hidden flex-1 items-center gap-0.5 lg:flex">
            {TABS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  [
                    'rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors',
                    isActive
                      ? 'bg-accent-soft text-accent'
                      : 'text-ink-300 hover:bg-ink-700 hover:text-ink-100',
                  ].join(' ')
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1 lg:ml-0">
            <ThemeToggle />
            {user?.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt=""
                referrerPolicy="no-referrer"
                className="h-7 w-7 rounded-full border border-ink-500 object-cover"
              />
            ) : null}
            <button
              onClick={signOut}
              title="Sign out"
              aria-label="Sign out"
              className="rounded-lg p-2 text-ink-300 transition-colors hover:bg-ink-700 hover:text-ink-100"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------ body */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-5 lg:pb-12">
        <Outlet />
      </main>

      {/* -------------------------------------------------- mobile tab bar */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-ink-600 bg-ink-800/95 backdrop-blur lg:hidden">
        <div className="no-scrollbar flex overflow-x-auto">
          {TABS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  'flex min-w-[68px] flex-1 flex-col items-center gap-1 px-1 py-2.5 transition-colors',
                  isActive ? 'text-accent' : 'text-ink-300',
                ].join(' ')
              }
            >
              <Icon size={19} />
              <span className="text-[10px] font-medium tracking-tight">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
