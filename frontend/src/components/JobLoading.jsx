// Shown when a shared job link opens before the live offers have loaded. It
// prevents a false 404 during that gap. NotFound is full-screen too, so this
// keeps the same simple frame.
export function JobLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-page px-6 py-12" id="main-content">
      <p aria-live="polite" className="text-xs font-bold text-muted" role="status">Loading this job…</p>
    </main>
  )
}

export default JobLoading
