import { useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { Field, TextareaField } from '../components/FormField.jsx'
import PageFrame from '../components/PageFrame.jsx'
import PageHero from '../components/PageHero.jsx'
import { site } from '../config/site.js'
import { button, container, label, secondaryButton, field } from '../lib/ui.js'
import { sendContactMessage } from '../services/api.js'

// Only show a channel when the owner has supplied the exact value. Until then
// the form is a complete, honest contact route rather than a fake phone number.
function contactMethods() {
  const methods = []
  if (site.contact.telephone) {
    const digits = site.contact.telephone.replace(/[^\d]/g, '')
    methods.push([
      'WhatsApp',
      site.contact.telephone,
      'Message us about a job or application.',
      digits ? `https://wa.me/${digits}` : '',
    ])
  }
  if (site.contact.email) {
    methods.push([
      'Email',
      site.contact.email,
      'Questions sent here reach the team inbox.',
      `mailto:${site.contact.email}`,
    ])
  }
  if (site.contact.address) {
    methods.push(['Office', site.contact.address, 'Visits by appointment. Ask before you travel.', ''])
  }
  return methods
}

const CONTACT_TYPES = [
  ['problem', 'Problem'],
  ['comment', 'Comment'],
  ['question', 'Question'],
]
const VALID_TYPES = CONTACT_TYPES.map(([value]) => value)

const TYPE_HELP = {
  problem: 'Tell us what went wrong and which page it happened on.',
  comment: 'Share feedback about the site, a job, or your experience.',
  question: 'Ask about a job, your application, or housing.',
}

const SUCCESS = {
  problem: {
    title: 'Report received',
    body: 'Thanks for the report. We will look into it.',
  },
  comment: {
    title: 'Comment received',
    body: 'Thanks for the feedback. We read every comment.',
  },
  question: {
    title: 'Message sent',
    body: 'Thanks for reaching out. We will reply to you as soon as we can.',
  },
}

export default function Contact() {
  const [sent, setSent] = useState(false)
  const [sentType, setSentType] = useState('question')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()

  const requestedType = searchParams.get('type')
  const type = VALID_TYPES.includes(requestedType) ? requestedType : 'question'
  const requestedMessage = searchParams.get('message') ?? ''
  const methods = contactMethods()
  const success = SUCCESS[sentType]

  // The footer link carries the page the visitor came from, so the owner knows
  // where a problem was seen. A direct visit records the contact page itself.
  const from = typeof location.state?.from === 'string' && location.state.from.startsWith('/')
    ? location.state.from
    : `${location.pathname}${location.search}${location.hash}`
  const pageUrl = typeof window === 'undefined' ? '' : `${window.location.origin}${from}`.slice(0, 500)
  const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent.slice(0, 500)

  function handleTypeChange(event) {
    const next = event.target.value
    // Keeping the type in the URL means the footer link works even when the
    // visitor is already on this page.
    setSearchParams(next === 'question' ? {} : { type: next }, { replace: true })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const submittedType = String(formData.get('type') || 'question')
    setError('')
    setSending(true)
    try {
      await sendContactMessage({
        name: formData.get('name'),
        email: formData.get('email'),
        message: formData.get('message'),
        type: submittedType,
        pageUrl: formData.get('pageUrl'),
        userAgent: formData.get('userAgent'),
      })
      setSentType(submittedType)
      setSent(true)
    } catch (submitError) {
      setError(submitError.message || 'Something went wrong. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <PageFrame>
      <main className="motion-page pb-14" id="main-content">
        <PageHero
          eyebrow="Contact"
          title="Talk to a person."
          intro={methods.length
            ? 'Questions about a job, your application or housing? Report a problem, leave a comment, or use the contact details below. The form reaches the owner directly.'
            : 'Questions about a job, your application or housing? Report a problem, leave a comment, or ask us directly with the form below. It reaches the owner.'}
        />

        <section className={`${container} grid gap-8 min-[850px]:grid-cols-[0.8fr_1.2fr] min-[850px]:gap-14`}>
          <div>
            <div className="border-t border-ink/15">
              {methods.length ? methods.map(([methodLabel, value, note, href]) => (
                <div className="border-b border-ink/15 py-4" key={methodLabel}>
                  <p className="mono-label text-muted">{methodLabel}</p>
                  {href ? (
                    <a className="mt-1.5 block break-words text-[15px] font-bold text-ink underline-offset-4 hover:underline" href={href} rel="noreferrer" target={href.startsWith('https://') ? '_blank' : undefined}>{value}</a>
                  ) : (
                    <p className="mt-1.5 break-words text-[15px] font-bold">{value}</p>
                  )}
                  <p className="mt-1 text-[12px] leading-relaxed text-muted">{note}</p>
                </div>
              )) : (
                <div className="border-b border-ink/15 py-4">
                  <p className="mono-label text-muted">Contact form</p>
                  <p className="mt-1.5 text-[15px] font-bold">Use the form on this page</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted">It goes straight to the owner. Public phone and email details are added here when they are confirmed.</p>
                </div>
              )}
            </div>
            <p className="mt-5 text-[12px] leading-relaxed text-muted">
              Applying for a job? Use the{' '}
              <Link className="font-bold text-brand-text underline underline-offset-2" to="/offers">application form</Link>
              {' '}so your voice note reaches the right team.
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-muted">
              Problem reports and comments sent with the form go straight to the owner.
            </p>
          </div>

          {sent ? (
            <div className="grid content-center border border-brand/25 bg-mint p-6" role="status">
              <div aria-hidden="true" className="grid size-11 place-items-center bg-brand text-white">
                <svg className="size-5 stroke-current stroke-[2.5] [stroke-linecap:round] [stroke-linejoin:round]" viewBox="0 0 24 24" fill="none"><path d="m5 12.5 4.5 4.5L19.5 7" /></svg>
              </div>
              <h2 className="mt-4 text-[22px] font-extrabold text-mint-ink">{success.title}</h2>
              <p className="mt-2 max-w-[42ch] text-[13px] leading-relaxed text-mint-ink/85">{success.body}</p>
              <button className={`${secondaryButton} mt-5 self-start border-mint-ink/30 text-mint-ink hover:border-mint-ink`} onClick={() => setSent(false)} type="button">Send another message</button>
            </div>
          ) : (
            <form className="border border-ink/15 bg-surface p-6 max-[500px]:p-4" onSubmit={handleSubmit}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-[22px] font-extrabold tracking-[-0.02em]">Send a message</h2>
                <span className="mono-label text-muted">Goes to the owner</span>
              </div>
              <div className="mt-5 grid gap-4">
                <Field label="Full name" name="name" placeholder="Your full name" autoComplete="name" required />
                <div>
                  <label className={label} htmlFor="contact-type">Type</label>
                  <select
                    className={field}
                    id="contact-type"
                    name="type"
                    value={type}
                    onChange={handleTypeChange}
                    aria-describedby="contact-type-help"
                    required
                  >
                    {CONTACT_TYPES.map(([value, optionLabel]) => (
                      <option key={value} value={value}>{optionLabel}</option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-muted" id="contact-type-help">{TYPE_HELP[type]}</p>
                </div>
                <Field
                  label={type === 'question' ? 'Email' : 'Email (optional)'}
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  spellCheck={false}
                  required={type === 'question'}
                />
                <div>
                  <TextareaField
                    label="Message"
                    name="message"
                    placeholder="How can we help?"
                    autoComplete="off"
                    defaultValue={requestedMessage}
                    minLength={5}
                    maxLength={4000}
                    aria-describedby="contact-message-help"
                    required
                  />
                  <p className="mt-1.5 text-[11px] leading-relaxed text-muted" id="contact-message-help">5–4,000 characters.</p>
                </div>
                <input type="hidden" name="pageUrl" value={pageUrl} />
                <input type="hidden" name="userAgent" value={userAgent} />
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
