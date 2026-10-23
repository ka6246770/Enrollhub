import { Link } from 'react-router-dom'
import DirectAnswer from '../components/DirectAnswer.jsx'
import OfferCard from '../components/OfferCard.jsx'
import PageFrame from '../components/PageFrame.jsx'
import PageHero from '../components/PageHero.jsx'
import { isClosed, isOpen, isPaused, isSoldOut, seatsLeft } from '../data/offers.js'
import { useOffers } from '../hooks/useOffers.js'
import { container } from '../lib/ui.js'

export default function AllOffers() {
  const { offers } = useOffers()
  const visible = offers.filter((offer) => !isClosed(offer))
  const openCount = visible.filter(isOpen).length
  const directAnswer = visible.length === 0
    ? 'Al-Tayeb has no factory jobs open for applications right now. New packaging, labeling and steward roles in Sadat City, El-Obour and 10th of Ramadan City are listed here when they open. Pay ranges from 6,600 to 11,400 EGP per month, with housing for relocating workers.'
    : `Al-Tayeb currently lists ${visible.length} factory jobs in Sadat City, El-Obour and 10th of Ramadan City. Pay ranges from 6,600 to 11,400 EGP per month, with 8- or 12-hour shifts. Every role is open to Egyptian men aged 18–50 with a National ID, and housing is included for relocating workers.`

  return (
    <PageFrame>
      <main className="motion-page pb-0" id="main-content">
        <PageHero
          eyebrow="Open jobs"
          title="Find your next shift."
          intro={`${openCount} of ${visible.length} jobs are taking applications right now. Compare the pay, the shift and what comes with the room before you choose.`}
        />

        <section className={container}>
          <DirectAnswer className="mb-8">{directAnswer}</DirectAnswer>
          <h2 className="sr-only">Open factory jobs</h2>

          {/* A shift board on wide screens, tickets on a phone. */}
          {visible.length === 0 ? (
            <p className="border border-dashed border-ink/20 bg-surface p-6 text-[13px] text-muted">
              No jobs are listed right now. Please check back soon.
            </p>
          ) : (
            <>
              <div className="motion-stagger hidden border border-ink/15 bg-surface min-[820px]:block">
                <div className="grid grid-cols-[56px_1.5fr_0.9fr_1fr_1fr_104px] items-center gap-4 border-b border-ink bg-night px-5 py-3">
                  {['Ref', 'Role', 'City', 'Pay / month', 'Shift', ''].map((heading) => (
                    <span className="mono-label text-white/70" key={heading}>{heading}</span>
                  ))}
                </div>
                {visible.map((offer) => {
                  const paused = isPaused(offer)
                  const soldOut = isSoldOut(offer) || (!paused && seatsLeft(offer) === 0)
                  const seats = seatsLeft(offer)
                  const statusLabel = paused ? 'Registration paused' : soldOut ? 'Filled' : `${seats} left`
                  const target = paused || !soldOut ? `/offers/${offer.slug}` : `/offers/${offer.slug}/waitlist`
                  const actionLabel = paused ? 'View job' : soldOut ? 'Waitlist' : 'See job'
                  return (
                    <div className="grid grid-cols-[56px_1.5fr_0.9fr_1fr_1fr_104px] items-center gap-4 border-b border-ink/10 px-5 py-4 transition-colors last:border-b-0 hover:bg-soft/60 motion-reduce:transition-none" key={offer.id}>
                      <span className="mono-label text-muted">{String(offer.reference ?? offer.id).padStart(2, '0')}</span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                          {/* The mobile ticket below owns the H3 for each job;
                              keeping this desktop row as text avoids duplicate
                              headings in the same document. */}
                          <span className="text-[15px] font-bold leading-snug">
                            <Link className="inline-flex min-h-6 items-center text-ink no-underline hover:text-brand-text" to={target}>
                              {offer.title}
                            </Link>
                          </span>
                          <span className={`mono-label ${paused ? 'text-sand-ink' : soldOut ? 'text-coral-strong' : 'text-muted'}`}>
                            {statusLabel}
                          </span>
                        </div>
                      </div>
                      <span className="text-[13px] font-semibold">{offer.location}</span>
                      <span className="text-[14px] font-bold tabular-nums">{offer.price}</span>
                      <span className="text-[12px] leading-snug text-muted">{offer.duration}</span>
                      <Link className="inline-flex min-h-8 items-center justify-center border border-ink bg-night px-3 text-[11px] font-bold text-white no-underline transition-colors hover:border-action hover:bg-action motion-reduce:transition-none" to={target}>
                        {actionLabel}
                      </Link>
                    </div>
                  )
                })}
              </div>

              <div className="motion-stagger grid gap-4 min-[640px]:grid-cols-2 min-[820px]:hidden">
                {visible.map((offer) => <OfferCard key={offer.id} offer={offer} />)}
              </div>
            </>
          )}

          <p className="mt-4 text-[12px] leading-relaxed text-muted">
            Pay is monthly, before any bonuses or incentives. Housing, transport and meals are included where the job says so.
          </p>
        </section>
      </main>
    </PageFrame>
  )
}
