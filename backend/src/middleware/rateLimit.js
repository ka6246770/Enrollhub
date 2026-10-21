import rateLimit from 'express-rate-limit'

const reject = (message) => (req, res) => res.status(429).json({ message })

const shared = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
}

// Registration, waitlist, and contact forms: 20 requests per IP per hour.
export const formLimiter = rateLimit({
  ...shared,
  windowMs: 60 * 60 * 1000,
  limit: 20,
  handler: reject('Too many submissions from this address. Please try again later.'),
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
