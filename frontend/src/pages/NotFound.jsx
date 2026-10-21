import { Link } from 'react-router-dom'
import { button, secondaryButton } from '../lib/ui.js'

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <section className="w-full max-w-[540px]">
        <p className="mono-label text-accent">404 / Not found</p>
        <h1 className="mt-3 text-balance text-[clamp(32px,5vw,48px)] font-extrabold leading-[1.0] tracking-[-0.04em]">
          This page is not on the board.
        </h1>
        <p className="mt-4 max-w-[46ch] text-[14px] leading-[1.7] text-muted">
          The link may be wrong, or the job may have been filled and taken down. The open jobs are still here.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link className={button} to="/offers">See the open jobs</Link>
          <Link className={secondaryButton} to="/">Go home</Link>
        </div>
        <p className="mt-7 text-[11px] text-muted">
          Looking for the dashboard? <Link className="font-semibold text-brand underline underline-offset-2" to="/admin/login">Team sign in</Link>
        </p>
      </section>
    </main>
  )
}
