import { Link, useLocation } from 'react-router-dom'
import { button } from '../lib/ui.js'

export default function Thanks() {
  const location = useLocation()
  const name = location.state?.name || '[NAME]'
  const phone = location.state?.phone || '[PHONE]'
  const offerTitle = location.state?.offerTitle || '[OFFER NAME]'
  const steps = [
    ['Check WhatsApp', `You will get a confirmation message on ${phone} within [X] hours.`],
    ['Keep your phone on', 'We may reach out with questions before we confirm your seat.'],
    ['Start on [START DATE]', 'Full details and the schedule will be in your confirmation message.'],
  ]

  return (
    <main className="flex min-h-screen flex-col">
      <div className="mx-auto w-[min(100%_-_48px,_550px)] flex-1 pt-[58px]">
        <div aria-hidden="true" className="grid size-[88px] place-items-center rounded-full bg-brand text-white">
          <svg className="size-10 stroke-current stroke-[2.5] [stroke-linecap:round] [stroke-linejoin:round]" viewBox="0 0 24 24" fill="none"><path d="m5 12.5 4.5 4.5L19.5 7" /></svg>
        </div>
        <h1 className="mt-8 text-balance text-[38px] font-bold leading-[1.2] tracking-tight">Thank you, {name}. You’re registered.</h1>
        <p className="mt-4 text-pretty text-[19px] leading-relaxed text-muted">Your registration for {offerTitle} was received. Here is what happens next.</p>
        <section aria-label="What happens next" className="mt-8 grid gap-5 rounded-[20px] border border-line bg-white px-6 py-7">
          {steps.map(([title, description], index) => (
            <article className="flex items-start gap-4" key={title}>
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-mint text-lg font-bold text-mint-ink">{index + 1}</span>
              <div><h2 className="text-xl font-bold leading-tight">{title}</h2><p className="text-[17px] leading-snug text-muted">{description}</p></div>
            </article>
          ))}
        </section>
      </div>
      <footer className="mx-auto w-[min(100%_-_48px,_550px)] pb-[55px] text-center">
        <Link className={`${button} min-h-[60px] w-full rounded-[15px] text-[17px]`} to="/">Back to offers</Link>
        <p className="mt-3 text-base text-muted">Did not get a message? Contact [SUPPORT EMAIL]</p>
      </footer>
    </main>
  )
}
