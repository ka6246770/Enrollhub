// SEO + GEO: every question is a real H3 and every answer is visible in the
// initial HTML. The previous <details>/<summary> pattern hid answers from
// crawlers and did not expose the question as a heading. Natural-language
// questions and self-contained answers are easier for answer engines to quote.
//
// Use this component beneath an H2, so the hierarchy stays H1 -> H2 -> H3.

export function FaqList({ items, className = 'border-t border-ink/15' }) {
  return (
    <div className={className}>
      {items.map(({ question, answer }) => (
        <article className="border-b border-ink/15 py-5" key={question}>
          <h3 className="max-w-[68ch] text-[16px] font-bold leading-snug">{question}</h3>
          <p className="mt-2 max-w-[68ch] text-[14px] leading-[1.7] text-muted">{answer}</p>
        </article>
      ))}
    </div>
  )
}

export default FaqList
