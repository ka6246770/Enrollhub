import { randomInt } from 'node:crypto'

// Reference codes are read from an email or spoken over the phone, so 0/O and
// 1/I are left out. Eight characters from a 32-letter alphabet give roughly
// 1.1e12 combinations; the unique index still guards the rare collision.
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
const CODE_LENGTH = 8

export function createReferenceCode() {
  let code = ''
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    code += ALPHABET[randomInt(ALPHABET.length)]
  }
  return `ENR-${code}`
}

// Lookups ignore case and surrounding spaces, so "enr-7k3m9q" still works.
export function normalizeReference(value) {
  return String(value ?? '').trim().toUpperCase()
}
