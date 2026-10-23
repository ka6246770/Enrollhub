import { useCallback, useEffect, useRef, useState } from 'react'

const ALLOWED_EXTENSIONS = ['mp3', 'm4a', 'wav', 'webm', 'ogg', 'oga']
const MAX_BYTES = 10 * 1024 * 1024
const MIN_SECONDS = 60
const MAX_SECONDS = 120

// Formats MediaRecorder prefers. Chrome/Firefox record Opus in WebM or OGG;
// Safari records MP4 audio, which the API already accepts as .m4a.
const MIME_CANDIDATES = [
  { type: 'audio/webm;codecs=opus', extension: 'webm' },
  { type: 'audio/ogg;codecs=opus', extension: 'ogg' },
  { type: 'audio/mp4', extension: 'm4a' },
  { type: 'audio/webm', extension: 'webm' },
]

function pickMimeType() {
  if (typeof window === 'undefined' || typeof window.MediaRecorder === 'undefined') return null
  const supported = MIME_CANDIDATES.find(({ type }) => {
    try {
      return window.MediaRecorder.isTypeSupported(type)
    } catch {
      return false
    }
  })
  return supported ?? { type: '', extension: 'webm' }
}

function extensionForMime(mimeType) {
  if (mimeType.includes('ogg')) return 'ogg'
  if (mimeType.includes('mp4')) return 'm4a'
  if (mimeType.includes('mpeg')) return 'mp3'
  if (mimeType.includes('wav')) return 'wav'
  return 'webm'
}

function microphoneError(error) {
  if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
    return 'Microphone access was blocked. Allow it in your browser settings, or upload a file instead.'
  }
  if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
    return 'No microphone was found on this device. Upload a recording instead.'
  }
  if (error?.name === 'NotReadableError') {
    return 'The microphone is busy in another app. Close it, then try again or upload a file.'
  }
  return 'The microphone could not start. Upload a recording instead.'
}

// Validates the file type and size. Duration is checked separately because it
// requires reading the audio metadata.
export function getRecordingError(file) {
  if (!file) return 'Record a voice note or choose an audio file to continue.'
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return 'Choose an MP3, M4A, WAV, WebM, or OGG audio file.'
  }
  if (file.size > MAX_BYTES) return 'The recording must be 10 MB or smaller.'
  return ''
}

// Owns the voice-note state: the selected or recorded file, its preview element,
// length validation, and the MediaRecorder session. The parent form only needs
// `recording`, `validateBeforeSubmit`, and the controls rendered by VoiceUpload.
export function useVoiceRecording() {
  const [recording, setRecording] = useState(null)
  const [error, setError] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  // Capability never changes during a visit; reading it once avoids an effect.
  const [canRecord] = useState(() => Boolean(navigator.mediaDevices?.getUserMedia && window.MediaRecorder))

  const audioRef = useRef(null)
  const fileInputRef = useRef(null)
  const objectUrlRef = useRef('')
  const checkIdRef = useRef(0)
  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(0)
  const startedAtRef = useRef(0)
  const recordedSecondsRef = useRef(0)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = 0
    }
  }, [])

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  const stopAudio = useCallback(() => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = ''
    if (audioRef.current) {
      audioRef.current.removeAttribute('src')
      audioRef.current.load()
    }
  }, [])

  useEffect(() => {
    return () => {
      clearTimer()
      if (recorderRef.current?.state && recorderRef.current.state !== 'inactive') {
        recorderRef.current.onstop = null
        recorderRef.current.stop()
      }
      releaseStream()
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [clearTimer, releaseStream])

  const stopRecording = useCallback(() => {
    clearTimer()
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
    setIsRecording(false)
  }, [clearTimer])

  const startRecording = useCallback(async () => {
    const mime = pickMimeType()
    if (!mime) {
      setError('This browser cannot record audio. Upload a file instead.')
      return
    }

    setError('')
    setElapsed(0)
    recordedSecondsRef.current = 0
    checkIdRef.current += 1
    if (fileInputRef.current) fileInputRef.current.value = ''
    setRecording(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      streamRef.current = stream

      const recorder = new window.MediaRecorder(stream, mime.type ? { mimeType: mime.type } : undefined)
      recorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }

      recorder.onstop = () => {
        const blobType = recorder.mimeType || mime.type || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: blobType })
        chunksRef.current = []
        releaseStream()

        // Elapsed time is authoritative here: WebM blobs from MediaRecorder do
        // not always carry a duration header.
        const seconds = Math.min(
          MAX_SECONDS,
          Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)),
        )
        recordedSecondsRef.current = seconds
        setElapsed(seconds)

        if (!blob.size) {
          setError('The recording was empty. Please try again or upload a file.')
          return
        }

        const extension = extensionForMime(blobType) || mime.extension
        const file = new File([blob], `voice-note.${extension}`, {
          type: blobType,
          lastModified: Date.now(),
        })

        stopAudio()
        setRecording(file)
        const source = URL.createObjectURL(file)
        objectUrlRef.current = source
        if (audioRef.current) {
          audioRef.current.src = source
          audioRef.current.load()
        }

        setError(seconds < MIN_SECONDS
          ? `That recording is ${seconds}s long. Record at least ${MIN_SECONDS} seconds, or upload a longer file.`
          : '')
      }

      startedAtRef.current = Date.now()
      recorder.start(1000)
      setIsRecording(true)
      timerRef.current = window.setInterval(() => {
        const seconds = Math.floor((Date.now() - startedAtRef.current) / 1000)
        setElapsed(Math.min(seconds, MAX_SECONDS))
        if (seconds >= MAX_SECONDS) stopRecording()
      }, 500)
    } catch (microphoneFailure) {
      releaseStream()
      setIsRecording(false)
      setError(microphoneError(microphoneFailure))
    }
  }, [releaseStream, stopAudio, stopRecording])

  const handleChange = useCallback(
    async (event) => {
      const file = event.target.files?.[0] ?? null
      const checkId = ++checkIdRef.current
      recordedSecondsRef.current = 0
      setRecording(file)
      setIsChecking(false)
      stopAudio()

      const fileError = getRecordingError(file)
      if (fileError) {
        setError(fileError)
        return
      }

      const source = URL.createObjectURL(file)
      objectUrlRef.current = source
      if (audioRef.current) {
        audioRef.current.src = source
        audioRef.current.load()
      }
      setIsChecking(true)
      try {
        const duration = await new Promise((resolve, reject) => {
          const audio = new Audio()
          audio.onloadedmetadata = () => resolve(audio.duration)
          audio.onerror = () => reject(new Error('Could not read the audio duration.'))
          audio.src = source
        })
        if (checkId !== checkIdRef.current) return
        if (duration < MIN_SECONDS || duration > MAX_SECONDS) {
          setError('Your voice recording must be between 1 and 2 minutes.')
          return
        }
        setError('')
      } catch (audioError) {
        if (checkId !== checkIdRef.current) return
        setError(audioError.message)
      } finally {
        if (checkId === checkIdRef.current) setIsChecking(false)
      }
    },
    [stopAudio],
  )

  const remove = useCallback(() => {
    if (isRecording) stopRecording()
    checkIdRef.current += 1
    recordedSecondsRef.current = 0
    setRecording(null)
    setError('')
    setIsChecking(false)
    setElapsed(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
    stopAudio()
  }, [isRecording, stopAudio, stopRecording])

  const play = useCallback(() => {
    if (!audioRef.current || !recording) return
    audioRef.current.currentTime = 0
    audioRef.current.play()
  }, [recording])

  // Returns the message to show when the form is submitted, or '' when the
  // recording is ready to send.
  const validateBeforeSubmit = useCallback(() => {
    if (isRecording) return 'Stop the recording before sending your application.'
    if (isChecking) return 'Please wait while we check your recording.'
    const fileError = getRecordingError(recording)
    if (fileError) return fileError
    const seconds = recordedSecondsRef.current
    if (seconds && (seconds < MIN_SECONDS || seconds > MAX_SECONDS)) {
      return 'Your voice recording must be between 1 and 2 minutes.'
    }
    return error
  }, [isRecording, isChecking, recording, error])

  return {
    audioRef,
    canRecord,
    elapsed,
    error,
    fileInputRef,
    handleChange,
    isChecking,
    isRecording,
    maxSeconds: MAX_SECONDS,
    minSeconds: MIN_SECONDS,
    play,
    recording,
    remove,
    setError,
    startRecording,
    stopRecording,
    validateBeforeSubmit,
  }
}
