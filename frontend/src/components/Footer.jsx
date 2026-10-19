import { Link } from 'react-router-dom'
import { container } from '../lib/ui.js'

export function Footer() {
  return (
    <footer className="mt-14 border-t border-line bg-white py-6">
      <div className={`${container} flex flex-wrap items-center justify-between gap-4 text-xs text-muted`}>
        <p>© [YEAR] [BRAND NAME]. All rights reserved.</p>
        <nav aria-label="Footer navigation" className="flex flex-wrap gap-4">
          <Link className="hover:text-brand" to="/offers">Offers</Link>
          <Link className="hover:text-brand" to="/about">How it works</Link>
          <Link className="hover:text-brand" to="/faq">FAQ</Link>
          <Link className="hover:text-brand" to="/contact">Contact</Link>
          <Link className="hover:text-brand" to="/privacy">Privacy Policy</Link>
          <Link className="hover:text-brand" to="/terms">Terms of Use</Link>
          <Link className="hover:text-brand" to="/admin/login">Team sign in</Link>
        </nav>
      </div>
    </footer>
  )
}

export default Footer
