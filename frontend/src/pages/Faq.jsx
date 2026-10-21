import { Link } from 'react-router-dom'
import CtaBand from '../components/CtaBand.jsx'
import FaqList from '../components/FaqList.jsx'
import PageFrame from '../components/PageFrame.jsx'
import PageHero from '../components/PageHero.jsx'
import { faq } from '../data/sample-data.js'
import { button, container, secondaryOnDark } from '../lib/ui.js'

export default function Faq() {
  return (
    <PageFrame>
      <main className="pb-0" id="main-content">
        <PageHero
          eyebrow="FAQ"
          title="Questions, answered."
          intro="Pay, shifts, housing, documents — everything people ask before they apply."
        />

        <section className={`${container} max-w-[880px]`}>
          <FaqList items={faq} />
          <p className="mt-5 max-w-[62ch] text-[12px] leading-relaxed text-muted">
            Still unsure about a job? Open its page — the shift, city, pay and what comes with the room are all listed there. You can also contact us directly.
          </p>
        </section>

        <CtaBand title="No answer here?" text="Send us a message and we will reply as soon as we can.">
          <Link className={button} to="/contact">Contact us</Link>
          <Link className={secondaryOnDark} to="/offers">See the open jobs</Link>
        </CtaBand>
      </main>
    </PageFrame>
  )
}
