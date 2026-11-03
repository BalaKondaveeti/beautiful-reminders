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
      <img className="signin-mark" src="./icon.svg" alt="" />
      <h1 className="home-title signin-title">Beautiful Reminders</h1>
      <p className="signin-sub">Your goals, deadlines and daily habits in one list.</p>
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
