import { Router } from 'express'
import { env } from '../config/env.js'
import { applyDecision } from '../services/decisions.js'
import { answerCallback, markOwnerMessageDecided } from '../services/telegram.js'

export const telegramRouter = Router()

// Telegram calls this URL for every bot update. Register it with
//   npm run telegram:webhook -- https://your-api.example.com
// See also src/scripts/set-webhook.js.
telegramRouter.post('/webhook', async (req, res, next) => {
  try {
    // Only accept calls that carry the secret we registered with Telegram.
    if (env.telegramWebhookSecret && req.get('X-Telegram-Bot-Api-Secret-Token') !== env.telegramWebhookSecret) {
      return res.status(401).json({ message: 'Invalid webhook secret.' })
    }

    const callback = req.body?.callback_query
    // Telegram also sends other update types; acknowledge and ignore them.
    if (!callback) return res.status(200).json({ ok: true })

    const [tag, id, action] = String(callback.data ?? '').split(':')
    if (tag !== 'reg' || !Number.isInteger(Number(id)) || !['accept', 'reject'].includes(action)) {
      await answerCallback(callback.id, 'Unknown action.')
      return res.status(200).json({ ok: true })
    }

    const nextStatus = action === 'accept' ? 'offered' : 'rejected'
    const decidedBy = callback.from?.first_name ?? 'owner'
    const result = await applyDecision(Number(id), nextStatus, { notes: `Decided in Telegram by ${decidedBy}` })

    if (!result.found) {
      await answerCallback(callback.id, 'Registration not found.')
      return res.status(200).json({ ok: true })
    }
    if (!result.changed) {
      await answerCallback(callback.id, 'Already decided.')
      return res.status(200).json({ ok: true })
    }

    await answerCallback(
      callback.id,
      nextStatus === 'offered'
        ? 'Place offered — the applicant must accept the private link.'
        : 'Not selected — customer emailed.',
    )
    await markOwnerMessageDecided(
      callback.message?.message_id,
      result.registration,
      { id: result.registration.offer_id, title: result.registration.offer_title },
      nextStatus,
    )

    return res.status(200).json({ ok: true })
  } catch (error) {
    return next(error)
  }
})
