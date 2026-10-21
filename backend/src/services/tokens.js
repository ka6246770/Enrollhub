import { randomBytes } from 'node:crypto'

// Private links are bearer tokens. The prefix makes a token recognisable in the
// status route without exposing which table it belongs to. 24 random bytes is
// 192 bits, far beyond guessing range for a URL.
export function createStatusToken(kind) {
  return `${kind}_${randomBytes(24).toString('base64url')}`
}
