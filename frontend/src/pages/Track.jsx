import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageFrame from '../components/PageFrame.jsx'
import PageHero from '../components/PageHero.jsx'
import { formatDate } from '../lib/format.js'
import { button, field, label } from '../lib/ui.js'
import { lookupRegistrationStatus, resendReference } from '../services/api.js'

const TIMELINE = [
  ['Received', 'Your application reached our team.'],
  ['Under review', 'The team checks your details and voice note.'],
  ['Decision', 'We contact you on WhatsApp or email.'],
]

const STATUS_TONES = {
  received: 'border-line bg-soft text-ink',
  waitlist: 'border-plum/30 bg-plum-soft text-plum-ink',
  accepted: 'border-brand/30 bg-mint text-mint-ink',
  rejected: 'border-coral-strong/30 bg-coral text-coral-ink',
}

const STATUS_LABELS = {
  received: 'Received',
  waitlist: 'On the waitlist',
  accepted: 'Accepted',
  rejected: 'Not selected',
}

// Received is still being reviewed, so the second stop is the current one.
// Every other answer has reached the decision stop.
function stepState(index, status) {
  if (status === 'received') return index === 0 ? 'done' : index === 1 ? 'current' : 'todo'
  return index < 2 ? 'done' : 'current'
}

function submittedDate(value) {
  if (!value) return ''
  return formatDate(String(value).slice(0, 10))
}

export default function Track() {
  const [searchParams] = useSearchParams()
  const [reference, setReference] = useState(() => searchParams.get('ref') ?? '')
  const [email, setEmail] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resending, setResending] = useState(false)
  const [resendNotice, setResendNotice] = useState('')
  const [resendError, setResendError] = useState('')

  async function lookup(event) {
    event.preventDefault()
    setError('')
    setResult(null)
    setResendNotice('')
    if (!reference.trim() || !email.trim()) {
      setError('Enter both the reference code and the email address you applied with.')
      return
    }

    setLoading(true)
    try {
      const data = await lookupRegistrationStatus({
        reference: reference.trim(),
        email: email.trim(),
      })
      setResult(data)
    } catch (lookupError) {
      setError(lookupError.message || "We couldn't find a match. Check the reference code and email.")
    } finally {
      setLoading(false)
    }
  }

  async function sendReference() {
    setResendError('')
    setResendNotice('')
    if (!email.trim()) {
      setResendError('Enter the email address you applied with first.')
      return
    }

    setResending(true)
    try {
      const data = await resendReference(email.trim())
      setResendNotice(data?.message || 'If this email is registered, we sent the code.')
    } catch (sendError) {
      setResendError(sendError.message || 'Could not send the code. Please try again later.')
    } finally {
      setResending(false)
    }
  }

  return (
    <PageFrame>
      <PageHero
        eyebrow="Application tracking"
        intro="Enter the reference code from your confirmation email and the same email address you applied with. Both are needed to protect your details."
        title="Where is my application?"
      />

      <main className={`motion-page mx-auto w-[min(100%-32px,720px)] pb-16`} id="main-content">
        <form className="motion-panel border border-ink/15 bg-surface p-5 max-[420px]:p-4" onSubmit={lookup}>
          {searchParams.get('ref') ? (
            <p className="mb-4 border-l-2 border-brand bg-mint px-3 py-2 text-[12px] leading-relaxed text-mint-ink" role="status">
              We filled in the reference code from your link. Enter the email address you applied with.
            </p>
          ) : null}

          <div className="grid gap-4">
            <label className={label}>
              Reference code
              <input
                autoCapitalize="characters"
                autoComplete="off"
                className={`${field} font-mono uppercase tracking-[0.08em]`}
                maxLength={40}
                onChange={(event) => setReference(event.target.value)}
                placeholder="ENR-7K3M9QAB"
                required
                spellCheck={false}
                value={reference}
              />
            </label>
            <label className={label}>
              Email address
              <input
                autoComplete="email"
                className={field}
                maxLength={200}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                spellCheck={false}
                type="email"
                value={email}
              />
            </label>
          </div>

          {error ? (
            <p className="mt-4 border-l-2 border-coral-strong bg-coral px-3 py-2 text-[12px] font-semibold text-coral-ink" role="alert">
              {error}
            </p>
          ) : null}

          <button className={`${button} mt-5 w-full`} disabled={loading} type="submit">
            {loading ? 'Checking…' : 'Check my status'}
          </button>
          <div className="mt-3 text-center">
            <button
              className="inline-flex min-h-9 items-center text-[12px] font-bold text-brand-text underline disabled:opacity-50"
              disabled={resending}
              onClick={sendReference}
              type="button"
            >
              {resending ? 'Sending…' : 'Email me my reference code'}
            </button>
          </div>
          {resendNotice ? (
            <p className="mt-2 border border-brand/20 bg-soft px-3 py-2 text-[12px] font-semibold text-brand-text" role="status">
              {resendNotice}
            </p>
          ) : null}
          {resendError ? (
            <p className="mt-2 border-l-2 border-coral-strong bg-coral px-3 py-2 text-[12px] font-semibold text-coral-ink" role="alert">
              {resendError}
            </p>
          ) : null}
        </form>

        {result ? (
          <section aria-live="polite" className="mt-5 border border-line bg-surface p-5 max-[420px]:p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="mono-label text-muted">Reference {result.reference}</p>
                <h2 className="mt-1 text-xl font-extrabold tracking-[-0.02em]">{result.offerTitle}</h2>
                {result.submittedAt ? (
                  <p className="mt-1 text-[12px] text-muted">Submitted {submittedDate(result.submittedAt)}</p>
                ) : null}
              </div>
              <span className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-bold ${STATUS_TONES[result.status] ?? STATUS_TONES.received}`}>
                {STATUS_LABELS[result.status] ?? 'Received'}
              </span>
            </div>

            <p className="mt-4 text-sm leading-[1.7] text-ink/80">{result.message}</p>

            <ol className="mt-5 grid gap-4 border-l border-line pl-5">
              {TIMELINE.map(([title, description], index) => {
                const state = stepState(index, result.status)
                return (
                  <li aria-current={state === 'current' ? 'step' : undefined} className="relative" key={title}>
                    <span
                      aria-hidden="true"
                      className={`absolute -left-[27px] top-0.5 size-3 rounded-full border-2 ${
                        state === 'todo' ? 'border-line bg-page' : 'border-brand bg-brand'
                      } ${state === 'current' ? 'ring-4 ring-brand/15' : ''}`}
                    />
                    <p className={`text-[12px] font-bold ${state === 'todo' ? 'text-muted' : 'text-ink'}`}>
                      {title}
                      <span className="sr-only">{state === 'done' ? ' — completed' : state === 'current' ? ' — current step' : ' — not yet'}</span>
                    </p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{description}</p>
                  </li>
                )
              })}
            </ol>

            <p className="mt-5 border-t border-dashed border-line pt-4 text-[11px] leading-relaxed text-muted">
              For your privacy this page never shows your phone number, voice note, or private team notes.
              Need to change something? <Link className="font-bold text-brand-text underline" to="/contact">Contact us</Link>.
            </p>
          </section>
        ) : null}

        <p className="mt-5 text-center text-[12px] leading-relaxed text-muted">
          Lost your reference code? Use the email button above, or{' '}
          <Link className="font-bold text-brand-text underline" to="/contact">contact us</Link>.
        </p>
      </main>
    </PageFrame>
  )
}
