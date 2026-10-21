import { container } from '../lib/ui.js'

// A short rule and a monospaced line. Used once per page, above the title — not
// above every section.
export function Kicker({ children, className = '' }) {
  return (
    <p className={`flex items-center gap-3 ${className}`}>
      <span aria-hidden="true" className="h-px w-7 bg-accent" />
      <span className="mono-label text-accent">{children}</span>
    </p>
  )
}

// The shared page intro: a kicker, a page title, and an optional opening line.
export function PageHero({ eyebrow, title, intro, introWidth = 'max-w-[600px]' }) {
  return (
    <section className={`${container} pb-10 pt-12 max-[650px]:pb-8 max-[650px]:pt-9`}>
      <Kicker>{eyebrow}</Kicker>
      <h1 className="mt-5 max-w-[820px] text-balance text-[clamp(34px,5vw,52px)] font-extrabold leading-[1.02] tracking-[-0.04em]">
        {title}
      </h1>
      {intro ? <p className={`mt-4 text-pretty ${introWidth} text-[15px] leading-[1.7] text-muted`}>{intro}</p> : null}
    </section>
  )
}

export default PageHero
