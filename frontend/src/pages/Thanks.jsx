import { Link, useLocation } from 'react-router-dom'
import Brand from '../components/Brand.jsx'
import { button, container } from '../lib/ui.js'

export default function Thanks() {
  const location = useLocation()
  const name = location.state?.name || '[NAME]'
  const phone = location.state?.phone || '[PHONE]'
  const offerTitle = location.state?.offerTitle || '[JOB TITLE]'
  const steps = [
    ['Check WhatsApp', `We will message ${phone} within [X] hours.`],
    ['Keep your phone on', 'We may ask a few questions before we confirm your place.'],
    ['Wait for your start date', 'Your shift, factory and start date will be in the confirmation message.'],
  ]

  return (
    <main className="min-h-screen bg-page">
      <header className="bg-night">
        <div className={`${container} flex min-h-[68px] items-center justify-between gap-4 py-3`}>
          <Brand />
          <Link className="text-[12px] font-semibold text-night-ink/70 no-underline hover:text-white" to="/offers">Back to jobs</Link>
        </div>
      </header>

      <div className="mx-auto w-[min(100%-32px,640px)] py-12 max-[500px]:py-9">
        <p className="mono-label text-brand">Application received</p>
        <h1 className="mt-3 text-balance text-[clamp(34px,5.4vw,48px)] font-extrabold leading-[1.0] tracking-[-0.04em]">
          Thank you, {name}.
        </h1>
        <p className="mt-4 max-w-[52ch] text-pretty text-[15px] leading-[1.7] text-muted">
          Your application for {offerTitle} is with our team. Here is what happens next.
        </p>

        <div className="mt-7 border border-ink bg-white">
          <div className="flex items-center justify-between border-b border-dashed border-ink/25 px-5 py-3">
            <span className="mono-label text-muted">Application receipt</span>
            <span className="mono-label text-brand">Received</span>
          </div>
          <dl className="grid grid-cols-[88px_1fr] gap-x-4 gap-y-2.5 px-5 py-4 text-[12px]">
            <dt className="text-muted">Applicant</dt>
            <dd className="font-semibold">{name}</dd>
            <dt className="text-muted">Job</dt>
            <dd className="font-semibold">{offerTitle}</dd>
            <dt className="text-muted">WhatsApp</dt>
            <dd className="font-semibold tabular-nums">{phone}</dd>
          </dl>
          <ol className="grid gap-4 border-t border-ink/10 px-5 py-5">
            {steps.map(([title, description], index) => (
              <li className="flex gap-3" key={title}>
                <span aria-hidden="true" className="mono-label grid size-6 shrink-0 place-items-center bg-ink text-white">{index + 1}</span>
                <div>
                  <h2 className="text-[14px] font-bold leading-snug">{title}</h2>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <Link className={`${button} mt-6 w-full`} to="/offers">Back to the open jobs</Link>
        <p className="mt-3 text-center text-[12px] leading-relaxed text-muted">
          Did not get a message? Contact [SUPPORT EMAIL] or [WHATSAPP NUMBER].
        </p>
      </div>
    </main>
  )
}
