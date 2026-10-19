import { Link } from 'react-router-dom'
import { button } from '../lib/ui.js'

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <section className="w-full max-w-lg text-center">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand">404 · Page not found</p>
        <h1 className="mt-4 text-balance text-4xl font-bold tracking-tight">We can’t find that page.</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          The link may be incorrect, or the page may have moved.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link className={`${button} min-w-36`} to="/">Back to offers</Link>
          <Link className={`${button} min-w-36 border-line bg-white text-ink hover:bg-page hover:border-line`} to="/admin/login">
            Admin sign in
          </Link>
        </div>
      </section>
    </main>
  )
}
