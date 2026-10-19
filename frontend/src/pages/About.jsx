import { Link } from 'react-router-dom'
import CtaBand from '../components/CtaBand.jsx'
import PageFrame from '../components/PageFrame.jsx'
import PageHero from '../components/PageHero.jsx'
import { button, container, secondaryButton, sectionHeading } from '../lib/ui.js'

const ABOUT_STEPS = [
  ['Pick an offer', 'Open the offers page and compare what each one includes, its price, duration, and how many seats are left. Choose the one that fits your goals.'],
  ['Register and record', 'Fill in the form with your details and upload a 1 to 2 minute voice note telling us about yourself.'],
  ['Get a WhatsApp reply', 'We review every registration and confirm your seat on WhatsApp within [X] hours.'],
]

const RECORDING_PROMPTS = [
  'Your full name.',
  'Why you are interested in the offer.',
  'Your current level and what you hope to achieve.',
  'Anything else you would like us to know.',
]

export default function About() {
  return (
    <PageFrame>
      <main className="pb-12" id="main-content">
        <PageHero
          eyebrow="How it works"
          title="From picking an offer to your first day"
          intro="Three simple steps. No account needed, and your details stay private."
        />

        <section className={container}>
          <div className="grid grid-cols-3 gap-3.5 max-[650px]:grid-cols-1">
            {ABOUT_STEPS.map(([title, text], index) => (
              <article className="rounded-[13px] border border-line bg-white p-5" key={title}>
                <span className="grid size-8 place-items-center rounded-full bg-mint text-sm font-bold tabular-nums text-mint-ink">{index + 1}</span>
                <h2 className="mt-3 text-[15px] font-bold">{title}</h2>
                <p className="mt-2 text-pretty text-[11px] leading-relaxed text-muted">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-14 max-[650px]:mt-10">
          <div className={`${container} max-w-[680px]`}>
            <h2 className={sectionHeading}>What to say in your voice recording</h2>
            <div className="rounded-[13px] border border-dashed border-brand/50 bg-soft p-5">
              <p className="text-xs leading-relaxed text-ink">Record a voice note of 1 to 2 minutes. Please say:</p>
              <ol className="mt-3 grid list-decimal gap-1.5 pl-5 text-xs text-muted marker:text-brand">
                {RECORDING_PROMPTS.map((item) => <li key={item}>{item}</li>)}
              </ol>
              <p className="mt-3 text-xs leading-relaxed text-muted">Speak clearly in a quiet place. Accepted formats: MP3, M4A, WAV. Maximum size: 10&nbsp;MB.</p>
            </div>
          </div>
        </section>

        <CtaBand title="Ready to choose?" text="Browse the offers, then register when you are ready.">
          <Link className={button} to="/offers">Choose an offer</Link>
          <Link className={secondaryButton} to="/contact">Contact us</Link>
        </CtaBand>
      </main>
    </PageFrame>
  )
}
