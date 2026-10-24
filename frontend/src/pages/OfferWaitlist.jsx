import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Field } from '../components/FormField.jsx'
import JobLoading from '../components/JobLoading.jsx'
import PageFrame from '../components/PageFrame.jsx'
import Seo from '../components/Seo.jsx'
import { isClosed, isOpen, isPaused } from '../data/offers.js'
import { useOffers } from '../hooks/useOffers.js'
import { button, container } from '../lib/ui.js'
import { joinWaitlist } from '../services/api.js'
import NotFound from './NotFound.jsx'

export default function OfferWaitlist() {
  const { slug } = useParams()
  const [joined, setJoined] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const { offers, isLoading } = useOffers()
  const offer = offers.find((item) => item.slug === slug)

  // Same first-paint guard as the job page: do not call a shared waitlist link
  // missing while the API is still answering.
  if (!offer && isLoading) return <JobLoading />

  if (!offer || isClosed(offer)) return <NotFound />

  const paused = isPaused(offer)
  const openOffers = offers.filter((item) => item.id !== offer.id && isOpen(item))
  const reference = String(offer.reference ?? offer.id).padStart(2, '0')

  async function handleSubmit(event) {
    event.preventDefault()
    if (paused) return
    const formData = new FormData(event.currentTarget)
    setError('')
    setSending(true)
    try {
      await joinWaitlist({
        name: formData.get('name'),
        phone: formData.get('phone'),
        offerSlug: offer.slug,
        consent: formData.get('consent') === 'on',
        // The address is optional: omit it rather than sending an empty string.
        ...(formData.get('email') ? { email: formData.get('email') } : {}),
      })
      setJoined(true)
    } catch (submitError) {
      setError(submitError.message || 'Something went wrong. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <PageFrame>
      <Seo
        description={`Join the waitlist for the ${offer.title} job in ${offer.location}. We will contact you on WhatsApp or email if a place opens.`}
        noindex
        path={`/offers/${offer.slug}/waitlist`}
        title={`${offer.title} waitlist | Al-Tayeb`}
      />
      <main className={`${container} motion-page max-w-[760px] pb-14 pt-8`} id="main-content">
        <Link className="inline-flex items-center gap-2 text-[12px] font-bold text-muted no-underline hover:text-ink" to="/offers">
          <span aria-hidden="true">←</span> All jobs
        </Link>

        <header className="mt-6 border-b border-ink/15 pb-7">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="mono-label text-muted">Ref {reference}</span>
            <span aria-hidden="true" className="mono-label text-ink/30">/</span>
            <span className="mono-label text-ink">{offer.location}</span>
            <span aria-hidden="true" className="mono-label text-ink/30">/</span>
            <span className={`mono-label ${paused ? 'text-sand-ink' : 'text-coral-strong'}`}>
              {paused ? 'Registration paused' : 'Waitlist'}
            </span>
          </div>
          <h1 className="mt-4 text-balance text-[clamp(34px,5vw,50px)] font-extrabold leading-[1.0] tracking-[-0.04em]">{offer.title}</h1>
          <p className="mt-3 max-w-[58ch] text-[15px] leading-[1.65] text-muted">
            {paused
              ? 'Registration is paused for this job. The waitlist is closed too, so please check back later.'
              : 'Leave your name and number and we will contact you on WhatsApp or email if a place opens.'}
          </p>
        </header>

        <div className="mt-7 grid gap-4 min-[560px]:grid-cols-2">
          <div className="border border-ink/15 bg-surface px-4 py-3">
            <p className="mono-label text-muted">Pay per month</p>
            <p className="mt-1 text-[20px] font-extrabold tracking-[-0.02em] tabular-nums">{offer.price}</p>
          </div>
          <div className="border border-ink/15 bg-surface px-4 py-3">
            <p className="mono-label text-muted">Shift</p>
            <p className="mt-1 text-[15px] font-bold">{offer.duration}</p>
          </div>
        </div>

        {paused ? (
          <div className="motion-panel mt-7 border border-sand-strong/30 bg-sand p-5">
            <h2 className="text-[18px] font-extrabold text-sand-ink">Registration paused</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-sand-ink/85">
              We are not taking new applications or waitlist sign-ups for this job right now. Please check back later.
            </p>
            <Link className="mt-4 inline-flex text-[12px] font-bold text-brand-text underline underline-offset-4" to={`/offers/${offer.slug}`}>
              View the job
            </Link>
          </div>
        ) : joined ? (
          <div className="motion-panel mt-7 border border-brand/30 bg-mint p-5" role="status">
            <h2 className="text-[18px] font-extrabold text-mint-ink">You are on the waitlist.</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-mint-ink/85">
              If a place opens, we will contact you on WhatsApp or email. You will get a private
              link to accept it; the place is not confirmed until you accept. You can apply for
              another open job in the meantime.
            </p>
            <Link className="mt-4 inline-flex text-[12px] font-bold text-brand-text underline underline-offset-4" to="/offers">See the open jobs</Link>
          </div>
        ) : (
          <form className="motion-panel mt-7 border border-ink/15 bg-surface p-5 max-[500px]:p-4" onSubmit={handleSubmit}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[20px] font-extrabold tracking-[-0.02em]">Join the waitlist</h2>
              <span className="mono-label text-muted">Ref {reference}</span>
            </div>
            <div className="mt-5 grid gap-4">
              <Field label="Full name" name="name" placeholder="Your full name" autoComplete="name" required />
              <Field label="WhatsApp number" name="phone" type="tel" placeholder="+20 1XX XXX XXXX" autoComplete="tel" required />
              <div>
                <Field label="Email (optional)" name="email" type="email" placeholder="you@example.com" autoComplete="email" />
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
                  With an email address, we can send the private link when a place opens. Without
                  one, we will contact you on WhatsApp and read the link to you if needed.
                </p>
              </div>
            </div>
            <label className="mt-4 flex items-start gap-2.5 text-[12px] leading-relaxed text-muted">
              <input className="mt-0.5 accent-accent" name="consent" type="checkbox" required />
              <span>
                I agree to be contacted on WhatsApp or email if a place opens for this job. I have
                read how my details are handled in the{' '}
                <Link className="font-bold text-brand-text underline" to="/privacy">privacy policy</Link>.
              </span>
            </label>
            <button className={`${button} mt-4 w-full`} type="submit" disabled={sending}>
              {sending ? 'Joining…' : 'Join the waitlist'}
            </button>
            {error ? <p className="mt-3 text-[12px] font-semibold text-coral-ink" role="alert">{error}</p> : null}
          </form>
        )}

        {openOffers.length > 0 ? (
          <section className="mt-10 border-t border-ink/15 pt-6">
            <h2 className="text-[13px] font-bold">Other jobs still open</h2>
            <div className="mt-3 grid gap-2">
              {openOffers.map((item) => (
                <Link
                  className="flex flex-wrap items-baseline justify-between gap-2 border border-ink/15 bg-surface px-4 py-3 no-underline transition-colors hover:border-ink/40"
                  key={item.id}
                  to={`/offers/${item.slug}`}
                >
                  <span>
                    <span className="block text-[13px] font-bold text-ink">{item.title}</span>
                    <span className="mt-0.5 block text-[11px] text-muted">{item.location} · {item.duration}</span>
                  </span>
                  <span className="text-[12px] font-bold tabular-nums text-ink">{item.price}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </PageFrame>
  )
}
