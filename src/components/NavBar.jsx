import { NavLink, useLocation } from 'react-router-dom'
import { Compass, LogOut } from 'lucide-react'
import { NAV_ITEMS, navItemFor } from '../lib/nav'
import { useAuth } from '../lib/hooks'
import { ThemeToggle } from './ThemeToggle'

/**
 * The primary navigation bar.
 *
 * One bar, three widths:
 *   - lg and up  -- brand, all eight destinations inline, account controls
 *   - md         -- same, but the destination strip scrolls horizontally
 *   - below md   -- brand and the current page name only; destinations move to
 *                   the bottom TabBar, which is easier to reach on a phone
 */
export default function NavBar() {
  const { user, signOut } = useAuth()
  const { pathname } = useLocation()
  const current = navItemFor(pathname)

  return (
    <header className="pt-safe sticky top-0 z-30 border-b border-ink-600 bg-ink-900/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-4">
        <Brand />

        {/* Divider doubles as the "you are here" label on small screens. */}
        <span className="truncate font-display text-sm font-medium text-ink-300 md:hidden">
          {current ? <span className="mr-2 text-ink-500">/</span> : null}
          {current?.label}
        </span>

        <DestinationStrip />

        <div className="ml-auto flex shrink-0 items-center gap-1 md:ml-2">
          <ThemeToggle />
          {user?.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt=""
              referrerPolicy="no-referrer"
              className="ml-1 h-7 w-7 rounded-full border border-ink-600 object-cover"
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
  )
}

function Brand() {
  return (
    <NavLink
      to="/today"
      className="flex shrink-0 items-center gap-2.5"
      aria-label="Mohan Roadmap, go to Today"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-soft">
        <Compass size={16} className="text-accent" />
      </span>
      <span className="hidden font-display text-[15px] font-semibold tracking-tight text-ink-50 sm:block">
        Roadmap
      </span>
    </NavLink>
  )
}

/** Horizontal destination list, md and up. */
function DestinationStrip() {
  return (
    <nav
      aria-label="Primary"
      className="no-scrollbar ml-2 hidden flex-1 items-center gap-0.5 overflow-x-auto md:flex"
    >
      {NAV_ITEMS.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            [
              'shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors',
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
  )
}
