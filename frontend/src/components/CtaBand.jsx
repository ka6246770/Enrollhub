import { container } from '../lib/ui.js'

// Reusable closing call-to-action band used at the bottom of content pages.
export function CtaBand({ title, text, children }) {
  return (
    <section className="mt-12">
      <div className={`${container} flex flex-wrap items-center justify-between gap-4 rounded-[13px] border border-line bg-white p-5`}>
        <div>
          <h2 className="text-[15px] font-bold">{title}</h2>
          <p className="mt-1 text-xs text-muted">{text}</p>
        </div>
        <div className="flex flex-wrap gap-3">{children}</div>
      </div>
    </section>
  )
}

export default CtaBand
