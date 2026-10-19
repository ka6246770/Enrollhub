import { Link } from 'react-router-dom'
import OfferCard from '../components/OfferCard.jsx'
import PageFrame from '../components/PageFrame.jsx'
import PageHero from '../components/PageHero.jsx'
import { HOW_IT_WORKS_STEPS } from '../data/sample-data.js'
import { useOffers } from '../hooks/useOffers.js'
import { container, secondaryButton, sectionHeading } from '../lib/ui.js'

export default function AllOffers() {
  const offers = useOffers()
  const openCount = offers.filter((offer) => offer.status !== 'soldout').length

  return (
    <PageFrame>
      <main className="pb-12" id="main-content">
        <PageHero
          eyebrow="Offers"
          title="All offers"
          intro={`${openCount} of ${offers.length} offers are open for registration. Every offer uses the same simple form and a 1 to 2 minute voice note.`}
        />
        <section className={container}>
          <div className="grid grid-cols-3 gap-3.5 max-[650px]:grid-cols-1">
            {offers.map((offer) => <OfferCard key={offer.id} offer={offer} />)}
          </div>
        </section>
        <section className="mt-14 max-[650px]:mt-10">
          <div className={container}>
            <h2 className={sectionHeading}>How it works</h2>
            <div className="grid grid-cols-3 gap-3.5 max-[650px]:grid-cols-1">
              {HOW_IT_WORKS_STEPS.map(([title, text], index) => (
                <article className="rounded-[13px] bg-soft p-4" key={title}>
                  <h3 className="mb-2 text-[13px] font-bold">{index + 1}. {title}</h3>
                  <p className="text-pretty text-[11px] leading-relaxed text-muted">{text}</p>
                </article>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link className={secondaryButton} to="/about">How it works in detail</Link>
              <Link className={secondaryButton} to="/faq">Read the FAQ</Link>
            </div>
          </div>
        </section>
      </main>
    </PageFrame>
  )
}
