import { useState } from 'react'
import { Field, TextareaField } from '../components/FormField.jsx'
import PageFrame from '../components/PageFrame.jsx'
import PageHero from '../components/PageHero.jsx'
import { button, container, secondaryButton } from '../lib/ui.js'
import { sendContactMessage } from '../services/api.js'

export default function Contact() {
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const methods = [
    ['Email', '[SUPPORT EMAIL]', 'We reply within [X] hours.'],
    ['WhatsApp', '[WHATSAPP NUMBER]', 'Message us during business hours.'],
    ['Address', '[BUSINESS ADDRESS]', 'Office visits by appointment.'],
  ]

  async function handleSubmit(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setError('')
    setSending(true)
    try {
      await sendContactMessage({
        name: formData.get('name'),
        email: formData.get('email'),
        message: formData.get('message'),
      })
      setSent(true)
    } catch (submitError) {
      setError(submitError.message || 'Something went wrong. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <PageFrame>
      <main className="pb-12" id="main-content">
        <PageHero
          eyebrow="Contact"
          title="Get in touch"
          intro="Questions about an offer or your registration? Reach us any way you like."
        />

        <section className={`${container} max-w-[880px] grid grid-cols-2 gap-6 max-[750px]:grid-cols-1`}>
          <div className="grid content-start gap-3">
            {methods.map(([title, value, note]) => (
              <article className="rounded-[13px] border border-line bg-white p-5" key={title}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-mint-ink">{title}</p>
                <p className="mt-1.5 text-sm font-bold">{value}</p>
                <p className="mt-1 text-[11px] text-muted">{note}</p>
              </article>
            ))}
          </div>

          {sent ? (
            <div className="grid content-center rounded-[13px] border border-line bg-soft p-6 text-center" role="status">
              <div aria-hidden="true" className="mx-auto grid size-12 place-items-center rounded-full bg-brand text-white">
                <svg className="size-6 stroke-current stroke-[2.5] [stroke-linecap:round] [stroke-linejoin:round]" viewBox="0 0 24 24" fill="none"><path d="m5 12.5 4.5 4.5L19.5 7" /></svg>
              </div>
              <h2 className="mt-4 text-lg font-bold">Message sent</h2>
              <p className="mt-2 text-xs leading-relaxed text-muted">Thanks for reaching out. We will reply to you as soon as we can.</p>
              <button className={`${secondaryButton} mx-auto mt-4`} onClick={() => setSent(false)} type="button">Send another message</button>
            </div>
          ) : (
            <form className="rounded-[13px] border border-line bg-white p-6" onSubmit={handleSubmit}>
              <h2 className="text-base font-bold">Send us a message</h2>
              <div className="mt-4 grid gap-4">
                <Field label="Name" name="name" placeholder="Your full name" autoComplete="name" required />
                <Field label="Email" name="email" type="email" placeholder="you@example.com" autoComplete="email" spellCheck={false} required />
                <TextareaField label="Message" name="message" placeholder="How can we help?…" autoComplete="off" required />
              </div>
              <button className={`${button} mt-4 w-full`} type="submit" disabled={sending}>
                {sending ? 'Sending…' : 'Send message'}
              </button>
              {error ? <p className="mt-3 text-xs font-semibold text-coral-ink" role="alert">{error}</p> : null}
              <p className="mt-3 text-center text-[11px] text-muted">We reply within [X] hours.</p>
            </form>
          )}
        </section>
      </main>
    </PageFrame>
  )
}
