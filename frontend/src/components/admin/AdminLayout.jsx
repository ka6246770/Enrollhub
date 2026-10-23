import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { adminContainer, adminSkipLink } from '../../lib/ui.js'
import { getSession, isBackendEnabled, logout } from '../../services/api.js'
import { BrandMark } from '../Brand.jsx'
import ThemeToggle from '../ThemeToggle.jsx'

const ADMIN_LINKS = [
  ['Overview', '/admin', 'grid'],
  ['Registrations', '/admin/registrations', 'users'],
  ['Waitlist', '/admin/waitlist', 'waitlist'],
  ['Offers', '/admin/offers', 'tag'],
  ['Messages', '/admin/messages', 'chat'],
]

const NAV_ICON_PATHS = {
  grid: 'M4 5.5A1.5 1.5 0 0 1 5.5 4h4A1.5 1.5 0 0 1 11 5.5v4A1.5 1.5 0 0 1 9.5 11h-4A1.5 1.5 0 0 1 4 9.5v-4Zm9 0A1.5 1.5 0 0 1 14.5 4h4A1.5 1.5 0 0 1 20 5.5v4A1.5 1.5 0 0 1 18.5 11h-4A1.5 1.5 0 0 1 13 9.5v-4Zm-9 9A1.5 1.5 0 0 1 5.5 13h4a1.5 1.5 0 0 1 1.5 1.5v4A1.5 1.5 0 0 1 9.5 20h-4A1.5 1.5 0 0 1 4 18.5v-4Zm9 0A1.5 1.5 0 0 1 14.5 13h4a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a1.5 1.5 0 0 1-1.5-1.5v-4Z',
  users: 'M15.5 20v-1.5a3.5 3.5 0 0 0-3.5-3.5H6.5A3.5 3.5 0 0 0 3 18.5V20m14-9.5a3.5 3.5 0 1 0-7 0 3.5 3.5 0 0 0 7 0Zm4.5 9.5v-1.5a3.5 3.5 0 0 0-2.6-3.36M16 4.14a3.5 3.5 0 0 1 0 6.72',
  tag: 'm3.5 12.5 9-9H20a1 1 0 0 1 1 1v7.5l-9 9a1.5 1.5 0 0 1-2.12 0L3.5 14.62a1.5 1.5 0 0 1 0-2.12ZM16.5 7.5h.01',
  chat: 'M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7A2.5 2.5 0 0 1 17.5 15H9l-5 4.5V5.5Z',
  waitlist: 'M5 4h14l1 7v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7l1-7Zm0 7h4l1 2h4l1-2h4',
}

function NavIcon({ name }) {
  return (
    <svg aria-hidden="true" className="size-[18px] shrink-0 stroke-current stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round]" viewBox="0 0 24 24" fill="none">
      <path d={NAV_ICON_PATHS[name] ?? NAV_ICON_PATHS.grid} />
    </svg>
  )
}

// Reads the cached session (see services/api.js) so the sidebar can show who is
// signed in. The admin email is only shown when a backend is configured.
function useAdminEmail() {
  const [email, setEmail] = useState('')
  useEffect(() => {
    if (!isBackendEnabled) return undefined
    let active = true
    getSession()
      .then((session) => {
        if (active && session?.email) setEmail(session.email)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])
  return email
}

function AdminSidebar({ active, email, onSignOut }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[248px] flex-col gap-8 bg-night px-5 py-6 text-night-ink min-[900px]:flex">
      <div className="flex items-center justify-between gap-3">
        <Link className="flex items-center gap-3 no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" to="/admin">
          <BrandMark className="size-9" />
          <span className="text-sm font-bold text-white">AL-TAYEB</span>
        </Link>
        <ThemeToggle />
      </div>
      <nav aria-label="Admin sections" className="grid gap-1.5">
        {ADMIN_LINKS.map(([label, href, icon]) => {
          const current = active === label
          return (
            <Link
              aria-current={current ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none ${current ? 'bg-brand text-white' : 'text-night-ink/80 hover:bg-night-soft hover:text-white'}`}
              key={label}
              to={href}
            >
              <NavIcon name={icon} />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="mt-auto grid gap-3">
        {email ? <p className="truncate text-[10px] text-night-ink/60" title={email}>{email}</p> : null}
        <div className="flex items-center justify-between gap-3">
          <Link className="text-xs font-bold text-night-ink/70 no-underline transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none" to="/">← View site</Link>
          <button className="text-xs font-bold text-night-ink/70 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none" onClick={onSignOut} type="button">Sign out</button>
        </div>
      </div>
    </aside>
  )
}

function MobileAdminNav({ active, onSignOut }) {
  return (
    <header className="bg-night px-4 pt-4 text-night-ink min-[900px]:hidden">
      <div className="flex items-center justify-between gap-2">
        <Link className="flex items-center gap-2.5 no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" to="/admin">
          <BrandMark className="size-8" />
          <span className="text-sm font-bold text-white">AL-TAYEB</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button className="text-[11px] font-bold text-night-ink/70 transition-colors hover:text-white" onClick={onSignOut} type="button">Sign out</button>
        </div>
      </div>
      <nav aria-label="Admin sections" className="mt-3 flex gap-2 overflow-x-auto pb-3">
        {ADMIN_LINKS.map(([label, href]) => (
          <Link
            className={`shrink-0 rounded-full px-3.5 py-2 text-[11px] font-bold no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none ${active === label ? 'bg-brand text-white' : 'bg-white/5 text-night-ink/80 hover:bg-white/10 hover:text-white'}`}
            key={label}
            to={href}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  )
}

export function AdminLayout({ active, children }) {
  const navigate = useNavigate()
  const email = useAdminEmail()

  async function handleSignOut() {
    await logout()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-page">
      <a className={adminSkipLink} href="#main-content">Skip to content</a>
      <AdminSidebar active={active} email={email} onSignOut={handleSignOut} />
      <MobileAdminNav active={active} onSignOut={handleSignOut} />
      <div className="min-[900px]:pl-[248px]">
        <main className={`${adminContainer} motion-page`} id="main-content">{children}</main>
      </div>
    </div>
  )
}

export function PageHeading({ eyebrow, title, subtitle, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="text-[10px] font-bold uppercase tracking-widest text-brand-text">{eyebrow}</p>}
        <h1 className="mt-1 text-balance text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

export function StatCard({ title, value, hint }) {
  return (
    <article className="rounded-xl border border-line bg-surface p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{title}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-[10px] text-muted">{hint}</p>}
    </article>
  )
}

export default AdminLayout
