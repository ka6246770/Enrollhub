export function FaqList({ items, className = 'border-t border-ink/15' }) {
  return (
    <div className={className}>
      {items.map(({ question, answer }) => (
        <details className="group border-b border-ink/15" key={question}>
          <summary className="flex cursor-pointer list-none items-center gap-6 py-4 text-[15px] font-bold leading-snug [&::-webkit-details-marker]:hidden">
            {question}
            <span
              aria-hidden="true"
              className="ml-auto grid size-6 shrink-0 place-items-center border border-ink/25 font-mono text-sm leading-none text-ink transition-colors group-open:border-ink group-open:bg-ink group-open:text-white"
            >
              +
            </span>
          </summary>
          <p className="max-w-[62ch] pb-4 pr-10 text-[14px] leading-[1.7] text-muted">{answer}</p>
        </details>
      ))}
    </div>
  )
}

export default FaqList
