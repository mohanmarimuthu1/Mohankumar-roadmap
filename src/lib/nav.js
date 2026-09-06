import {
  CalendarCheck,
  Dumbbell,
  GraduationCap,
  Library,
  Map,
  Radio,
  Repeat,
  Settings as SettingsIcon,
} from 'lucide-react'

/**
 * The single source of truth for navigation: the top bar, the mobile tab bar
 * and each page's own header all read from here, so a route only ever needs
 * its title written down once.
 */
export const NAV_ITEMS = [
  {
    to: '/today',
    label: 'Today',
    icon: CalendarCheck,
    description: 'Your day at a glance',
  },
  {
    to: '/roadmap',
    label: 'Roadmap',
    icon: Map,
    description: 'Phases, groups and tasks',
  },
  {
    to: '/live',
    label: 'Live',
    icon: Radio,
    description: 'AI news, models, papers and repos',
  },
  {
    to: '/gym',
    label: 'Gym',
    icon: Dumbbell,
    description: 'Your split and every set you log',
  },
  {
    to: '/habits',
    label: 'Habits',
    icon: Repeat,
    description: 'Daily, weekly and monthly streaks',
  },
  {
    to: '/neu',
    label: 'NEU',
    icon: GraduationCap,
    description: 'Northeastern pre-arrival checklists',
  },
  {
    to: '/resources',
    label: 'Resources',
    icon: Library,
    description: 'Links worth keeping',
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: SettingsIcon,
    description: 'Appearance, data and your account',
  },
]

export function navItemFor(pathname) {
  return NAV_ITEMS.find((item) => pathname.startsWith(item.to)) ?? null
}
