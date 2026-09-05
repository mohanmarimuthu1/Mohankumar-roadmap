import { useState } from 'react'
import { Compass, LogIn, Loader2 } from 'lucide-react'
import { useAuth } from '../lib/hooks'
import { isConfigured } from '../lib/supabase'

export default function Auth() {
  const { signInWithGoogle } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleSignIn() {
    setBusy(true)
    setError(null)
    try {
      await signInWithGoogle()
      // On success the browser navigates to Google; nothing else to do here.
    } catch (err) {
      setError(err.message ?? 'Sign-in failed')
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-line bg-accent-soft">
            <Compass size={26} className="text-accent" />
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-50">
            Mohan Roadmap
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-300">
            Phases, habits, training and the road to Northeastern — in one place.
          </p>
        </div>

        {isConfigured ? (
          <button
            onClick={handleSignIn}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-accent px-4 py-3.5 font-medium text-ink-900 transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
            {busy ? 'Redirecting…' : 'Continue with Google'}
          </button>
        ) : (
          <div className="rounded-xl border border-ink-500 bg-ink-800 p-4 text-sm leading-relaxed text-ink-200">
            <p className="mb-2 font-medium text-ink-50">Supabase isn&apos;t configured yet</p>
            <p className="text-ink-300">
              Copy <code className="text-accent">.env.example</code> to{' '}
              <code className="text-accent">.env.local</code>, add your project URL and anon key,
              then restart the dev server.
            </p>
          </div>
        )}

        {error ? (
          <p className="mt-4 text-center text-sm text-ink-200">{error}</p>
        ) : null}

        <p className="mt-8 text-center text-xs text-ink-400">
          Your data stays in your own Supabase project.
        </p>
      </div>
    </div>
  )
}
