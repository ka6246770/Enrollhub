import { container } from '../lib/ui.js'

// Full-bleed closing band, used at the bottom of content pages.
export function CtaBand({ title, text, children }) {
  return (
    <section className="mt-16 bg-night text-night-ink">
      <div className={`${container} flex flex-wrap items-center justify-between gap-6 py-10`}>
        <div>
          <h2 className="text-[clamp(24px,3vw,34px)] font-extrabold leading-[1.05] tracking-[-0.03em]">{title}</h2>
          <p className="mt-2 max-w-[48ch] text-[14px] leading-[1.6] text-night-ink/70">{text}</p>
        </div>
        <div className="flex flex-wrap gap-3">{children}</div>
      </div>
    </section>
  )
}

export default CtaBand
