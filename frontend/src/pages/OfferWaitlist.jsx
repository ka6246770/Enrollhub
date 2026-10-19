import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Field } from '../components/FormField.jsx'
import PageFrame from '../components/PageFrame.jsx'
import { useOffers } from '../hooks/useOffers.js'
import { button, container, secondaryButton } from '../lib/ui.js'
import { joinWaitlist } from '../services/api.js'
import NotFound from './NotFound.jsx'

export default function OfferWaitlist() {
  const { slug } = useParams()
  const [joined, setJoined] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const offers = useOffers()
  const offer = offers.find((item) => item.slug === slug)
  if (!offer) return <NotFound />

  const openOffers = offers.filter((item) => item.id !== offer.id && item.status !== 'soldout')

  async function handleSubmit(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setError('')
    setSending(true)
    try {
      await joinWaitlist({
        name: formData.get('name'),
        phone: formData.get('phone'),
        offerSlug: offer.slug,
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
      <main className={`${container} max-w-[680px] pb-14 pt-9`} id="main-content">
        <Link to="/offers" className="text-xs font-bold text-brand no-underline hover:underline">← All offers</Link>
        <section className="mt-5">
          <p className="inline-flex min-h-6 items-center rounded-full bg-mint px-3 text-[10px] font-bold uppercase tracking-widest text-mint-ink">Offer {offer.id}</p>
          <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight">{offer.title}</h1>
          <p className="mt-3 text-pretty text-sm leading-relaxed text-muted">{offer.description}</p>
          <div className="mt-4 rounded-xl border border-coral-strong/30 bg-coral p-4">
            <h2 className="text-base font-bold text-coral-ink">Sold out</h2>
            <p className="mt-1 text-xs leading-relaxed text-coral-ink">All seats for this offer are taken. Join the waitlist and we will message you on WhatsApp if a seat opens up.</p>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 max-[500px]:grid-cols-1">
            <div className="rounded-xl border border-line bg-white px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Price</p>
              <p className="mt-1 text-lg font-bold">{offer.price}</p>
            </div>
            <div className="rounded-xl border border-line bg-white px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Duration</p>
              <p className="mt-1 text-lg font-bold">{offer.duration}</p>
            </div>
          </div>
          {joined ? (
            <div className="mt-5 rounded-xl bg-soft p-4 text-sm text-ink" role="status">
              <h2 className="font-bold">You’re on the waitlist.</h2>
              <p className="mt-1 text-muted">If a seat opens, we will contact you on WhatsApp.</p>
            </div>
          ) : (
            <form className="mt-6" onSubmit={handleSubmit}>
              <h2 className="text-lg font-bold">Join the waitlist</h2>
              <div className="mt-4 grid gap-4">
                <Field label="Name" name="name" placeholder="Your full name" autoComplete="name" required />
                <Field label="WhatsApp number" name="phone" type="tel" placeholder="+20 1XX XXX XXXX" autoComplete="tel" required />
                <div>
                  <Field label="Email (optional)" name="email" type="email" placeholder="you@example.com" autoComplete="email" />
                  <p className="mt-1.5 text-[11px] leading-relaxed text-muted">Add an address if you would like a confirmation now, and an email if a seat opens.</p>
                </div>
              </div>
              <label className="mt-4 flex items-start gap-2.5 text-xs leading-relaxed text-muted">
                <input className="mt-0.5 accent-brand" type="checkbox" required />
                <span>I agree to be contacted on WhatsApp if a seat opens for this offer.</span>
              </label>
              <button className={`${button} mt-4 w-full`} type="submit" disabled={sending}>
                {sending ? 'Joining…' : 'Join waitlist'}
              </button>
              {error ? <p className="mt-3 text-xs font-semibold text-coral-ink" role="alert">{error}</p> : null}
            </form>
          )}
        </section>
        {openOffers.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xs font-bold">Other offers are still open</h2>
            <div className="mt-3 grid gap-2">
              {openOffers.map((item) => (
                <Link className={`${secondaryButton} w-full`} key={item.id} to={`/offers/${item.slug}`}>See Offer {item.id}</Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </PageFrame>
  )
}
