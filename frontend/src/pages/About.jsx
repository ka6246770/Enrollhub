import { Link } from 'react-router-dom'
import CtaBand from '../components/CtaBand.jsx'
import DirectAnswer from '../components/DirectAnswer.jsx'
import PageFrame from '../components/PageFrame.jsx'
import PageHero from '../components/PageHero.jsx'
import { REQUIREMENTS } from '../data/offers.js'
import { HOW_IT_WORKS_STEPS } from '../data/site-content.js'
import { button, container, secondaryOnDark, sectionHeading } from '../lib/ui.js'

const RECORDING_PROMPTS = [
  'Your full name, and how old you are.',
  'The city or governorate you live in now.',
  'Any factory, warehouse or packaging work you have done.',
  'When you can start — and whether you need housing.',
]

export default function About() {
  return (
    <PageFrame>
      <main className="motion-page pb-0" id="main-content">
        <PageHero
          eyebrow="How it works"
          title="Three steps. No CV, no account."
          intro="The whole application takes about three minutes. You will know what happens next before you close the page."
        />

        <section className={container}>
          <DirectAnswer className="mb-10">
            Applying to Al-Tayeb takes about three minutes and needs no CV or account. You choose a job, enter your details, and record a one-to-two-minute voice note covering your name, age, city, work history and start date. Egyptian men aged 18–50 can apply with a National ID.
          </DirectAnswer>

          <div className="grid gap-7 min-[760px]:grid-cols-3 min-[760px]:gap-8">
            {HOW_IT_WORKS_STEPS.map(([title, text], index) => (
              <article className="border-t border-ink/20 pt-4" key={title}>
                <span className="mono-label text-accent-text">Step {String(index + 1).padStart(2, '0')}</span>
                <h2 className="mt-2 text-[19px] font-extrabold tracking-[-0.02em]">{title}</h2>
                <p className="mt-2 text-[13px] leading-[1.7] text-muted">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={`${container} mt-14 grid gap-8 min-[850px]:grid-cols-[0.8fr_1.2fr] min-[850px]:gap-14`}>
          <div>
            <h2 className={sectionHeading}>What to say in your voice note</h2>
            <p className="mt-3 max-w-[36ch] text-[14px] leading-[1.7] text-muted">
              It is not an interview. We only need to hear your voice, confirm your details, and pass the right notes to the factory.
            </p>
          </div>
          <div className="border border-dashed border-ink/30 bg-surface p-5">
            <p className="mono-label text-muted">Record 1 to 2 minutes</p>
            <ol className="mt-4 grid gap-3">
              {RECORDING_PROMPTS.map((prompt, index) => (
                <li className="flex gap-3 text-[14px] leading-relaxed" key={prompt}>
                  <span aria-hidden="true" className="mono-label mt-1 text-brand-text">{String(index + 1).padStart(2, '0')}</span>
                  {prompt}
                </li>
              ))}
            </ol>
            <p className="mt-5 border-t border-ink/10 pt-4 text-[12px] leading-relaxed text-muted">
              Speak clearly in a quiet place. MP3, M4A or WAV, up to 10&nbsp;MB. You can preview the recording before you send it.
            </p>
          </div>
        </section>

        <section className={`${container} mt-14`}>
          <h2 className={sectionHeading}>What you need</h2>
          <ul className="mt-5 grid gap-x-8 gap-y-3 border-t border-ink/15 pt-5 min-[600px]:grid-cols-2 min-[1000px]:grid-cols-4">
            {REQUIREMENTS.map((item) => (
              <li className="flex gap-2.5 text-[13px] leading-relaxed" key={item}>
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 bg-accent" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 max-w-[64ch] text-[12px] leading-relaxed text-muted">
            These roles are for men aged 18 to 50, and they are open to Egyptian nationals only. If a job asks for a haircut and a trimmed beard before the first shift, it will say so in the job details.
          </p>
        </section>

        <CtaBand title="Ready to apply?" text="Browse the jobs, compare the pay and the housing, then send one application.">
          <Link className={button} to="/offers">See the open jobs</Link>
          <Link className={secondaryOnDark} to="/contact">Contact us</Link>
        </CtaBand>
      </main>
    </PageFrame>
  )
}
