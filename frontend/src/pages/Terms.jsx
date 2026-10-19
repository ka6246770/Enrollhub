import PageFrame from '../components/PageFrame.jsx'
import { container } from '../lib/ui.js'

const SECTIONS = [
  ['Using this website', 'Use this website to review available offers and submit accurate registration or waitlist information.'],
  ['Registration and availability', 'Submitting a registration does not guarantee a seat. We will contact you to confirm the outcome. Seats are subject to availability and the stated closing date.'],
  ['Your information and recording', 'By submitting the form, you confirm that the information and voice recording are yours to provide and agree to the consent statement shown with the form.'],
  ['Contact', 'Questions about these terms can be sent to [SUPPORT EMAIL].'],
]

export default function Terms() {
  return (
    <PageFrame>
      <main className={`${container} max-w-[760px] py-12`} id="main-content">
        <span className="text-[10px] font-bold uppercase tracking-widest text-mint-ink">Legal</span>
        <h1 className="mt-2 text-balance text-3xl font-bold">Terms of Use</h1>
        <p className="mt-3 text-sm text-muted">Draft terms — replace placeholders and have these terms reviewed before publishing.</p>
        <div className="mt-7 grid gap-5">
          {SECTIONS.map(([title, text]) => (
            <section className="rounded-xl border border-line bg-white p-5" key={title}>
              <h2 className="font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
            </section>
          ))}
        </div>
      </main>
    </PageFrame>
  )
}
