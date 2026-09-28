import { Outlet } from 'react-router-dom'
import NavBar from './NavBar'
import TabBar from './TabBar'

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-ink-900">
      <a
        href="#main"
        className="sr-only rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-on-accent focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
      >
        Skip to content
      </a>

      <NavBar />

      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 md:pb-14">
        <Outlet />
      </main>

      <TabBar />
    </div>
  )
}
