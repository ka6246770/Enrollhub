import { label, secondaryButton } from '../lib/ui.js'

// Presentational voice-recording picker. All state lives in the
// `useVoiceRecording` hook, which the parent form owns.
export function VoiceUpload({ audioRef, error, fileInputRef, handleChange, isChecking, play, recording, remove }) {
  return (
    <div className="mt-5">
      <label className={label} htmlFor="voice-recording">Voice recording</label>
      <div className="mt-2 rounded-xl border border-dashed border-brand/50 bg-soft p-4">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-lg text-brand">
            <svg className="size-6 stroke-current stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round]" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="3" width="6" height="12" rx="3" />
              <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v4m-3 0h6" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <input
              className="block w-full text-xs file:mr-3 file:rounded-md file:border file:border-line file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-ink"
              id="voice-recording"
              name="recording"
              type="file"
              ref={fileInputRef}
              accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/wav,audio/x-wav"
              required
              onChange={handleChange}
            />
            <p className="mt-2 text-[11px] leading-relaxed text-muted">1 to 2 minutes. MP3, M4A or WAV, up to 10&nbsp;MB.</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className={secondaryButton} disabled={!recording || Boolean(error)} onClick={play} type="button">Preview recording</button>
          <button className={secondaryButton} disabled={!recording} onClick={remove} type="button">Remove</button>
        </div>
        <audio aria-label="Preview voice recording" className="hidden" ref={audioRef}>Your browser does not support audio playback.</audio>
      </div>
      {isChecking ? <p className="mt-2 text-[11px] text-muted" role="status">Checking recording length…</p> : null}
      {error ? <p className="mt-2 text-xs font-semibold text-coral-ink" role="alert">{error}</p> : null}
    </div>
  )
}

export default VoiceUpload
