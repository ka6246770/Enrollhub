import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getSession, isBackendEnabled } from '../../services/api.js'

// Keeps the dashboard screens behind a signed-in admin. Without a backend the
// app is a UI preview, so the guard steps aside and lets the sample data show.
export default function RequireAdmin({ children }) {
  const location = useLocation()
  const [state, setState] = useState(isBackendEnabled ? 'checking' : 'preview')

  useEffect(() => {
    if (!isBackendEnabled) return undefined
    let active = true
    getSession()
      .then((session) => {
        if (active) setState(session ? 'signed-in' : 'signed-out')
      })
      .catch(() => {
        if (active) setState('signed-out')
      })
    return () => {
      active = false
    }
  }, [])

  if (state === 'preview' || state === 'signed-in') return children

  if (state === 'signed-out') {
    return <Navigate replace state={{ from: location.pathname }} to="/admin/login" />
  }

  return (
    <div aria-live="polite" className="grid min-h-screen place-items-center bg-page" role="status">
      <p className="text-xs font-bold text-muted">Checking your session…</p>
    </div>
  )
}
