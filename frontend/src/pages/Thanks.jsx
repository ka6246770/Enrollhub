import { Link, useLocation } from 'react-router-dom'
import Brand from '../components/Brand.jsx'
import { button, container } from '../lib/ui.js'

export default function Thanks() {
  const location = useLocation()
  const name = String(location.state?.name ?? '').trim()
  const phone = String(location.state?.phone ?? '').trim()
  const offerTitle = location.state?.offerTitle || 'the job you applied for'
  const statusPath = location.state?.statusPath || ''
  const steps = [
    ['Check WhatsApp', phone ? `We will message ${phone} about the next step.` : 'We will message the WhatsApp number you gave us about the next step.'],
    ['Keep your phone on', 'We may ask a few questions before the team makes a decision.'],
    ['Watch for the offer', 'If you are offered a place, open your private link and accept it before it is confirmed.'],
  ]

  return (
    <main className="motion-page min-h-screen bg-page">
      <header className="bg-night">
        <div className={`${container} flex min-h-[68px] items-center justify-between gap-4 py-3`}>
          <Brand />
          <Link className="text-[12px] font-semibold text-night-ink/70 no-underline hover:text-white" to="/offers">Back to jobs</Link>
        </div>
      </header>

      <div className="mx-auto w-[min(100%-32px,640px)] py-12 max-[500px]:py-9">
        <p className="mono-label text-brand-text">Application received</p>
        <h1 className="mt-3 text-balance text-[clamp(34px,5.4vw,48px)] font-extrabold leading-[1.0] tracking-[-0.04em]">
          Thank you{name ? `, ${name}` : ''}.
        </h1>
        <p className="mt-4 max-w-[52ch] text-pretty text-[15px] leading-[1.7] text-muted">
          Your application for {offerTitle} is with our team. Here is what happens next.
        </p>

        <div className="mt-7 border border-ink bg-surface">
          <div className="flex items-center justify-between border-b border-dashed border-ink/25 px-5 py-3">
            <span className="mono-label text-muted">Application receipt</span>
            <span className="mono-label text-brand-text">Received</span>
          </div>
          <dl className="grid grid-cols-[88px_1fr] gap-x-4 gap-y-2.5 px-5 py-4 text-[12px]">
            <dt className="text-muted">Applicant</dt>
            <dd className="font-semibold">{name || 'Your application'}</dd>
            <dt className="text-muted">Job</dt>
            <dd className="font-semibold">{offerTitle}</dd>
            <dt className="text-muted">WhatsApp</dt>
            <dd className="font-semibold tabular-nums">{phone || 'Number provided'}</dd>
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

        {statusPath ? (
          <div className="mt-6 border border-brand/30 bg-mint p-4">
            <h2 className="text-[14px] font-bold text-mint-ink">Keep your private status link</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-mint-ink/80">
              Bookmark this link to check the decision and accept a place later. Do not share it;
              anyone with it can open your status.
            </p>
            <Link className={`${button} mt-3 w-full`} to={statusPath}>Open my private status page</Link>
          </div>
        ) : null}

        <Link className={`${statusPath ? 'inline-flex min-h-11 items-center justify-center rounded-[4px] border border-ink/30 px-5 text-[13px] font-bold text-ink no-underline hover:bg-surface/60' : button} mt-3 w-full`} to="/offers">
          Back to the open jobs
        </Link>
        <p className="mt-3 text-center text-[12px] leading-relaxed text-muted">
          Did not get a message? <Link className="font-bold text-brand-text underline" to="/contact">Contact us</Link>{' '}
          and we will check your application.
        </p>
      </div>
    </main>
  )
}
