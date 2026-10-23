import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BrandMark } from '../../components/Brand.jsx'
import { inputClass, solidButton } from '../../lib/ui.js'
import { getSession, isBackendEnabled, login } from '../../services/api.js'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // A saved cookie is enough to skip the form. This also covers revisiting a
  // bookmarked /admin/login while already signed in.
  useEffect(() => {
    if (!isBackendEnabled) return undefined
    let active = true
    getSession()
      .then((session) => {
        if (active && session) navigate('/admin/dashboard', { replace: true })
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [navigate])

  async function handleSubmit(event) {
    event.preventDefault()
    const form = event.currentTarget
    setError('')
    setNotice('')
    setSubmitting(true)
    try {
      await login({
        email: form.elements.email.value.trim(),
        password: form.elements.password.value,
        remember: form.elements.remember.checked,
      })
      const next = location.state?.from && location.state.from.startsWith('/admin') ? location.state.from : '/admin/dashboard'
      navigate(next, { replace: true })
    } catch (loginError) {
      setError(loginError.message || 'Could not sign in. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <main className="motion-page flex min-h-screen items-center justify-center bg-night px-6 py-10">
      <div className="w-full max-w-[440px] rounded-[4px] border border-line bg-surface p-8 max-[650px]:p-6">
        <Link className="flex items-center gap-3 no-underline" to="/">
          <BrandMark className="size-10" />
          <span className="text-base font-extrabold tracking-[-0.01em] text-ink">AL-TAYEB</span>
        </Link>
        <h1 className="mt-7 text-3xl font-bold tracking-tight">Sign in to dashboard</h1>
        <p className="mt-2 text-sm text-muted">For team members only.</p>
        <form className="mt-7 grid gap-4" onSubmit={handleSubmit}>
          <label className="text-xs font-bold">
            Email
            <input
              autoComplete="username"
              autoFocus
              className={`${inputClass} mt-1.5`}
              name="email"
              placeholder="you@company.com"
              required
              type="email"
            />
          </label>
          <label className="text-xs font-bold">
            Password
            <input
              autoComplete="current-password"
              className={`${inputClass} mt-1.5`}
              name="password"
              placeholder="Your password"
              required
              type="password"
            />
          </label>
          <label className="flex cursor-pointer items-start gap-2.5 rounded-[4px] border border-line bg-page/60 px-3 py-2.5 text-[11px] leading-relaxed text-muted">
            <input className="mt-0.5 accent-accent" defaultChecked name="remember" type="checkbox" />
            <span>
              <span className="block font-bold text-ink">Keep me signed in</span>
              <span className="block">Stay signed in on this device for 30 days. Avoid this on a shared computer.</span>
            </span>
          </label>
          <button className={`${solidButton} mt-1 min-h-11 w-full text-sm`} type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
          {error ? <p className="rounded-lg bg-coral px-3 py-2 text-xs font-semibold text-coral-ink" role="alert">{error}</p> : null}
          <button className="text-center text-xs font-bold text-brand-text underline hover:no-underline" onClick={() => setNotice('Password reset is not configured. Ask the site owner to create a new admin password with the backend admin command.')} type="button">Forgot password?</button>
          {notice && <p className="text-center text-xs text-muted" role="status">{notice}</p>}
        </form>
        <p className="mt-5 text-center text-[10px] leading-relaxed text-muted">
          {isBackendEnabled
            ? 'Sign in with the admin account created by `npm run admin:set`. “Keep me signed in” lasts 30 days and renews while you use the dashboard.'
            : 'Preview mode: any email and password open the dashboard, because no backend is configured.'}
        </p>
      </div>
    </main>
  )
}
