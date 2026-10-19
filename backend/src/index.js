import path from 'node:path'
import cors from 'cors'
import express from 'express'
import session from 'express-session'
import { ZodError } from 'zod'
import { assertRequiredEnv, capabilities, configWarnings, env, logCapabilities } from './config/env.js'
import { authRouter } from './routes/auth.js'
import { messagesRouter } from './routes/messages.js'
import { offersRouter } from './routes/offers.js'
import { registrationsRouter, waitlistRouter } from './routes/registrations.js'
import { telegramRouter } from './routes/telegram.js'
import { emailDesignStatus } from './services/email.js'

assertRequiredEnv()

const app = express()

// Behind a hosting proxy (Render/Railway) this makes rate limiting and secure
// cookies behave correctly.
app.set('trust proxy', 1)

// FRONTEND_URL may list several origins, comma-separated (for example both
// http://localhost:5173 and http://127.0.0.1:5173 during development).
const allowedOrigins = env.frontendUrl.split(',').map((origin) => origin.trim()).filter(Boolean)

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
    const error = new Error(`Origin ${origin} is not allowed by CORS.`)
    error.status = 403
    return callback(error)
  },
  credentials: true,
}))

app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(session({
  name: 'enrollhub.sid',
  secret: env.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    // 'none' is required when the frontend and API are on different sites; it
    // only works together with secure (HTTPS) cookies.
    sameSite: env.cookieSameSite,
    secure: env.isProduction || env.cookieSameSite === 'none',
    maxAge: 8 * 60 * 60 * 1000,
  },
}))

// `warnings` flags configuration that is present but looks wrong (for example a
// truncated Telegram token) so a deploy can be checked without reading the logs.
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    capabilities,
    warnings: configWarnings,
    emailDesigns: emailDesignStatus(),
  })
})

app.use('/api/offers', offersRouter)
app.use('/api/registrations', registrationsRouter)
app.use('/api/waitlist', waitlistRouter)
app.use('/api/messages', messagesRouter)
app.use('/api/auth', authRouter)
app.use('/api/telegram', telegramRouter)

app.use((req, res) => {
  res.status(404).json({ message: 'Not found.' })
})

// eslint-disable-next-line no-unused-vars -- Express needs the 4-argument shape.
app.use((error, req, res, next) => {
  if (error instanceof ZodError) {
    return res.status(400).json({ message: error.issues[0]?.message ?? 'Please check the form and try again.' })
  }
  if (error?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'The recording must be 10 MB or smaller.' })
  }
  if (error?.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ message: 'Unexpected file field in the form.' })
  }

  const status = error.status ?? 500
  if (status >= 500) console.error(error)
  res.status(status).json({ message: status >= 500 ? 'Something went wrong. Please try again.' : error.message })
})

// Vercel imports this module and mounts the app as a function, so the app must
// be the default export. A local `npm run dev` / `npm start` still needs a real
// HTTP server, so listen() is guarded to run only off-Vercel.
export default app

if (!process.env.VERCEL) {
  app.listen(env.port, () => {
    console.log(`EnrollHub API listening on http://localhost:${env.port}`)
    console.log(`Allowed frontend origin: ${env.frontendUrl}`)
    console.log(`Upload directory: ${path.resolve(env.uploadDir)}`)
    logCapabilities()

    const designs = emailDesignStatus()
    if (designs.missing.length > 0) {
      console.warn(
        `  ! email designs missing: ${designs.missing.join(', ')} — those emails will be sent as plain text. Run "npm run export" in emails/.`,
      )
    }
  })
}
