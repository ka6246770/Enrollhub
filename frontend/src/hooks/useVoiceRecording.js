import { useCallback, useEffect, useRef, useState } from 'react'

const ALLOWED_EXTENSIONS = ['mp3', 'm4a', 'wav']
const MAX_BYTES = 10 * 1024 * 1024
const MIN_SECONDS = 60
const MAX_SECONDS = 120

// Validates the file type and size. Duration is checked separately because it
// requires reading the audio metadata.
export function getRecordingError(file) {
  if (!file) return 'Choose an audio recording to continue.'
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return 'Choose an MP3, M4A, or WAV audio file.'
  }
  if (file.size > MAX_BYTES) return 'The recording must be 10 MB or smaller.'
  return ''
}

// Owns the voice-recording picker state: the selected file, its preview audio
// element, length validation, and the error message shown to the visitor.
export function useVoiceRecording() {
  const [recording, setRecording] = useState(null)
  const [error, setError] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const audioRef = useRef(null)
  const fileInputRef = useRef(null)
  const objectUrlRef = useRef('')
  const checkIdRef = useRef(0)

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  const stopAudio = useCallback(() => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = ''
    if (audioRef.current) {
      audioRef.current.removeAttribute('src')
      audioRef.current.load()
    }
  }, [])

  const handleChange = useCallback(
    async (event) => {
      const file = event.target.files?.[0] ?? null
      const checkId = ++checkIdRef.current
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
    checkIdRef.current += 1
    setRecording(null)
    setError('')
    setIsChecking(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    stopAudio()
  }, [stopAudio])

  const play = useCallback(() => {
    if (!audioRef.current || !recording || error) return
    audioRef.current.currentTime = 0
    audioRef.current.play()
  }, [recording, error])

  // Returns the message to show when the form is submitted, or '' when the
  // recording is ready to send.
  const validateBeforeSubmit = useCallback(() => {
    if (isChecking) return 'Please wait while we check your recording.'
    return getRecordingError(recording) || error
  }, [isChecking, recording, error])

  return {
    audioRef,
    error,
    fileInputRef,
    handleChange,
    isChecking,
    play,
    recording,
    remove,
    setError,
    validateBeforeSubmit,
  }
}
