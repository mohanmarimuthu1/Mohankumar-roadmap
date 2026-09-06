import { Outlet } from 'react-router-dom'
import NavBar from './NavBar'
import TabBar from './TabBar'

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-ink-900">
      <NavBar />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 md:pb-14">
        <Outlet />
      </main>

      <TabBar />
    </div>
  )
}
