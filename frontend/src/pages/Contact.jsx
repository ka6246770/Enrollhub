import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Field, TextareaField } from '../components/FormField.jsx'
import PageFrame from '../components/PageFrame.jsx'
import PageHero from '../components/PageHero.jsx'
import { button, container, secondaryButton } from '../lib/ui.js'
import { sendContactMessage } from '../services/api.js'

const METHODS = [
  ['WhatsApp', '[WHATSAPP NUMBER]', 'Message us during business hours. Fastest for application questions.'],
  ['Email', '[SUPPORT EMAIL]', 'We reply within [X] hours, including weekends.'],
  ['Office', '[BUSINESS ADDRESS]', 'Visits by appointment. Ask before you travel.'],
]

export default function Contact() {
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

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
      <main className="pb-14" id="main-content">
        <PageHero
          eyebrow="Contact"
          title="Talk to a person."
          intro="Questions about a job, your application or housing? Reach us on WhatsApp, by email, or send the form below."
        />

        <section className={`${container} grid gap-8 min-[850px]:grid-cols-[0.8fr_1.2fr] min-[850px]:gap-14`}>
          <div>
            <div className="border-t border-ink/15">
              {METHODS.map(([label, value, note]) => (
                <div className="border-b border-ink/15 py-4" key={label}>
                  <p className="mono-label text-muted">{label}</p>
                  <p className="mt-1.5 break-words text-[15px] font-bold">{value}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted">{note}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-[12px] leading-relaxed text-muted">
              Applying for a job? Use the{' '}
              <Link className="font-bold text-brand underline underline-offset-2" to="/offers">application form</Link>
              {' '}so your voice note reaches the right team.
            </p>
          </div>

          {sent ? (
            <div className="grid content-center border border-brand/25 bg-mint p-6" role="status">
              <div aria-hidden="true" className="grid size-11 place-items-center bg-brand text-white">
                <svg className="size-5 stroke-current stroke-[2.5] [stroke-linecap:round] [stroke-linejoin:round]" viewBox="0 0 24 24" fill="none"><path d="m5 12.5 4.5 4.5L19.5 7" /></svg>
              </div>
              <h2 className="mt-4 text-[22px] font-extrabold text-mint-ink">Message sent</h2>
              <p className="mt-2 max-w-[42ch] text-[13px] leading-relaxed text-mint-ink/85">Thanks for reaching out. We will reply to you as soon as we can.</p>
              <button className={`${secondaryButton} mt-5 self-start border-mint-ink/30 text-mint-ink hover:border-mint-ink`} onClick={() => setSent(false)} type="button">Send another message</button>
            </div>
          ) : (
            <form className="border border-ink/15 bg-white p-6 max-[500px]:p-4" onSubmit={handleSubmit}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-[22px] font-extrabold tracking-[-0.02em]">Send a message</h2>
                <span className="mono-label text-muted">Reply within [X] hours</span>
              </div>
              <div className="mt-5 grid gap-4">
                <Field label="Full name" name="name" placeholder="Your full name" autoComplete="name" required />
                <Field label="Email" name="email" type="email" placeholder="you@example.com" autoComplete="email" spellCheck={false} required />
                <TextareaField label="Message" name="message" placeholder="How can we help?" autoComplete="off" required />
              </div>
              <button className={`${button} mt-5 w-full`} type="submit" disabled={sending}>
                {sending ? 'Sending…' : 'Send message'}
              </button>
              {error ? <p className="mt-3 text-[12px] font-semibold text-coral-ink" role="alert">{error}</p> : null}
            </form>
          )}
        </section>
      </main>
    </PageFrame>
  )
}
