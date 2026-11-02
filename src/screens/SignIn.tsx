import { useState } from 'react'
import { supabase } from '../supabase'

export function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) {
      setError(/fetch|network/i.test(error.message) ? "Can't reach Supabase right now. Check your connection, or restore the project if it's paused." : error.message)
    }
  }

  return (
    <div className="page signin">
      <div className="signin-mark" aria-hidden="true">
        <svg viewBox="0 0 64 64" width="64" height="64">
          <defs>
            <linearGradient id="sgr" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" className="ring-stop-a k-deadline" />
              <stop offset="100%" className="ring-stop-b k-deadline" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="24" fill="none" className="signin-track" strokeWidth="6" />
          <circle cx="32" cy="32" r="24" fill="none" stroke="url(#sgr)" strokeWidth="6" strokeLinecap="round" strokeDasharray="150.8" strokeDashoffset="38" transform="rotate(-90 32 32)" />
        </svg>
      </div>
      <h1 className="home-title signin-title">Beautiful Reminders</h1>
      <p className="signin-sub">Your goals, deadlines and daily habits, in one calm place.</p>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <label className="field-label" htmlFor="si-email">
          Email
        </label>
        <input id="si-email" className="field" type="email" autoComplete="username" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="field-label" htmlFor="si-pass">
          Password
        </label>
        <input id="si-pass" className="field" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-block" disabled={busy || !email || !password}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </form>
    </div>
  )
}
