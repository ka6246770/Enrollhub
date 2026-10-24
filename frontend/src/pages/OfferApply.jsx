import { Link, useParams } from 'react-router-dom'
import JobLoading from '../components/JobLoading.jsx'
import PageFrame from '../components/PageFrame.jsx'
import RegistrationForm from '../components/RegistrationForm.jsx'
import { isClosed, isPaused, isSoldOut, seatsLeft } from '../data/offers.js'
import { useOffers } from '../hooks/useOffers.js'
import { button, container } from '../lib/ui.js'
import NotFound from './NotFound.jsx'

// The application lives on its own page so the job details stay a read-only
// reference. The form is never rendered beside the job description.
export default function OfferApply() {
  const { slug } = useParams()
  const { offers, isLoading } = useOffers()
  const offer = offers.find((item) => item.slug === slug)

  if (!offer && isLoading) return <JobLoading />
  if (!offer || isClosed(offer)) return <NotFound />

  const paused = isPaused(offer)
  const soldOut = !paused && (isSoldOut(offer) || seatsLeft(offer) === 0)
  const jobPath = `/offers/${offer.slug}`

  return (
    <PageFrame>
      <main className="motion-page pb-16" id="main-content">
        <div className={`${container} max-w-[820px]`}>
          <Link className="inline-flex items-center gap-2 pt-8 text-[12px] font-bold text-muted no-underline hover:text-ink" to={jobPath}>
            <span aria-hidden="true">←</span> Back to the job
          </Link>

          <header className="motion-hero mt-6 border-b border-ink/15 pb-7">
            <p className="mono-label text-accent-text">Application</p>
            <h1 className="mt-3 max-w-[20ch] text-balance text-[clamp(32px,5vw,48px)] font-extrabold leading-[1.02] tracking-[-0.04em]">
              Apply for {offer.title}
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-muted">
              {offer.location} · {offer.price} per month · {offer.duration}
            </p>
          </header>

          {paused ? (
            <section className="motion-panel mt-8 border border-sand-strong/30 bg-sand p-6">
              <h2 className="text-[20px] font-extrabold text-sand-ink">Registration paused</h2>
              <p className="mt-1.5 max-w-[52ch] text-[13px] leading-relaxed text-sand-ink/85">
                We are not taking new applications for this job right now. The job page will show when it reopens.
              </p>
              <Link className={`${button} mt-4`} to={jobPath}>Back to the job</Link>
            </section>
          ) : soldOut ? (
            <section className="motion-panel mt-8 border border-coral-strong/30 bg-coral p-6">
              <h2 className="text-[20px] font-extrabold text-coral-ink">This job is full</h2>
              <p className="mt-1.5 max-w-[52ch] text-[13px] leading-relaxed text-coral-ink">
                All places are taken. Join the waitlist and we will message you on WhatsApp if a place opens.
              </p>
              <Link className={`${button} mt-4`} to={`${jobPath}/waitlist`}>Join the waitlist</Link>
            </section>
          ) : (
            <RegistrationForm offer={offer} />
          )}

          <p className="mt-8 text-center text-[12px] text-muted">
            Need the details first?{' '}
            <Link className="font-bold text-brand-text underline" to={jobPath}>Read the job page</Link>.
          </p>
        </div>
      </main>
    </PageFrame>
  )
}
