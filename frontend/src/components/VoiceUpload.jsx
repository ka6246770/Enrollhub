import { Link } from 'react-router-dom'
import { secondaryButton } from '../lib/ui.js'

// Presentational voice-recording picker. All state lives in the
// `useVoiceRecording` hook, which the parent form owns.
export function VoiceUpload({ audioRef, error, fileInputRef, handleChange, isChecking, offerTitle, play, recording, remove }) {
  const helpHref = `/contact?type=problem&message=${encodeURIComponent(`I could not upload my recording for ${offerTitle || 'a job'}. Please tell me how to send it.`)}`
  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-[13px] font-semibold text-ink" htmlFor="voice-recording">Voice note</label>
        <span className="mono-label text-muted">Required</span>
      </div>
      <div className="mt-2 border border-dashed border-ink/30 bg-soft p-4">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center bg-brand text-white">
            <svg className="size-5 stroke-current stroke-[1.7] [stroke-linecap:round] [stroke-linejoin:round]" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="3" width="6" height="12" rx="3" />
              <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v4m-3 0h6" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <input
              className="peer sr-only"
              id="voice-recording"
              name="recording"
              type="file"
              ref={fileInputRef}
              accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/wav,audio/x-wav"
              onChange={handleChange}
            />
            <div className="flex flex-wrap items-center gap-3">
              <label
                className="inline-flex min-h-9 cursor-pointer items-center border border-ink/25 bg-white px-3 text-[12px] font-bold text-ink transition-colors hover:border-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
                htmlFor="voice-recording"
              >
                Choose a recording
              </label>
              <span className="min-w-0 max-w-full truncate text-[12px] text-muted">{recording?.name || 'No file chosen'}</span>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-muted">
              Record one to two minutes in a quiet place. Say your name, age, city, any factory
              work you have done, and whether you need housing. MP3, M4A or WAV, up to 10&nbsp;MB.
            </p>
            <ul className="mt-2 grid gap-1 text-[11px] leading-relaxed text-muted">
              <li>Use your phone&apos;s voice recorder if the browser picker is difficult.</li>
              <li>Speak in your own voice; do not send someone else&apos;s recording.</li>
              <li>The recording is deleted after 180 days unless you ask us to delete it sooner.</li>
            </ul>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className={`${secondaryButton} min-h-9 px-3 text-[12px]`} disabled={!recording || Boolean(error)} onClick={play} type="button">Preview</button>
          <button className={`${secondaryButton} min-h-9 px-3 text-[12px]`} disabled={!recording} onClick={remove} type="button">Remove</button>
        </div>
        <audio aria-label="Preview voice note" className="hidden" ref={audioRef}>Your browser does not support audio playback.</audio>
      </div>
      {isChecking ? <p className="mt-2 text-[12px] text-muted" role="status">Checking recording length…</p> : null}
      {error ? (
        <div className="mt-2 border border-coral-strong/25 bg-coral/30 p-3" role="alert">
          <p className="text-[12px] font-semibold text-coral-ink">{error}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-coral-ink">
            If choosing or uploading the file keeps failing, <Link className="font-bold underline" to={helpHref}>send us a problem report</Link>{' '}
            and we will tell you where to send the recording. Do not post it publicly.
          </p>
        </div>
      ) : null}
      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        Upload trouble? <Link className="font-bold text-brand underline" to={helpHref}>Ask us for another way to send it</Link>.
      </p>
    </div>
  )
}

export default VoiceUpload
