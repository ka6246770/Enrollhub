import { Link } from 'react-router-dom'
import CtaBand from '../components/CtaBand.jsx'
import DirectAnswer from '../components/DirectAnswer.jsx'
import FaqList from '../components/FaqList.jsx'
import PageFrame from '../components/PageFrame.jsx'
import PageHero from '../components/PageHero.jsx'
import { site } from '../config/site.js'
import { faq } from '../data/site-content.js'
import { formatDate } from '../lib/format.js'
import { button, container, secondaryOnDark, sectionHeading } from '../lib/ui.js'

export default function Faq() {
  return (
    <PageFrame>
      <main className="motion-page pb-0" id="main-content">
        <PageHero
          eyebrow="FAQ"
          title="Questions, answered."
          intro="Pay, shifts, housing, documents — everything people ask before they apply."
        />

        <section aria-labelledby="faq-heading" className={`${container} max-w-[880px]`}>
          <DirectAnswer>
            Al-Tayeb factory jobs take about three minutes to apply for and require a one-to-two-minute voice note plus a National ID. Roles are open to Egyptian men aged 18–50. Pay ranges from 6,600 to 11,400 EGP per month, shifts are 8 or 12 hours, and housing is included for relocating workers.
          </DirectAnswer>

          <div className="mt-10">
            <h2 className={sectionHeading} id="faq-heading">Common questions about Al-Tayeb factory jobs</h2>
            <p className="mt-2 max-w-[62ch] text-[14px] leading-[1.65] text-muted">
              Ten answers about pay, shifts, housing, documents and eligibility, drawn from the current job listings.
            </p>
            <FaqList className="mt-5 border-t border-ink/15" items={faq} />
          </div>

          <p className="mt-5 max-w-[62ch] text-[12px] leading-relaxed text-muted">
            Still unsure about a job? Open its page — the shift, city, pay and what comes with the room are all listed there. You can also contact us directly.
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            Reviewed <time dateTime={site.content.modifiedAt}>{formatDate(site.content.modifiedAt)}</time>. Pay and eligibility details are checked against the current job listings.
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
