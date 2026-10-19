import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LANGUAGE_OPTIONS, LEVEL_OPTIONS } from '../data/offers.js'
import { useVoiceRecording } from '../hooks/useVoiceRecording.js'
import { button } from '../lib/ui.js'
import { submitRegistration } from '../services/api.js'
import { Field, SelectField } from './FormField.jsx'
import VoiceUpload from './VoiceUpload.jsx'

// The registration form for a single offer. Owns the voice-recording state and
// posts the whole form (including the recording) to the API before showing the
// thank-you page.
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
    formData.append('offerSlug', offer.slug)

    setSubmitError('')
    setSubmitting(true)
    try {
      await submitRegistration(formData)
      navigate('/thank-you', {
        state: {
          name: formData.get('name'),
          phone: formData.get('phone'),
          offerTitle: offer.title,
        },
      })
    } catch (error) {
      setSubmitError(error.message || 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <form className="mt-7 border-t border-line pt-6" onSubmit={handleSubmit}>
      <h2 className="text-xl font-bold">Register for this offer</h2>
      <div className="mt-5 grid grid-cols-2 gap-4 max-[500px]:grid-cols-1">
        <Field label="Name" name="name" placeholder="Your full name" autoComplete="name" required className="col-span-2 max-[500px]:col-span-1" />
        <Field label="Age" name="age" placeholder="e.g. 25" type="number" inputMode="numeric" min="13" max="120" required />
        <SelectField label="Language" name="language" required>
          {LANGUAGE_OPTIONS.map((language) => <option key={language}>{language}</option>)}
        </SelectField>
        <SelectField label="Level" name="level" required>
          {LEVEL_OPTIONS.map((level) => <option key={level}>{level}</option>)}
        </SelectField>
        <Field label="Residence" name="residence" placeholder="City, country" autoComplete="address-level2" required />
        <Field label="Email" name="email" type="email" placeholder="you@example.com" autoComplete="email" spellCheck={false} required className="col-span-2 max-[500px]:col-span-1" />
        <Field label="WhatsApp number" name="phone" type="tel" placeholder="+20 1XX XXX XXXX" autoComplete="tel" required className="col-span-2 max-[500px]:col-span-1" />
      </div>
      <VoiceUpload
        audioRef={voice.audioRef}
        error={voice.error}
        fileInputRef={voice.fileInputRef}
        handleChange={voice.handleChange}
        isChecking={voice.isChecking}
        play={voice.play}
        recording={voice.recording}
        remove={voice.remove}
      />
      <label className="mt-5 flex items-start gap-2.5 text-[11px] leading-relaxed text-muted">
        <input className="mt-0.5 accent-brand" type="checkbox" name="consent" required />
        <span>I agree that [BRAND NAME] may store my details and voice recording, and contact me by WhatsApp or email about this offer. I can withdraw my consent at any time by contacting [SUPPORT EMAIL].</span>
      </label>
      {submitError ? (
        <p className="mt-5 rounded-lg bg-coral px-3 py-2 text-xs font-semibold text-coral-ink" role="alert">{submitError}</p>
      ) : null}
      <button className={`${button} mt-5 w-full`} type="submit" disabled={submitting}>
        {submitting ? 'Sending…' : 'Register now'}
      </button>
      <p className="mt-3 text-center text-[11px] text-muted">You will get a WhatsApp message within [X] hours.</p>
    </form>
  )
}

export default RegistrationForm
