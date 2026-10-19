import 'dotenv/config'

const asNumber = (value, fallback) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const SAME_SITE_VALUES = ['lax', 'strict', 'none']

// Deployment knobs. COOKIE_SAMESITE must be 'none' (plus HTTPS) when the
// frontend and the API live on different sites, for example a Vercel frontend
// talking to a Render API.
const asSameSite = (value) => {
  const normalised = String(value ?? '').trim().toLowerCase()
  return SAME_SITE_VALUES.includes(normalised) ? normalised : 'lax'
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: asNumber(process.env.PORT, 3001),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL ?? '',

  sessionSecret: process.env.SESSION_SECRET ?? 'dev-only-secret-change-me',
  adminEmail: process.env.ADMIN_EMAIL ?? '',
  cookieSameSite: asSameSite(process.env.COOKIE_SAMESITE),

  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID ?? '',
  telegramSecondChatId: process.env.TELEGRAM_SECOND_CHAT_ID ?? '',
  telegramWebhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET ?? '',

  resendApiKey: process.env.RESEND_API_KEY ?? '',
  mailFrom: process.env.MAIL_FROM ?? 'EnrollHub <onboarding@resend.dev>',
  // A second copy of every registration, with the recording attached. Unlike
  // the customer emails this is an internal alert, so it is off when empty.
  ownerEmail: process.env.OWNER_EMAIL ?? '',

  uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
  maxUploadBytes: asNumber(process.env.MAX_UPLOAD_BYTES, 10 * 1024 * 1024),
  duplicateWindowHours: asNumber(process.env.DUPLICATE_WINDOW_HOURS, 6),

  // Voice notes are personal data: the retention job (npm run retention:voice)
  // deletes recordings older than this many days.
  voiceRetentionDays: asNumber(process.env.VOICE_RETENTION_DAYS, 180),
}

// Optional integrations. The server runs without them; it just logs instead.
export const capabilities = {
  telegram: Boolean(env.telegramBotToken && env.telegramChatId),
  email: Boolean(env.resendApiKey),
}

// A BotFather token looks like "123456789:AA...". Checking the shape costs
// nothing and catches the commonest mistake — a token pasted without its
// "<bot_id>:" prefix — at boot, instead of silently failing on every
// registration. (It cannot prove the token is still valid; only getMe can.)
const TELEGRAM_TOKEN_PATTERN = /^\d+:[\w-]{30,}$/

export const configWarnings = []

if (env.telegramBotToken && !TELEGRAM_TOKEN_PATTERN.test(env.telegramBotToken)) {
  configWarnings.push(
    'TELEGRAM_BOT_TOKEN does not look like a BotFather token (expected "<bot_id>:<secret>"), so every Telegram alert will fail. Copy the full token from @BotFather.',
  )
} else if (capabilities.telegram && !env.telegramSecondChatId) {
  configWarnings.push('TELEGRAM_SECOND_CHAT_ID is empty, so no second person will receive registrations.')
}

export function assertRequiredEnv() {
  if (!env.databaseUrl) {
    throw new Error('DATABASE_URL is required. Copy .env.example to .env and set it.')
  }
  if (env.isProduction && env.sessionSecret === 'dev-only-secret-change-me') {
    throw new Error('SESSION_SECRET must be set to a long random value in production.')
  }
}

export function logCapabilities() {
  const state = (on) => (on ? 'configured' : 'not configured')
  console.log('Integrations:')
  console.log(`  • telegram : ${state(capabilities.telegram)}${capabilities.telegram ? '' : ' (details will be logged to the console instead)'}`)
  console.log(`  • email    : ${state(capabilities.email)}${capabilities.email ? '' : ' (emails will be skipped)'}`)
  for (const warning of configWarnings) console.warn(`  ! ${warning}`)
}
