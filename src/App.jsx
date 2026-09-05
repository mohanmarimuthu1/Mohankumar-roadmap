import { Navigate, Route, Routes } from 'react-router-dom'
import { Loader2, AlertTriangle } from 'lucide-react'
import { AuthProvider, EditModeProvider, useAuth, useSeedGate } from './lib/hooks'
import { ToastProvider } from './components/Toast'
import { Button } from './components/ui'
import Auth from './components/Auth'
import Layout from './components/Layout'
import Today from './pages/Today'
import Roadmap from './pages/Roadmap'
import Live from './pages/Live'
import Gym from './pages/Gym'
import Habits from './pages/Habits'
import NEU from './pages/NEU'
import Resources from './pages/Resources'
import Settings from './pages/Settings'

function Splash({ children }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      {children}
    </div>
  )
}

/** Blocks the app until the user's default data exists. */
function SeedGate({ children }) {
  const { user } = useAuth()
  const { ready, error } = useSeedGate(user?.id)

  if (error) {
    return (
      <Splash>
        <AlertTriangle size={22} className="text-accent" />
        <div>
          <p className="font-display text-base font-semibold text-ink-50">Setup failed</p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-300">{error.message}</p>
          <p className="mt-3 max-w-sm text-xs leading-relaxed text-ink-400">
            If this mentions a missing relation, run{' '}
            <code className="text-accent">supabase/schema.sql</code> in the Supabase SQL editor
            first.
          </p>
        </div>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </Splash>
    )
  }

  if (!ready) {
    return (
      <Splash>
        <Loader2 size={22} className="animate-spin text-ink-400" />
        <p className="text-sm text-ink-300">Setting things up…</p>
      </Splash>
    )
  }

  return children
}

function Protected({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <Splash>
        <Loader2 size={22} className="animate-spin text-ink-400" />
      </Splash>
    )
  }

  return user ? <SeedGate>{children}</SeedGate> : <Auth />
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <EditModeProvider>
          <Protected>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Navigate to="/today" replace />} />
                <Route path="/today" element={<Today />} />
                <Route path="/roadmap" element={<Roadmap />} />
                <Route path="/live" element={<Live />} />
                <Route path="/gym" element={<Gym />} />
                <Route path="/habits" element={<Habits />} />
                <Route path="/neu" element={<NEU />} />
                <Route path="/resources" element={<Resources />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/today" replace />} />
              </Route>
            </Routes>
          </Protected>
        </EditModeProvider>
      </ToastProvider>
    </AuthProvider>
  )
}
