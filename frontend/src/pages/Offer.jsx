import { Link, useParams } from 'react-router-dom'
import DirectAnswer from '../components/DirectAnswer.jsx'
import FaqList from '../components/FaqList.jsx'
import JobLoading from '../components/JobLoading.jsx'
import PageFrame from '../components/PageFrame.jsx'
import RegistrationForm from '../components/RegistrationForm.jsx'
import Seo from '../components/Seo.jsx'
import ShareJob from '../components/ShareJob.jsx'
import { isClosed, isPaused, isSoldOut, REQUIREMENTS, seatsLeft } from '../data/offers.js'
import { faq } from '../data/site-content.js'
import { useOffers } from '../hooks/useOffers.js'
import { formatDate } from '../lib/format.js'
import { buildFaqPageSchema, buildJobPostingSchema, buildWebPageSchema } from '../lib/seo.js'
import { button, container, sectionHeading } from '../lib/ui.js'
import NotFound from './NotFound.jsx'

function toIso(value) {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function clampDescription(value, max = 160) {
  if (value.length <= max) return value
  const cut = value.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : cut.length).trimEnd()}…`
}

export default function Offer() {
  const { slug } = useParams()
  const { offers, isLoading } = useOffers()
  const offer = offers.find((item) => item.slug === slug)

  // A shared link can arrive before the live offers have loaded. Showing a 404
  // during that gap would be wrong, so wait for the first API answer.
  if (!offer && isLoading) return <JobLoading />

  if (!offer || isClosed(offer)) return <NotFound />

  const paused = isPaused(offer)
  const remaining = seatsLeft(offer)
  const soldOut = !paused && (isSoldOut(offer) || remaining === 0)
  const reference = String(offer.reference ?? offer.id).padStart(2, '0')
  const statusLabel = paused ? 'Registration paused' : soldOut ? 'Applications closed' : `${remaining} places left`
  const path = `/offers/${offer.slug}`
  const seoTitle = clampDescription(`${offer.title} job in ${offer.location} | Al-Tayeb`, 60)
  const statusText = paused ? 'Registration is paused' : soldOut ? 'Applications are closed; join the waitlist' : `${remaining} places left`
  const seoDescription = clampDescription(
    `${offer.title} job in ${offer.location}: ${offer.price} per month, ${offer.duration}. ${statusText}. Egyptian men aged 18–50; National ID required.`,
  )
  const closeText = offer.closes_at
    ? `Applications close on ${formatDate(offer.closes_at)}.`
    : 'Applications stay open while places remain.'
  const directAnswer = paused
    ? `Al-Tayeb has paused applications for the ${offer.title} job in ${offer.location}. The advertised pay is ${offer.price} per month on ${offer.duration}. Egyptian men aged 18–50 with a National ID can apply when the intake reopens; housing is included for relocating workers.`
    : soldOut
      ? `Al-Tayeb has filled all ${offer.seats_total} places for the ${offer.title} job in ${offer.location}. The role pays ${offer.price} per month on ${offer.duration}. Egyptian men aged 18–50 with a National ID can join the waitlist; housing is included for relocating workers when a place opens.`
      : `Al-Tayeb is hiring ${offer.title} workers in ${offer.location}. Pay is ${offer.price} per month on ${offer.duration}. ${remaining} places are open. ${closeText} Egyptian men aged 18–50 with a National ID can apply; housing is included for relocating workers.`

  const schema = [
    buildWebPageSchema({ title: seoTitle, description: seoDescription, path }),
    buildJobPostingSchema(offer, { path }),
    buildFaqPageSchema(faq.slice(0, 3), {
      title: 'Questions about this Al-Tayeb job',
      description: 'Application, eligibility and voice-note answers for this job.',
      path,
    }),
  ].filter(Boolean)

  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Open jobs', path: '/offers' },
    { name: offer.title, path },
  ]

  return (
    <PageFrame>
      <Seo
        breadcrumbs={breadcrumbs}
        description={seoDescription}
        modifiedTime={toIso(offer.updated_at)}
        path={path}
        publishedTime={toIso(offer.created_at)}
        schema={schema}
        title={seoTitle}
        type="article"
      />
      <main className="motion-page pb-0" id="main-content">
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
              <span className={`mono-label ${paused ? 'text-sand-ink' : soldOut ? 'text-coral-strong' : 'text-brand-text'}`}>
                {statusLabel}
              </span>
            </div>
            <h1 className="mt-4 max-w-[18ch] text-balance text-[clamp(36px,5.6vw,60px)] font-extrabold leading-[0.98] tracking-[-0.045em]">
              {offer.title}
            </h1>
            <p className="mt-4 max-w-[62ch] text-pretty text-[16px] leading-[1.65] text-muted">{offer.shortDescription}</p>
          </header>

          <DirectAnswer className="mt-8">{directAnswer}</DirectAnswer>

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

              {offer.included.length > 0 ? (
                <section className="mt-10">
                  <h2 className="text-[20px] font-extrabold tracking-[-0.02em]">What is included</h2>
                  <ul className="mt-4 grid gap-x-8 gap-y-2.5 min-[600px]:grid-cols-2">
                    {offer.included.map((item) => (
                      <li className="flex gap-2.5 text-[13px] leading-relaxed" key={item}>
                        <span aria-hidden="true" className="mt-px grid size-4 shrink-0 place-items-center bg-mint text-[10px] font-bold text-brand-text">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

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
              <div className="border border-ink bg-surface">
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
                    <dd className={`text-right font-semibold ${paused ? 'text-sand-ink' : soldOut ? 'text-coral-strong' : ''}`}>
                      {paused ? 'Paused' : soldOut ? 'Filled' : `${remaining} left`}
                    </dd>
                    <dt className="text-muted">Closes</dt>
                    <dd className="text-right font-semibold">
                      <time dateTime={offer.closes_at}>{formatDate(offer.closes_at)}</time>
                    </dd>
                  </dl>
                  {paused ? (
                    <p className="mt-5 border border-sand-strong/30 bg-sand px-4 py-3 text-center text-[12px] font-bold text-sand-ink" role="status">
                      Registration paused
                    </p>
                  ) : soldOut ? (
                    <Link className={`${button} mt-5 w-full`} to={`/offers/${offer.slug}/waitlist`}>Join the waitlist</Link>
                  ) : (
                    <a className={`${button} mt-5 w-full`} href="#apply">Apply for this job</a>
                  )}
                  <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">
                    {paused ? 'Please check back later for the next intake.' : 'About 3 minutes. We will contact you on WhatsApp.'}
                  </p>
                </div>
              </div>
              <ShareJob offer={offer} />
            </aside>
          </div>
        </div>

        <section className="border-t border-ink/10 bg-surface/45">
          <div className={`${container} max-w-[820px] scroll-mt-6 py-12`} id="apply">
            {paused ? (
              <div className="motion-panel border border-sand-strong/30 bg-sand p-6">
                <h2 className="text-[20px] font-extrabold text-sand-ink">Registration paused</h2>
                <p className="mt-1.5 max-w-[52ch] text-[13px] leading-relaxed text-sand-ink/85">
                  We are not taking new applications or waitlist sign-ups for this job right now. Please check back later.
                </p>
              </div>
            ) : soldOut ? (
              <div className="motion-panel border border-coral-strong/30 bg-coral p-6">
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
