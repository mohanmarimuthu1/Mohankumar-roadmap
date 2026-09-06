import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from '../lib/nav'

/**
 * Bottom tab bar for phones. Eight destinations do not fit a fixed grid at
 * 360px, so the strip scrolls -- each tab keeps a comfortable tap target
 * instead of being squeezed into an unreadable sliver.
 */
export default function TabBar() {
  return (
    <nav
      aria-label="Primary"
      className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-ink-600 bg-ink-800/95 backdrop-blur-md md:hidden"
    >
      <div className="no-scrollbar flex overflow-x-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'relative flex min-w-[68px] flex-1 flex-col items-center gap-1 px-1 py-2.5 transition-colors',
                isActive ? 'text-accent' : 'text-ink-300',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? (
                  <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-accent" />
                ) : null}
                <Icon size={19} />
                <span className="text-[10px] font-medium tracking-tight">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
