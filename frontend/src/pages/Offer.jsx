import { Link, useParams } from 'react-router-dom'
import FaqList from '../components/FaqList.jsx'
import PageFrame from '../components/PageFrame.jsx'
import RegistrationForm from '../components/RegistrationForm.jsx'
import { seatsLeft } from '../data/offers.js'
import { faq } from '../data/sample-data.js'
import { useOffers } from '../hooks/useOffers.js'
import { formatDate } from '../lib/format.js'
import { button, container, sectionHeading } from '../lib/ui.js'
import NotFound from './NotFound.jsx'

export default function Offer() {
  const { slug } = useParams()
  const offers = useOffers()
  const offer = offers.find((item) => item.slug === slug)
  if (!offer) return <NotFound />

  const remaining = seatsLeft(offer)
  const soldOut = remaining === 0 || offer.status === 'soldout'

  return (
    <PageFrame>
      <main className={`${container} max-w-[680px] pb-14 pt-9`} id="main-content">
        <Link to="/offers" className="text-xs font-bold text-brand no-underline hover:underline">← All offers</Link>
        <section className="mt-5">
          <p className="inline-flex min-h-6 items-center rounded-full bg-mint px-3 text-[10px] font-bold uppercase tracking-widest text-mint-ink">Offer {offer.id}</p>
          <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight">{offer.title}</h1>
          <p className="mt-3 text-pretty text-sm leading-relaxed text-muted">{offer.description}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1.5 text-[11px] font-bold tabular-nums ${soldOut ? 'bg-coral text-coral-ink' : 'bg-sand text-sand-ink'}`}>
              {soldOut ? 'Sold out' : `${remaining} seats left`}
            </span>
            <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-muted">Closes {formatDate(offer.closes_at)}</span>
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
          <ul className="mt-5 grid list-disc gap-2 pl-5 text-sm text-muted marker:text-brand">
            {offer.included.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>

        {soldOut ? (
          <section className="mt-8 rounded-2xl border border-coral-strong/30 bg-coral p-6">
            <h2 className="text-lg font-bold text-coral-ink">All seats are taken</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-coral-ink">
              Registration for this offer is closed. Join the waitlist and we will message you if a seat opens up.
            </p>
            <Link className={`${button} mt-4 w-full no-underline`} to={`/offers/${offer.slug}/waitlist`}>Join the waitlist</Link>
          </section>
        ) : (
          <RegistrationForm offer={offer} />
        )}

        <section className="mt-8">
          <h2 className={sectionHeading}>Questions</h2>
          <FaqList items={faq.slice(0, 2)} className="grid gap-2" />
        </section>
      </main>
    </PageFrame>
  )
}
