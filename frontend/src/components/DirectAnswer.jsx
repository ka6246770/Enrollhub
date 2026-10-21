// GEO: answer-engine optimisation block. The first paragraph a visitor (or an
// AI crawler) reads should answer the page's main query in 40–60 words, with
// named places, numbers, dates and eligibility rules instead of marketing copy.
// SEO: a concise answer immediately after the H1 is also a strong featured-
// snippet candidate.
//
// Keep `children` as plain text. The optional dev check below warns when the
// word count drifts outside the 40–60 word target.

import { SEO_LIMITS } from '../config/site.js'

export function DirectAnswer({
  children,
  title = 'Quick answer',
  id = 'direct-answer',
  className = '',
}) {
  if (import.meta.env.DEV && typeof children === 'string') {
    const words = children.trim().split(/\s+/).filter(Boolean).length
    const [min, max] = SEO_LIMITS.directAnswerWords
    if (words < min || words > max) {
      console.warn(`[GEO] "${title}" is ${words} words; aim for ${min}–${max}.`)
    }
  }

  return (
    <section
      aria-labelledby={`${id}-heading`}
      className={`border-l-4 border-accent bg-white/60 px-5 py-4 ${className}`}
      data-geo-direct-answer=""
    >
      <h2 className="mono-label text-accent" id={`${id}-heading`}>{title}</h2>
      <p className="mt-2 max-w-[72ch] text-[15px] leading-[1.7] text-ink">{children}</p>
    </section>
  )
}

export default DirectAnswer
