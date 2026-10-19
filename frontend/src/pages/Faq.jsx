import { Link } from 'react-router-dom'
import CtaBand from '../components/CtaBand.jsx'
import FaqList from '../components/FaqList.jsx'
import PageFrame from '../components/PageFrame.jsx'
import PageHero from '../components/PageHero.jsx'
import { faq } from '../data/sample-data.js'
import { button, container, secondaryButton } from '../lib/ui.js'

export default function Faq() {
  return (
    <PageFrame>
      <main className="pb-12" id="main-content">
        <PageHero
          eyebrow="FAQ"
          title="Frequently asked questions"
          intro="Everything you need to know before you register."
        />
        <section className={container}>
          <FaqList items={faq} />
        </section>
        <CtaBand title="Still have a question?" text="Send us a message and we will reply as soon as we can.">
          <Link className={button} to="/contact">Contact us</Link>
          <Link className={secondaryButton} to="/offers">Choose an offer</Link>
        </CtaBand>
      </main>
    </PageFrame>
  )
}
