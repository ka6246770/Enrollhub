import { Link } from 'react-router-dom'
import { button, secondaryButton } from '../lib/ui.js'

function clock(seconds) {
  const safe = Math.max(0, Math.floor(seconds || 0))
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}

function fileSize(bytes) {
  if (!bytes) return '0 KB'
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function MicIcon() {
  return (
    <svg aria-hidden="true" className="size-4 stroke-current stroke-[1.7] [stroke-linecap:round] [stroke-linejoin:round]" viewBox="0 0 24 24" fill="none">
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v4m-3 0h6" />
    </svg>
  )
}

function RecordingPanel({ elapsed, maxSeconds, onStop }) {
  const progress = Math.min(100, Math.round((elapsed / maxSeconds) * 100))
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span aria-hidden="true" className="relative flex size-3">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger opacity-60" />
          <span className="relative inline-flex size-3 rounded-full bg-danger" />
        </span>
        <p className="font-mono text-lg font-bold tabular-nums text-ink" role="timer">
          {clock(elapsed)} <span className="text-[11px] font-medium text-muted">/ {clock(maxSeconds)}</span>
        </p>
        <button
          className="inline-flex min-h-9 items-center justify-center rounded-[4px] border border-danger bg-danger px-4 text-[12px] font-bold text-danger-ink transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger motion-reduce:transition-none"
          onClick={onStop}
          type="button"
        >
          Stop recording
        </button>
      </div>
      <div aria-hidden="true" className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-danger transition-[width] duration-500" style={{ width: `${progress}%` }} />
      </div>
      <p aria-live="polite" className="mt-2 text-[12px] leading-relaxed text-muted">
        Recording now. Say your name, age, city, factory experience, and whether you need housing.
        It stops by itself at {clock(maxSeconds)}.
      </p>
    </div>
  )
}

function SelectedPanel({ canRecord, onPlay, recording, onRemove, onRecord }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="max-w-full truncate border border-line bg-surface px-2.5 py-1 font-mono text-[11px] font-bold text-ink">
          {recording.name}
        </span>
        <span className="text-[11px] text-muted">{fileSize(recording.size)}</span>
        <button className={`${secondaryButton} min-h-8 px-3 text-[11px]`} onClick={onPlay} type="button">
          Preview
        </button>
        <button className={`${secondaryButton} min-h-8 px-3 text-[11px]`} onClick={onRemove} type="button">
          Remove
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-[11px] font-bold">
        {canRecord ? (
          <button className="text-brand-text underline underline-offset-4 hover:no-underline" onClick={onRecord} type="button">
            Record again
          </button>
        ) : null}
        <label className="cursor-pointer text-brand-text underline underline-offset-4 hover:no-underline" htmlFor="voice-recording">
          Choose another file
        </label>
      </div>
    </div>
  )
}

function EmptyPanel({ canRecord, onRecord }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {canRecord ? (
          <button className={`${button} min-h-10 px-4 text-[12px]`} onClick={onRecord} type="button">
            <MicIcon />
            Record voice note
          </button>
        ) : null}
        <label className={`${secondaryButton} min-h-10 cursor-pointer px-4 text-[12px]`} htmlFor="voice-recording">
          Upload a file
        </label>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-muted">
        {canRecord
          ? 'Record here, or upload a voice file from your phone.'
          : 'This browser cannot record audio. Upload a voice file instead.'}
      </p>
    </div>
  )
}

// Presentational voice-note picker. All state lives in `useVoiceRecording`,
// which the parent form owns.
export function VoiceUpload({
  audioRef,
  canRecord,
  elapsed,
  error,
  fileInputRef,
  handleChange,
  isChecking,
  isRecording,
  maxSeconds,
  minSeconds,
  offerTitle,
  play,
  recording,
  remove,
  startRecording,
  stopRecording,
}) {
  const helpHref = `/contact?type=problem&message=${encodeURIComponent(`I could not upload my recording for ${offerTitle || 'a job'}. Please tell me how to send it.`)}`
  const lengthError = error.includes('seconds long') || error.includes('must be between 1 and 2 minutes')
  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-[13px] font-semibold text-ink" htmlFor="voice-recording">Voice note</label>
        <span className="mono-label text-muted">Required · {clock(minSeconds)}–{clock(maxSeconds)}</span>
      </div>
      <div className={`mt-2 border border-dashed p-4 transition-colors ${isRecording ? 'border-coral-strong/60 bg-coral/20' : 'border-ink/30 bg-soft'}`}>
        <input
          accept=".mp3,.m4a,.wav,.webm,.ogg,.oga,audio/mpeg,audio/mp4,audio/wav,audio/x-wav,audio/webm,audio/ogg"
          className="sr-only"
          disabled={isRecording}
          id="voice-recording"
          name="recording"
          onChange={handleChange}
          ref={fileInputRef}
          type="file"
        />
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className={`grid size-9 shrink-0 place-items-center ${isRecording ? 'bg-danger text-danger-ink' : 'bg-brand text-white'}`}>
            <MicIcon />
          </span>
          <div className="min-w-0 flex-1">
            {isRecording ? (
              <RecordingPanel elapsed={elapsed} maxSeconds={maxSeconds} onStop={stopRecording} />
            ) : recording ? (
              <SelectedPanel canRecord={canRecord} onPlay={play} onRecord={startRecording} onRemove={remove} recording={recording} />
            ) : (
              <EmptyPanel canRecord={canRecord} onRecord={startRecording} />
            )}
          </div>
        </div>
        <ul className="mt-3 grid gap-1 border-t border-ink/10 pt-3 text-[11px] leading-relaxed text-muted">
          <li>Speak in your own voice; do not send someone else&apos;s recording.</li>
          <li>MP3, M4A, WAV, WebM or OGG, up to 10&nbsp;MB.</li>
          <li>The recording is deleted after 180 days unless you ask us to delete it sooner.</li>
        </ul>
        <audio aria-label="Preview voice note" className="hidden" ref={audioRef}>Your browser does not support audio playback.</audio>
      </div>
      {isChecking ? <p className="mt-2 text-[12px] text-muted" role="status">Checking recording length…</p> : null}
      {error ? (
        <div className="mt-2 border border-coral-strong/25 bg-coral/30 p-3" role="alert">
          <p className="text-[12px] font-semibold text-coral-ink">{error}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-coral-ink">
            {lengthError
              ? `Record again, or choose a file that is between ${Math.round(minSeconds / 60)} and ${Math.round(maxSeconds / 60)} minutes long.`
              : (
                <>
                  If recording or uploading keeps failing, <Link className="font-bold underline" to={helpHref}>send us a problem report</Link>{' '}
                  and we will tell you where to send the recording. Do not post it publicly.
                </>
              )}
          </p>
        </div>
      ) : null}
      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        Record one to two minutes in a quiet place. Say your name, age, city, any factory work you have done, and whether you need housing.
      </p>
    </div>
  )
}

export default VoiceUpload
