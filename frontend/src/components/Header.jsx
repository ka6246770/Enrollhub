import { Link } from 'react-router-dom'
import { button, container } from '../lib/ui.js'
import Brand from './Brand.jsx'

export function Header() {
  return (
    <header className="border-b border-line bg-white">
      <div className={`${container} flex min-h-[57px] flex-wrap items-center justify-between gap-x-5 gap-y-2 py-2.5`}>
        <Brand />
        <nav
          aria-label="Main navigation"
          className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-bold"
        >
          <Link className="no-underline hover:text-brand" to="/offers">Offers</Link>
          <Link className="no-underline hover:text-brand" to="/about">How it works</Link>
          <Link className="no-underline hover:text-brand" to="/faq">FAQ</Link>
          <Link className="no-underline hover:text-brand" to="/contact">Contact</Link>
          <Link className="inline-flex min-h-[33px] items-center rounded-[9px] border border-line bg-white px-3.5 text-brand no-underline transition-colors hover:border-brand motion-reduce:transition-none" to="/admin/login">
            Sign in
          </Link>
          <Link className={`${button} min-h-[33px] px-3.5`} to="/offers">
            Choose an offer
          </Link>
        </nav>
      </div>
    </header>
  )
}

export default Header
