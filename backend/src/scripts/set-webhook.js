// Registers (or inspects) the Telegram webhook.
//
//   npm run telegram:webhook                          # show the current webhook
//   npm run telegram:webhook -- https://api.example.com
//
// The base URL must be reachable over HTTPS from Telegram.
import { env } from '../config/env.js'
import { callTelegramApi } from '../services/telegram.js'

if (!env.telegramBotToken) {
  console.error('TELEGRAM_BOT_TOKEN is required (set it in .env).')
  process.exit(1)
}

const base = process.argv[2]

if (!base) {
  const info = await callTelegramApi('getWebhookInfo', {})
  console.log(JSON.stringify(info, null, 2))
  process.exit(0)
}

const url = `${base.replace(/\/$/, '')}/api/telegram/webhook`
const payload = { url, allowed_updates: ['callback_query'] }
if (env.telegramWebhookSecret) payload.secret_token = env.telegramWebhookSecret

await callTelegramApi('setWebhook', payload)
console.log(`✓ webhook registered: ${url}`)
