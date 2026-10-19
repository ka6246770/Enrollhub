import { container } from '../lib/ui.js'

export function Eyebrow({ children, className = '' }) {
  return (
    <span
      className={`inline-flex min-h-5 items-center rounded-full bg-mint px-2.5 text-[9px] font-bold uppercase tracking-[0.08em] text-mint-ink ${className}`}
    >
      {children}
    </span>
  )
}

// The shared page intro: a small eyebrow pill, a page title, and an optional
// opening paragraph.
export function PageHero({ eyebrow, title, intro, introWidth = 'max-w-[560px]' }) {
  return (
    <section className={`${container} pb-9 pt-[52px] max-[650px]:pb-8 max-[650px]:pt-[38px]`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className="mt-3 max-w-[700px] text-balance text-[clamp(30px,5vw,42px)] font-bold leading-[1.12] tracking-[-0.035em]">
        {title}
      </h1>
      {intro ? <p className={`mt-3.5 text-pretty ${introWidth} text-[13px] leading-[1.65] text-muted`}>{intro}</p> : null}
    </section>
  )
}

export default PageHero
