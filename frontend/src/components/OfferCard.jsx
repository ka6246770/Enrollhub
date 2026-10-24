import { Link } from 'react-router-dom'
import { isClosed, isPaused, isSoldOut, seatsLeft } from '../data/offers.js'

// A job ticket: reference number, city, role, pay, shift and places, closed off
// with the action. The dashed rule and monospaced metadata carry the paperwork
// idea; nothing else is decorated.
export function OfferCard({ offer }) {
  if (isClosed(offer)) return null

  const paused = isPaused(offer)
  const soldOut = isSoldOut(offer) || (!paused && seatsLeft(offer) === 0)
  const seats = seatsLeft(offer)
  const reference = String(offer.reference ?? offer.id).padStart(2, '0')
  const target = paused || !soldOut ? `/offers/${offer.slug}` : `/offers/${offer.slug}/waitlist`
  const actionLabel = paused ? 'View job' : soldOut ? 'Join the waitlist' : 'See the job'

  return (
    <article className="motion-card group flex h-full min-w-0 flex-col border border-ink/15 bg-surface transition-colors hover:border-ink/45 motion-reduce:transition-none">
      <div className="flex items-center justify-between gap-3 border-b border-dashed border-ink/20 px-5 py-2.5">
        <span className="mono-label text-muted">Ref {reference}</span>
        <span className="mono-label text-ink">{offer.location}</span>
      </div>

      <div className="flex flex-1 flex-col px-5 pt-4">
        <h3 className="text-[22px] font-extrabold leading-[1.08] tracking-[-0.02em]">{offer.title}</h3>
        <p className="mt-2 line-clamp-3 text-[13px] leading-[1.55] text-muted">{offer.shortDescription}</p>
        <div className="mt-5">
          <p className="mono-label text-muted">Pay per month</p>
          <p className="mt-1 text-[26px] font-extrabold leading-none tracking-[-0.03em] tabular-nums">{offer.price}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 border-t border-ink/15">
        <div className="px-5 py-3">
          <p className="mono-label text-muted">Shift</p>
          <p className="mt-1 text-[12px] font-semibold leading-snug">{offer.duration}</p>
        </div>
        <div className="border-l border-ink/15 px-5 py-3">
          <p className="mono-label text-muted">Places</p>
          <p className={`mt-1 text-[12px] font-bold ${paused ? 'text-sand-ink' : soldOut ? 'text-coral-strong' : 'text-ink'}`}>
            {paused ? 'Registration paused' : soldOut ? 'Filled' : `${seats} left`}
          </p>
        </div>
      </div>

      <Link
        className="flex items-center justify-between border-t border-ink bg-night px-5 py-3.5 text-[12px] font-bold text-white no-underline transition-colors group-hover:bg-action motion-reduce:transition-none"
        to={target}
      >
        {actionLabel}
        <span className="mono-label text-white/60 group-hover:text-white">{reference}</span>
      </Link>
    </article>
  )
}

export default OfferCard
