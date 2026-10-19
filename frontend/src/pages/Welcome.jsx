import { Link } from 'react-router-dom'
import FaqList from '../components/FaqList.jsx'
import OfferCard from '../components/OfferCard.jsx'
import PageFrame from '../components/PageFrame.jsx'
import { Eyebrow } from '../components/PageHero.jsx'
import { faq, HOW_IT_WORKS_STEPS, testimonials } from '../data/sample-data.js'
import { useOffers } from '../hooks/useOffers.js'
import { button, container, secondaryButton, sectionHeading } from '../lib/ui.js'

export default function Welcome() {
  const offers = useOffers()

  return (
    <PageFrame>
      <main className="pb-12" id="main-content">
        <section className={`${container} pb-11 pt-[52px] max-[650px]:pb-9 max-[650px]:pt-[38px]`}>
          <Eyebrow>Welcome</Eyebrow>
          <h1 className="mt-3 max-w-[700px] text-balance text-[clamp(30px,5vw,42px)] font-bold leading-[1.12] tracking-[-0.035em]">
            [WELCOME HEADLINE]
          </h1>
          <p className="mt-3.5 max-w-[490px] text-pretty text-[13px] leading-[1.65] text-muted">
            [WELCOME TEXT: one or two sentences explaining what you offer and what happens after someone registers.]
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className={button} to="/offers">Choose an offer</Link>
            <Link className={secondaryButton} to="/admin/login">Team sign in</Link>
          </div>
        </section>

        <section className={container} id="offers">
          <h2 className={sectionHeading}>Choose your offer</h2>
          <div className="grid grid-cols-3 gap-3.5 max-[650px]:grid-cols-1">
            {offers.map((offer) => <OfferCard key={offer.id} offer={offer} />)}
          </div>
          <div className="mt-4">
            <Link className={secondaryButton} to="/offers">See all offers</Link>
          </div>
        </section>

        <section className="mt-14 max-[650px]:mt-10" id="how-it-works">
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
          </div>
        </section>

        <section className="mt-14 max-[650px]:mt-10">
          <div className={container}>
            <h2 className={sectionHeading}>What people say</h2>
            <div className="grid grid-cols-3 gap-3.5 max-[650px]:grid-cols-1">
              {testimonials.map((testimonial, index) => (
                <figure className="rounded-[13px] border border-line bg-white p-4" key={index}>
                  <blockquote className="text-[11px] leading-relaxed text-muted">{testimonial.quote}</blockquote>
                  <figcaption className="mt-2.5 text-[10px] font-bold">{testimonial.author}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-14 max-[650px]:mt-10" id="faq">
          <div className={container}>
            <h2 className={sectionHeading}>Frequently asked questions</h2>
            <FaqList items={faq} />
          </div>
        </section>
      </main>
    </PageFrame>
  )
}
