import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getSession } from '../../services/api.js'

// Keeps the dashboard screens behind a signed-in admin.
export default function RequireAdmin({ children }) {
  const location = useLocation()
  const [state, setState] = useState('checking')

  useEffect(() => {
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

  if (state === 'signed-in') return children

  if (state === 'signed-out') {
    return <Navigate replace state={{ from: location.pathname }} to="/admin/login" />
  }

  return (
    <div aria-live="polite" className="grid min-h-screen place-items-center bg-page" role="status">
      <p className="text-xs font-bold text-muted">Checking your session…</p>
    </div>
  )
}
