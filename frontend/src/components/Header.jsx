import { Link } from 'react-router-dom'
import { button, container } from '../lib/ui.js'
import Brand from './Brand.jsx'
import ThemeToggle from './ThemeToggle.jsx'

const LINKS = [
  ['Jobs', '/offers'],
  ['How it works', '/about'],
  ['FAQ', '/faq'],
  ['Contact', '/contact'],
]

export function Header() {
  return (
    <header className="bg-night text-night-ink">
      <div className={`${container} flex min-h-[68px] items-center justify-between gap-3 py-3`}>
        <Brand />
        <div className="flex items-center gap-4">
          <nav aria-label="Main navigation" className="hidden items-center gap-6 text-[12px] font-semibold min-[760px]:flex">
            {LINKS.map(([label, href]) => (
              <Link className="text-night-ink/80 no-underline transition-colors hover:text-white" key={href} to={href}>{label}</Link>
            ))}
            <Link className="text-night-ink/50 no-underline transition-colors hover:text-white" to="/admin/login">Team sign in</Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link className={`${button} min-h-9 px-4 text-[12px] max-[360px]:px-3`} to="/offers">Apply now</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 min-[760px]:hidden">
        <nav aria-label="Main navigation" className={`${container} flex gap-5 overflow-x-auto py-2.5 text-[12px] font-semibold`}>
          {LINKS.map(([label, href]) => (
            <Link className="shrink-0 text-night-ink/80 no-underline transition-colors hover:text-white" key={href} to={href}>{label}</Link>
          ))}
          <Link className="shrink-0 text-night-ink/50 no-underline transition-colors hover:text-white" to="/admin/login">Sign in</Link>
        </nav>
      </div>
    </header>
  )
}

export default Header
