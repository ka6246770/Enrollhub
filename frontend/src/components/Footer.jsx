import { Link, useLocation } from 'react-router-dom'
import { site } from '../config/site.js'
import { container } from '../lib/ui.js'
import Brand from './Brand.jsx'

// Footer links sit in a stacked list, so a 28px row gives each one a larger
// tap area while the 10px gap between rows stays the same.
const footerLink = 'inline-flex min-h-7 items-center text-night-ink/80 no-underline hover:text-white'
const footerMutedLink = 'inline-flex min-h-7 items-center text-night-ink/60 no-underline hover:text-white'

export function Footer() {
  const { pathname, search, hash } = useLocation()
  const from = `${pathname}${search}${hash}`

  return (
    <footer className="mt-16 bg-night text-night-ink">
      <div className={`${container} grid gap-10 py-12 min-[760px]:grid-cols-[1.7fr_1fr_1fr_1fr]`}>
        <div>
          <Brand />
          <p className="mt-4 max-w-[34ch] text-[13px] leading-[1.7] text-night-ink/70">
            Factory recruitment for Al-Tayeb Company: packaging, labeling and steward roles in Sadat City, El-Obour and 10th of Ramadan.
          </p>
        </div>

        <nav aria-label="Jobs">
          <p className="mono-label text-night-muted">Jobs</p>
          <div className="mt-4 grid gap-2.5 text-[13px] font-semibold">
            <Link className={footerLink} to="/offers">All open jobs</Link>
            <Link className={footerLink} to="/about">How it works</Link>
            <Link className={footerLink} to="/faq">FAQ</Link>
          </div>
        </nav>

        <nav aria-label="Company">
          <p className="mono-label text-night-muted">Company</p>
          <div className="mt-4 grid gap-2.5 text-[13px] font-semibold">
            <Link className={footerLink} to="/contact">Contact</Link>
            <Link className={footerLink} state={{ from }} to="/contact?type=problem">Report a problem</Link>
            <Link className={footerLink} to="/privacy">Privacy policy</Link>
            <Link className={footerLink} to="/terms">Terms of use</Link>
            <Link className={footerMutedLink} to="/admin/login">Team sign in</Link>
          </div>
        </nav>

        <div>
          <p className="mono-label text-night-muted">Contact</p>
          <div className="mt-4 grid gap-2.5 text-[13px] font-semibold">
            {site.contact.telephone ? (
              <a className={footerLink} href={`https://wa.me/${site.contact.telephone.replace(/[^\d]/g, '')}`} rel="noreferrer" target="_blank">
                {site.contact.telephone}
              </a>
            ) : null}
            {site.contact.email ? (
              <a className={`${footerLink} break-words`} href={`mailto:${site.contact.email}`}>
                {site.contact.email}
              </a>
            ) : null}
            {site.contact.address ? <p className="text-night-ink/80">{site.contact.address}</p> : null}
            {!site.contact.telephone && !site.contact.email && !site.contact.address ? (
              <Link className={footerLink} to="/contact">Use the contact form</Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className={`${container} flex flex-wrap items-center justify-between gap-3 py-5 text-[11px] text-night-muted`}>
          <p>© {new Date().getFullYear()} Al-Tayeb Company. All rights reserved.</p>
          <p>Open to Egyptian nationals only. National ID required.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
