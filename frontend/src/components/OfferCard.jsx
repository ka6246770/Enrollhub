import { Link } from 'react-router-dom'
import { isSoldOut, seatsLeft } from '../data/offers.js'
import { button } from '../lib/ui.js'

export function OfferCard({ offer }) {
  const soldOut = isSoldOut(offer)
  const seats = seatsLeft(offer)

  return (
    <article className="flex min-h-[193px] flex-col items-start rounded-2xl border border-line bg-white p-5">
      <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-mint px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-mint-ink">
          Offer {offer.id}
        </span>
        <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${soldOut ? 'bg-coral text-coral-ink' : 'bg-sand text-sand-ink'}`}>
          {soldOut ? 'Sold out' : `${seats} seats left`}
        </span>
      </div>
      <h3 className="text-[17px] font-bold leading-snug">{offer.title}</h3>
      <p className="mt-2.5 text-[11px] leading-relaxed text-muted">{offer.shortDescription}</p>
      <p className="mt-2.5 text-sm font-bold">{offer.price}</p>
      <Link className={`${button} mt-auto w-full`} to={soldOut ? `/offers/${offer.slug}/waitlist` : `/offers/${offer.slug}`}>
        {soldOut ? 'Join waitlist' : `Select Offer ${offer.id}`}
      </Link>
    </article>
  )
}

export default OfferCard
