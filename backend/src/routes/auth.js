import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { env } from '../config/env.js'
import { query } from '../db/database.js'
import { loginLimiter } from '../middleware/rateLimit.js'

export const authRouter = Router()

const credentialsSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(200),
  // Opt-in: a normal sign-in remains a browser-session cookie, while the
  // dashboard's checked "Keep me signed in" box sends true.
  remember: z.boolean().optional().default(false),
})

authRouter.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password, remember } = credentialsSchema.parse(req.body)

    const { rows } = await query('SELECT id, email, password_hash FROM admins WHERE email = $1', [email.toLowerCase()])
    const admin = rows[0]

    // Always compare against something so a missing account and a wrong password
    // take a similar amount of time.
    const hash = admin?.password_hash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinva'
    const ok = await bcrypt.compare(password, hash)
    if (!admin || !ok) return res.status(401).json({ message: 'Incorrect email or password.' })

    // Issue a fresh session id after a successful password check so a session
    // id planted before sign-in cannot be reused as an authenticated session.
    await new Promise((resolve, reject) => {
      req.session.regenerate((error) => (error ? reject(error) : resolve()))
    })

    req.session.admin = { id: admin.id, email: admin.email }
    if (remember) {
      req.session.cookie.maxAge = env.sessionRememberDays * 24 * 60 * 60 * 1000
    } else {
      // Drop the middleware's maxAge for this session, leaving a cookie that
      // the browser discards when it closes.
      req.session.cookie.maxAge = null
    }
    res.json({ ok: true, admin: { email: admin.email } })
  } catch (error) {
    next(error)
  }
})

authRouter.post('/logout', (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error)
    res.clearCookie('enrollhub.sid')
    res.status(204).end()
  })
})

authRouter.get('/me', (req, res) => {
  if (!req.session?.admin) return res.status(401).json({ message: 'Not signed in.' })
  res.json({ email: req.session.admin.email })
})
