export function FaqList({ items, className = 'grid gap-2.5' }) {
  return (
    <div className={className}>
      {items.map(({ question, answer }) => (
        <details className="group rounded-xl border border-line bg-white transition-colors hover:border-brand/40 motion-reduce:transition-none" key={question}>
          <summary className="flex min-h-[53px] cursor-pointer list-none items-center gap-3 rounded-xl p-3.5 text-xs font-bold [&::-webkit-details-marker]:hidden">
            {question}
            <span aria-hidden="true" className="ml-auto text-lg font-normal text-brand group-open:hidden">+</span>
            <span aria-hidden="true" className="ml-auto hidden text-lg font-normal text-brand group-open:inline">−</span>
          </summary>
          <p className="px-3.5 pb-4 text-pretty text-xs leading-relaxed text-muted">{answer}</p>
        </details>
      ))}
    </div>
  )
}

export default FaqList
