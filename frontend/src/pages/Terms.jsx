import PageFrame from '../components/PageFrame.jsx'
import { container } from '../lib/ui.js'

const SECTIONS = [
  ['Using this website', 'Use this website to review open jobs and submit accurate application or waitlist information. Do not submit another person’s details without their permission.'],
  ['Applications and availability', 'Submitting an application does not guarantee a job. The factory makes the final decision, and places are subject to availability and the stated closing date.'],
  ['Pay and benefits', 'Pay figures, shift lengths and benefits are supplied by the employer. The contract you sign with the factory is the final agreement.'],
  ['Your information and recording', 'By submitting the form, you confirm that the information and voice recording are yours to provide, and you agree to the consent statement shown with the form.'],
  ['Contact', 'Questions about these terms can be sent to [SUPPORT EMAIL] or [WHATSAPP NUMBER].'],
]

export default function Terms() {
  return (
    <PageFrame>
      <main className={`${container} max-w-[760px] pb-14 pt-12`} id="main-content">
        <p className="mono-label text-accent">Legal</p>
        <h1 className="mt-3 text-balance text-[clamp(32px,4.5vw,44px)] font-extrabold leading-[1.02] tracking-[-0.035em]">Terms of use</h1>
        <p className="mt-3 max-w-[56ch] text-[14px] leading-relaxed text-muted">
          Draft terms — replace the placeholders and have these terms reviewed before publishing.
        </p>
        <div className="mt-8 border-t border-ink/15">
          {SECTIONS.map(([title, text]) => (
            <section className="border-b border-ink/15 py-5" key={title}>
              <h2 className="text-[15px] font-bold">{title}</h2>
              <p className="mt-2 max-w-[66ch] text-[14px] leading-[1.75] text-muted">{text}</p>
            </section>
          ))}
        </div>
        <p className="mt-5 text-[11px] text-muted">Last updated: [DATE]</p>
      </main>
    </PageFrame>
  )
}
