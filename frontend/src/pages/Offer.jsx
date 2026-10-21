import { Link, useParams } from 'react-router-dom'
import FaqList from '../components/FaqList.jsx'
import PageFrame from '../components/PageFrame.jsx'
import RegistrationForm from '../components/RegistrationForm.jsx'
import { REQUIREMENTS, seatsLeft } from '../data/offers.js'
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
  const reference = String(offer.reference ?? offer.id).padStart(2, '0')

  return (
    <PageFrame>
      <main className="pb-0" id="main-content">
        <div className={container}>
          <Link className="inline-flex items-center gap-2 pt-8 text-[12px] font-bold text-muted no-underline hover:text-ink" to="/offers">
            <span aria-hidden="true">←</span> All jobs
          </Link>

          <header className="mt-6 border-b border-ink/15 pb-8">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="mono-label text-muted">Ref {reference}</span>
              <span aria-hidden="true" className="mono-label text-ink/30">/</span>
              <span className="mono-label text-ink">{offer.location}</span>
              <span aria-hidden="true" className="mono-label text-ink/30">/</span>
              <span className={`mono-label ${soldOut ? 'text-coral-strong' : 'text-brand'}`}>
                {soldOut ? 'Applications closed' : `${remaining} places left`}
              </span>
            </div>
            <h1 className="mt-4 max-w-[18ch] text-balance text-[clamp(36px,5.6vw,60px)] font-extrabold leading-[0.98] tracking-[-0.045em]">
              {offer.title}
            </h1>
            <p className="mt-4 max-w-[62ch] text-pretty text-[16px] leading-[1.65] text-muted">{offer.shortDescription}</p>
          </header>

          <div className="grid gap-10 py-10 min-[900px]:grid-cols-[1.35fr_0.65fr] min-[900px]:gap-14">
            <div>
              <section>
                <h2 className="text-[20px] font-extrabold tracking-[-0.02em]">About the job</h2>
                <div className="mt-3 max-w-[68ch] space-y-3.5 text-[14px] leading-[1.75] text-ink/85">
                  {offer.description.split('\n\n').map((paragraph) => (
                    <p className="whitespace-pre-line" key={paragraph.slice(0, 40)}>{paragraph}</p>
                  ))}
                </div>
              </section>

              <section className="mt-10">
                <h2 className="text-[20px] font-extrabold tracking-[-0.02em]">What is included</h2>
                <ul className="mt-4 grid gap-x-8 gap-y-2.5 min-[600px]:grid-cols-2">
                  {offer.included.map((item) => (
                    <li className="flex gap-2.5 text-[13px] leading-relaxed" key={item}>
                      <span aria-hidden="true" className="mt-px grid size-4 shrink-0 place-items-center bg-mint text-[10px] font-bold text-brand">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="mt-10 border-t border-ink/15 pt-6">
                <h2 className="text-[20px] font-extrabold tracking-[-0.02em]">Who can apply</h2>
                <ul className="mt-4 grid gap-2.5 min-[600px]:grid-cols-2">
                  {REQUIREMENTS.map((item) => (
                    <li className="flex gap-2.5 text-[13px] leading-relaxed" key={item}>
                      <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 bg-accent" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-[12px] leading-relaxed text-muted">Bring your National ID. It is the only document required.</p>
              </section>
            </div>

            <aside className="max-[899px]:order-first min-[900px]:sticky min-[900px]:top-6 min-[900px]:self-start">
              <div className="border border-ink bg-white">
                <div className="flex items-center justify-between border-b border-dashed border-ink/25 px-5 py-3">
                  <span className="mono-label text-muted">Job ticket</span>
                  <span className="mono-label text-ink">{reference}</span>
                </div>
                <div className="px-5 py-5">
                  <p className="mono-label text-muted">Pay per month</p>
                  <p className="mt-1 text-[32px] font-extrabold leading-none tracking-[-0.035em] tabular-nums">{offer.price}</p>
                  <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 border-t border-ink/10 pt-4 text-[12px]">
                    <dt className="text-muted">City</dt>
                    <dd className="text-right font-semibold">{offer.location}</dd>
                    <dt className="text-muted">Shift</dt>
                    <dd className="text-right font-semibold">{offer.duration}</dd>
                    <dt className="text-muted">Places</dt>
                    <dd className={`text-right font-semibold ${soldOut ? 'text-coral-strong' : ''}`}>{soldOut ? 'Filled' : `${remaining} left`}</dd>
                    <dt className="text-muted">Closes</dt>
                    <dd className="text-right font-semibold">{formatDate(offer.closes_at)}</dd>
                  </dl>
                  {soldOut ? (
                    <Link className={`${button} mt-5 w-full`} to={`/offers/${offer.slug}/waitlist`}>Join the waitlist</Link>
                  ) : (
                    <a className={`${button} mt-5 w-full`} href="#apply">Apply for this job</a>
                  )}
                  <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">About 3 minutes. We reply on WhatsApp.</p>
                </div>
              </div>
            </aside>
          </div>
        </div>

        <section className="border-t border-ink/10 bg-white/45">
          <div className={`${container} max-w-[820px] scroll-mt-6 py-12`} id="apply">
            {soldOut ? (
              <div className="border border-coral-strong/30 bg-coral p-6">
                <h2 className="text-[20px] font-extrabold text-coral-ink">This job is full</h2>
                <p className="mt-1.5 max-w-[52ch] text-[13px] leading-relaxed text-coral-ink">
                  Applications are closed for now. Join the waitlist and we will message you on WhatsApp if a place opens.
                </p>
                <Link className={`${button} mt-4`} to={`/offers/${offer.slug}/waitlist`}>Join the waitlist</Link>
              </div>
            ) : (
              <RegistrationForm offer={offer} />
            )}

            <section className="mt-12">
              <h2 className={sectionHeading}>Questions</h2>
              <FaqList className="mt-4 border-t border-ink/15" items={faq.slice(0, 3)} />
            </section>
          </div>
        </section>
      </main>
    </PageFrame>
  )
}
