import path from 'node:path'
import multer from 'multer'
import { env } from '../config/env.js'

const ALLOWED_MIME = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
])

const ALLOWED_EXTENSION = new Set(['.mp3', '.m4a', '.wav'])

// Kept in memory so the route can both store the file and forward it to
// Telegram without writing twice. Phase E can add magic-byte sniffing.
export const uploadVoice = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadBytes, files: 1 },
  fileFilter(req, file, cb) {
    const extension = path.extname(file.originalname).toLowerCase()
    if (ALLOWED_MIME.has(file.mimetype) || ALLOWED_EXTENSION.has(extension)) {
      cb(null, true)
      return
    }
    const error = new Error('Choose an MP3, M4A, or WAV audio file.')
    error.status = 400
    cb(error)
  },
}).single('recording')

// Confirms the buffered bytes really look like an audio container, so a renamed
// file cannot get through on its extension alone.
export function verifyAudioSignature(req, res, next) {
  const buffer = req.file?.buffer
  if (!buffer?.length) return next()

  const tag = (offset, text) => buffer.subarray(offset, offset + text.length).toString('latin1') === text

  const isMp3 = tag(0, 'ID3') || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
  const isWav = tag(0, 'RIFF') && tag(8, 'WAVE')
  const isMp4 = tag(4, 'ftyp') // .m4a is an MP4 container

  if (!isMp3 && !isWav && !isMp4) {
    const error = new Error('That file does not look like an MP3, M4A, or WAV recording.')
    error.status = 400
    return next(error)
  }

  return next()
}
