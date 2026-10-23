import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useVoiceRecording } from '../hooks/useVoiceRecording.js'
import { button } from '../lib/ui.js'
import { submitRegistration } from '../services/api.js'
import { Field } from './FormField.jsx'
import VoiceUpload from './VoiceUpload.jsx'

// The application form for a single job. Owns the voice-note state and posts the
// whole form (including the recording) to the API before showing the thank-you
// page.
export function RegistrationForm({ offer }) {
  const navigate = useNavigate()
  const voice = useVoiceRecording()
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    const form = event.currentTarget
    const recordingMessage = voice.validateBeforeSubmit()
    if (recordingMessage) {
      voice.setError(recordingMessage)
      return
    }

    // new FormData(form) already carries every field, including the `recording`
    // file input rendered by VoiceUpload.
    const formData = new FormData(form)
    // A recorded clip is a File created by MediaRecorder, not an entry in the
    // file input, so it replaces any uploaded file explicitly.
    if (voice.recording) formData.set('recording', voice.recording, voice.recording.name)
    formData.append('offerSlug', offer.slug)

    setSubmitError('')
    setSubmitting(true)
    try {
      const result = await submitRegistration(formData)
      navigate('/thank-you', {
        state: {
          name: formData.get('name'),
          phone: formData.get('phone'),
          offerTitle: offer.title,
          statusPath: result?.statusPath ?? null,
        },
      })
    } catch (error) {
      setSubmitError(error.message || 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <form className="motion-panel mt-8 border border-ink/15 bg-surface p-6 max-[500px]:p-4" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[22px] font-extrabold tracking-[-0.02em]">Your details and voice note</h2>
        <span className="mono-label text-muted">About 3 minutes</span>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-muted">No account and no CV. Fill in your details and record a short voice note.</p>

      <div className="mt-5 grid grid-cols-2 gap-4 max-[500px]:grid-cols-1">
        <Field label="Full name" name="name" placeholder="Your full name" autoComplete="name" required className="col-span-2 max-[500px]:col-span-1" />
        <Field label="Age" name="age" placeholder="e.g. 25" type="number" inputMode="numeric" min="18" max="50" required />
        <Field label="City or governorate" name="residence" placeholder="e.g. Tanta" autoComplete="address-level2" required />
        <Field label="WhatsApp number" name="phone" type="tel" placeholder="+20 1XX XXX XXXX" autoComplete="tel" required className="col-span-2 max-[500px]:col-span-1" />
        <Field label="Email" name="email" type="email" placeholder="you@example.com" autoComplete="email" spellCheck={false} required className="col-span-2 max-[500px]:col-span-1" />
      </div>

      <VoiceUpload
        audioRef={voice.audioRef}
        canRecord={voice.canRecord}
        elapsed={voice.elapsed}
        error={voice.error}
        fileInputRef={voice.fileInputRef}
        handleChange={voice.handleChange}
        isChecking={voice.isChecking}
        isRecording={voice.isRecording}
        maxSeconds={voice.maxSeconds}
        minSeconds={voice.minSeconds}
        offerTitle={offer.title}
        play={voice.play}
        recording={voice.recording}
        remove={voice.remove}
        startRecording={voice.startRecording}
        stopRecording={voice.stopRecording}
      />

      <label className="mt-5 flex items-start gap-2.5 text-[12px] leading-relaxed text-muted">
        <input className="mt-0.5 accent-accent" type="checkbox" name="consent" required />
        <span>
          I agree that Al-Tayeb Company may store my details and voice note, and contact me by
          WhatsApp or email about this job. My recording is deleted after 180 days, and I can ask
          for all my data to be deleted at any time through the{' '}
          <Link className="font-bold text-brand-text underline" to="/privacy">privacy policy</Link>{' '}
          or <Link className="font-bold text-brand-text underline" to="/contact">contact page</Link>.
        </span>
      </label>
      {submitError ? (
        <p className="mt-5 border-l-2 border-coral-strong bg-coral px-3 py-2 text-[12px] font-semibold text-coral-ink" role="alert">{submitError}</p>
      ) : null}
      <button className={`${button} mt-5 w-full`} type="submit" disabled={submitting}>
        {submitting ? 'Sending…' : 'Send my application'}
      </button>
      <p className="mt-3 text-center text-[12px] text-muted">We will contact you on WhatsApp about the next step.</p>
    </form>
  )
}

export default RegistrationForm
