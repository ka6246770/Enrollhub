import { Link } from 'react-router-dom'
import OfferCard from '../components/OfferCard.jsx'
import PageFrame from '../components/PageFrame.jsx'
import PageHero from '../components/PageHero.jsx'
import { isSoldOut, seatsLeft } from '../data/offers.js'
import { useOffers } from '../hooks/useOffers.js'
import { container } from '../lib/ui.js'

export default function AllOffers() {
  const offers = useOffers()
  const openCount = offers.filter((offer) => !isSoldOut(offer)).length

  return (
    <PageFrame>
      <main className="pb-0" id="main-content">
        <PageHero
          eyebrow="Open jobs"
          title="Four jobs, three cities."
          intro={`${openCount} of ${offers.length} jobs are taking applications. Compare the pay, the shift and what comes with the room before you choose.`}
        />

        <section className={container}>
          {/* A shift board on wide screens, tickets on a phone. */}
          <div className="hidden border border-ink/15 bg-white min-[820px]:block">
            <div className="grid grid-cols-[56px_1.5fr_0.9fr_1fr_1fr_104px] items-center gap-4 border-b border-ink bg-ink px-5 py-3">
              {['Ref', 'Role', 'City', 'Pay / month', 'Shift', ''].map((heading) => (
                <span className="mono-label text-white/70" key={heading}>{heading}</span>
              ))}
            </div>
            {offers.map((offer) => {
              const soldOut = isSoldOut(offer)
              const seats = seatsLeft(offer)
              return (
                <div className="grid grid-cols-[56px_1.5fr_0.9fr_1fr_1fr_104px] items-center gap-4 border-b border-ink/10 px-5 py-4 transition-colors last:border-b-0 hover:bg-soft/60" key={offer.id}>
                  <span className="mono-label text-muted">{String(offer.reference ?? offer.id).padStart(2, '0')}</span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <Link className="text-[15px] font-bold text-ink no-underline hover:text-brand" to={soldOut ? `/offers/${offer.slug}/waitlist` : `/offers/${offer.slug}`}>
                        {offer.title}
                      </Link>
                      <span className={`mono-label ${soldOut ? 'text-coral-strong' : 'text-muted'}`}>
                        {soldOut ? 'Filled' : `${seats} left`}
                      </span>
                    </div>
                  </div>
                  <span className="text-[13px] font-semibold">{offer.location}</span>
                  <span className="text-[14px] font-bold tabular-nums">{offer.price}</span>
                  <span className="text-[12px] leading-snug text-muted">{offer.duration}</span>
                  <Link className="inline-flex min-h-8 items-center justify-center border border-ink bg-ink px-3 text-[11px] font-bold text-white no-underline transition-colors hover:border-accent hover:bg-accent" to={soldOut ? `/offers/${offer.slug}/waitlist` : `/offers/${offer.slug}`}>
                    {soldOut ? 'Waitlist' : 'See job'}
                  </Link>
                </div>
              )
            })}
          </div>

          <div className="grid gap-4 min-[640px]:grid-cols-2 min-[820px]:hidden">
            {offers.map((offer) => <OfferCard key={offer.id} offer={offer} />)}
          </div>

          <p className="mt-4 text-[12px] leading-relaxed text-muted">
            Pay is monthly, before any bonuses or incentives. Housing, transport and meals are included where the job says so.
          </p>
        </section>
      </main>
    </PageFrame>
  )
}
