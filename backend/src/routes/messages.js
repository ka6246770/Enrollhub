import { Router } from 'express'
import { z } from 'zod'
import { capabilities } from '../config/env.js'
import { query } from '../db/database.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { formLimiter } from '../middleware/rateLimit.js'
import { renderPreview, SAMPLE_VALUES, getTemplateBody, listTemplates, saveTemplate } from '../services/messageTemplates.js'
import { resendLogEntry } from '../services/notifications.js'
import { notifyOwnerOfContact } from '../services/telegram.js'

export const messagesRouter = Router()

const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  message: z.string().trim().min(5).max(4000),
})

// Public: the contact form.
messagesRouter.post('/', formLimiter, async (req, res, next) => {
  try {
    const input = contactSchema.parse(req.body)
    await query(
      'INSERT INTO contact_messages (name, email, message) VALUES ($1, $2, $3)',
      [input.name, input.email, input.message],
    )
    await notifyOwnerOfContact(input)
    res.status(201).json({ ok: true })
  } catch (error) {
    next(error)
  }
})

// Admin: which channels are configured, and the current message texts. The
// Messages page edits these; a saved text is used by the next message.
messagesRouter.get('/status', requireAdmin, async (req, res, next) => {
  try {
    res.json({
      channels: { telegram: capabilities.telegram, email: capabilities.email },
      templates: await listTemplates(),
      sample: SAMPLE_VALUES,
    })
  } catch (error) {
    next(error)
  }
})

// Admin: save one message text. Rejects an unknown key (404), an empty or
// oversized body, a variable that does not exist, and a body that dropped a
// variable the message needs (400) — see validateTemplateBody.
//
// The response reads the stored text back through the same path a real send
// uses, so `preview` proves the edit is live rather than merely stored.
messagesRouter.patch('/templates/:key', requireAdmin, async (req, res, next) => {
  try {
    const key = String(req.params.key)
    const body = await saveTemplate(key, req.body?.body)
    const stored = await getTemplateBody(key)
    res.json({ key, body, preview: renderPreview(stored), updatedAt: new Date().toISOString() })
  } catch (error) {
    next(error)
  }
})

// Admin: the notification log shown on the Messages page.
messagesRouter.get('/', requireAdmin, async (req, res, next) => {
  try {
    const clauses = []
    const params = []
    if (req.query.status && req.query.status !== 'All') {
      params.push(String(req.query.status).toLowerCase())
      clauses.push(`m.status = $${params.length}`)
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    const { rows } = await query(
      `SELECT m.id, m.registration_id, m.channel, m.type, m.recipient, m.status, m.error, m.created_at,
              r.name AS registration_name
       FROM messages_log m
       LEFT JOIN registrations r ON r.id = m.registration_id
       ${where}
       ORDER BY m.created_at DESC
       LIMIT 200`,
      params,
    )
    res.json(rows.map((row) => ({
      id: row.id,
      registrationId: row.registration_id,
      registrationName: row.registration_name,
      channel: row.channel,
      type: row.type,
      recipient: row.recipient,
      status: row.status,
      error: row.error,
      createdAt: row.created_at,
    })))
  } catch (error) {
    next(error)
  }
})

// Admin: re-send a failed (or skipped) notification.
messagesRouter.post('/:id/retry', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid message id.' })

    const { rows } = await query('SELECT * FROM messages_log WHERE id = $1', [id])
    const entry = rows[0]
    if (!entry) return res.status(404).json({ message: 'Message not found.' })

    await resendLogEntry(entry)
    res.status(202).json({ ok: true, message: 'Retry sent.' })
  } catch (error) {
    next(error)
  }
})
