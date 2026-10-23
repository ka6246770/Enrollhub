import { Link } from 'react-router-dom'
import DirectAnswer from '../components/DirectAnswer.jsx'
import FaqList from '../components/FaqList.jsx'
import OfferCard from '../components/OfferCard.jsx'
import PageFrame from '../components/PageFrame.jsx'
import { Kicker } from '../components/PageHero.jsx'
import { isClosed, isOpen } from '../data/offers.js'
import { faq, HOW_IT_WORKS_STEPS } from '../data/sample-data.js'
import { useOffers } from '../hooks/useOffers.js'
import { button, container, secondaryButton, sectionHeading } from '../lib/ui.js'

const BENEFITS = [
  ['Housing', 'A place to stay for anyone relocating. Every job includes it.'],
  ['Transport', 'Buses between the accommodation and the factory on most jobs.'],
  ['Meals', 'Subsidized meals or a daily dry meal, depending on the factory.'],
  ['Advances', 'Daily or weekly salary advances, starting within your first days.'],
]

export default function Welcome() {
  const { offers } = useOffers()
  const visible = offers.filter((offer) => !isClosed(offer))
  const open = visible.filter(isOpen)

  return (
    <PageFrame>
      <main className="motion-page pb-0" id="main-content">
        <section className="border-b border-ink/10">
          <div className={`${container} grid gap-10 py-14 min-[900px]:grid-cols-[1.35fr_1fr] min-[900px]:gap-14 min-[900px]:py-20`}>
            <div>
              <Kicker>Hiring in Sadat City, El-Obour and 10th of Ramadan</Kicker>
              <h1 className="mt-6 max-w-[13ch] text-balance text-[clamp(42px,7vw,76px)] font-extrabold leading-[0.96] tracking-[-0.05em]">
                Factory work. Housing included.
              </h1>
              <p className="mt-6 max-w-[52ch] text-pretty text-[16px] leading-[1.65] text-muted">
                Packaging, labeling and steward jobs across three cities. Salaries from 6,600 to 11,400 EGP a month, with housing included on every job.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link className={button} to="/offers">See the open jobs</Link>
                <Link className={secondaryButton} to="/about">How it works</Link>
              </div>
              <p className="mt-6 text-[12px] font-semibold text-muted">National ID only. Open to Egyptian nationals.</p>
            </div>

            <aside className="self-start border border-ink bg-night text-night-ink">
              <div className="flex items-center justify-between border-b border-white/15 px-5 py-3">
                <span className="mono-label text-night-muted">Now hiring</span>
                <span className="mono-label text-white">{open.length} {open.length === 1 ? 'job' : 'jobs'}</span>
              </div>
              <div>
                {open.length === 0 ? (
                  <p className="px-5 py-4 text-[12px] text-night-muted">No jobs are taking applications right now. Check back soon.</p>
                ) : open.map((offer) => (
                  <Link
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-white/10 px-5 py-4 no-underline transition-colors last:border-b-0 hover:bg-white/5 motion-reduce:transition-none"
                    key={offer.id}
                    to={`/offers/${offer.slug}`}
                  >
                    <span className="mono-label text-night-muted">{String(offer.reference ?? offer.id).padStart(2, '0')}</span>
                    <span>
                      <span className="block text-[15px] font-bold leading-tight text-white">{offer.title}</span>
                      <span className="mt-1 block text-[12px] text-night-muted">{offer.location} · {offer.duration}</span>
                    </span>
                    <span className="whitespace-nowrap text-right text-[13px] font-bold tabular-nums text-night-ink">{offer.price}</span>
                  </Link>
                ))}
              </div>
              <div className="border-t border-white/15 px-5 py-3">
                <Link className="inline-flex min-h-6 items-center text-[12px] font-bold text-white underline underline-offset-4 hover:no-underline" to="/offers">Compare all jobs</Link>
              </div>
            </aside>
          </div>
        </section>

        <div className={`${container} pt-10`}>
          <DirectAnswer>
            Al-Tayeb Company is hiring packaging, labeling and steward workers in Sadat City, El-Obour and 10th of Ramadan City. Monthly pay ranges from 6,600 to 11,400 EGP. Roles are open to Egyptian men aged 18–50 with a National ID. Housing is included for workers who relocate.
          </DirectAnswer>
        </div>

        <section className={`${container} py-14`} id="jobs">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className={sectionHeading}>Current jobs</h2>
              <p className="mt-2 max-w-[52ch] text-[14px] text-muted">Every job uses the same short application and a voice note.</p>
            </div>
            <Link className="inline-flex min-h-6 items-center text-[12px] font-bold text-brand-text underline underline-offset-4 hover:no-underline" to="/offers">See all {visible.length} jobs</Link>
          </div>
          <div className="motion-stagger mt-7 grid gap-4 min-[640px]:grid-cols-2 min-[1100px]:grid-cols-4">
            {visible.map((offer) => <OfferCard key={offer.id} offer={offer} />)}
          </div>
        </section>

        <section className="bg-night text-night-ink">
          <div className={`${container} py-14`}>
            <h2 className="max-w-[26ch] text-[clamp(26px,3.6vw,40px)] font-extrabold leading-[1.02] tracking-[-0.035em]">
              More than a salary.
            </h2>
            <p className="mt-3 max-w-[54ch] text-[14px] leading-[1.65] text-night-muted">
              What comes with the job depends on the factory. Open a job to see the exact package.
            </p>
            <div className="mt-8 grid gap-x-8 gap-y-7 min-[700px]:grid-cols-2 min-[1000px]:grid-cols-4">
              {BENEFITS.map(([title, text]) => (
                <div className="border-t border-white/20 pt-4" key={title}>
                  <h3 className="text-[15px] font-bold">{title}</h3>
                  <p className="mt-1.5 max-w-[34ch] text-[13px] leading-[1.65] text-night-muted">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={`${container} py-14`}>
          <h2 className={sectionHeading}>How it works</h2>
          <div className="mt-7 grid gap-6 min-[760px]:grid-cols-3 min-[760px]:gap-8">
            {HOW_IT_WORKS_STEPS.map(([title, text], index) => (
              <article className="border-t border-ink/20 pt-4" key={title}>
                <span className="mono-label text-accent-text">Step {index + 1}</span>
                <h3 className="mt-2 text-[17px] font-bold">{title}</h3>
                <p className="mt-1.5 text-[13px] leading-[1.65] text-muted">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={`${container} grid gap-10 pb-4 min-[900px]:grid-cols-[0.8fr_1.2fr] min-[900px]:gap-16`} id="faq">
          <div>
            <h2 className={sectionHeading}>Questions before you apply</h2>
            <p className="mt-3 max-w-[34ch] text-[14px] leading-[1.65] text-muted">The things people ask us on the phone, answered here first.</p>
            <Link className="mt-5 inline-flex min-h-6 items-center text-[12px] font-bold text-brand-text underline underline-offset-4 hover:no-underline" to="/faq">All questions</Link>
          </div>
          <FaqList items={faq.slice(0, 4)} />
        </section>

        <section className="mt-14 bg-action text-white">
          <div className={`${container} flex flex-wrap items-center justify-between gap-6 py-10`}>
            <div>
              <h2 className="text-[clamp(26px,3.4vw,38px)] font-extrabold leading-[1.02] tracking-[-0.035em]">Ready for your next shift?</h2>
              <p className="mt-2 max-w-[46ch] text-[14px] text-white">
                {open.length > 0
                  ? `${open.length} ${open.length === 1 ? 'job is' : 'jobs are'} open now. Applying takes about three minutes.`
                  : 'No jobs are taking applications right now. Check back soon for the next intake.'}
              </p>
            </div>
            <Link className="inline-flex min-h-11 items-center justify-center rounded-[4px] border border-white bg-white px-5 text-[13px] font-bold text-night no-underline transition-colors hover:border-night hover:bg-night hover:text-white" to="/offers">
              See the open jobs
            </Link>
          </div>
        </section>
      </main>
    </PageFrame>
  )
}
