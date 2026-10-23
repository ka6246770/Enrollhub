import { Link } from 'react-router-dom'
import PageFrame from '../components/PageFrame.jsx'
import { container } from '../lib/ui.js'

const SECTIONS = [
  [
    'Using this website',
    'Use this website to review open jobs and submit accurate application or waitlist information. Do not submit another person’s details without their permission, and do not upload a recording that is not your own voice.',
  ],
  [
    'Applications and availability',
    'Submitting an application does not guarantee a job. The employer makes the final decision, and places are subject to availability and the job’s closing date. A place is confirmed only after you accept an offer through your private status link.',
  ],
  [
    'Pay, benefits and the contract',
    'Pay figures, shift lengths and benefits are supplied by the employer and may change before a contract is signed. The contract you sign with the factory is the final agreement; this website does not create an employment contract.',
  ],
  [
    'Your information and recording',
    'By submitting the form, you confirm that the information and voice recording are yours to provide, and you agree to the consent statement shown with the form. Read the privacy policy for how long details and recordings are kept and how to ask for deletion.',
  ],
  [
    'Private status links',
    'Your status link is a private credential. Anyone who has it can see your status and, when a place is offered, accept or decline it. Do not forward it. If you think someone else has opened it, contact us so we can help.',
  ],
  [
    'Waitlist places',
    'Joining a waitlist does not reserve a place. If a place opens, we may contact more than one person and each person must accept independently. The place is confirmed only when one person accepts through their private link.',
  ],
  [
    'Changes to these terms',
    'We may update these terms when the service or the law changes. The date below shows when this version was published. Continuing to use the site after an update means you accept the current terms.',
  ],
]

export default function Terms() {
  return (
    <PageFrame>
      <main className={`${container} motion-page max-w-[760px] pb-14 pt-12`} id="main-content">
        <p className="mono-label text-accent-text">Legal</p>
        <h1 className="mt-3 text-balance text-[clamp(32px,4.5vw,44px)] font-extrabold leading-[1.02] tracking-[-0.035em]">Terms of use</h1>
        <p className="mt-3 max-w-[56ch] text-[14px] leading-relaxed text-muted">
          The rules for using this recruitment site and the application process.
        </p>
        <div className="mt-8 border-t border-ink/15">
          {SECTIONS.map(([title, text]) => (
            <section className="border-b border-ink/15 py-5" key={title}>
              <h2 className="text-[15px] font-bold">{title}</h2>
              <p className="mt-2 max-w-[66ch] text-[14px] leading-[1.75] text-muted">{text}</p>
            </section>
          ))}
        </div>
        <p className="mt-5 text-[13px] leading-relaxed text-muted">
          Questions about these terms? Use the <Link className="font-bold text-brand-text underline" to="/contact">contact page</Link>.
        </p>
        <p className="mt-3 text-[11px] text-muted">Last updated: <time dateTime="2026-10-21">21 October 2026</time></p>
      </main>
    </PageFrame>
  )
}
