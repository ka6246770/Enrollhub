import rateLimit from 'express-rate-limit'
import { env } from '../config/env.js'

const reject = (message) => (req, res) => res.status(429).json({ message })

const shared = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
}

// Registration, waitlist, and contact forms share this per-IP limit. 60 per
// hour still blocks a script, while a household or a shared factory connection
// can submit for several people. Set FORM_RATE_LIMIT to tune it per deploy.
export const formLimiter = rateLimit({
  ...shared,
  windowMs: 60 * 60 * 1000,
  limit: env.formRateLimit,
  handler: reject('Too many submissions from this address. Please try again in about an hour.'),
})

// Admin login: slows password guessing. Successful attempts are not counted.
export const loginLimiter = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  handler: reject('Too many sign-in attempts. Please wait a few minutes and try again.'),
})

// Private status links: a real applicant may refresh a few times, while a
// scanner enumerating random tokens is stopped quickly. Tokens still carry 192
// bits of entropy; this is defence in depth, not the only protection.
export const lookupLimiter = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000,
  limit: 120,
  handler: reject('Too many status checks from this address. Please wait a few minutes and try again.'),
})

// Public reference lookup: 10 tries per 15 minutes. Paired with the reference
// code, this makes guessing another person's code and email impractical.
export const trackingLimiter = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  handler: reject('Too many status checks. Please wait 15 minutes and try again.'),
})
