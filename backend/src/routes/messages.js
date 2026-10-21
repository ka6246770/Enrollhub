import { Router } from 'express'
import { z } from 'zod'
import { capabilities, env } from '../config/env.js'
import { query, recordMessage } from '../db/database.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { formLimiter } from '../middleware/rateLimit.js'
import { contactReportEmail, sendEmail } from '../services/email.js'
import { renderPreview, SAMPLE_VALUES, getTemplateBody, listTemplates, saveTemplate } from '../services/messageTemplates.js'
import { resendLogEntry } from '../services/notifications.js'
import { notifyOwnerOfContact } from '../services/telegram.js'

export const messagesRouter = Router()

const CONTACT_TYPES = ['problem', 'comment', 'question']
const CONTACT_TYPE_LABELS = {
  problem: 'Problem',
  comment: 'Comment',
  question: 'Question',
}

const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  // Problem reports and comments do not require an address; a question does.
  email: z.string().trim().max(200).optional().default(''),
  message: z.string().trim().min(5).max(4000),
  type: z.enum(CONTACT_TYPES).optional().default('question'),
  pageUrl: z.string().trim().max(500).optional().default(''),
  userAgent: z.string().trim().max(500).optional().default(''),
}).superRefine((value, ctx) => {
  if (value.type === 'question' && !value.email) {
    ctx.addIssue({
      code: 'custom',
      path: ['email'],
      message: 'Email is required for a question.',
    })
  }
  if (value.email && !z.string().email().safeParse(value.email).success) {
    ctx.addIssue({
      code: 'custom',
      path: ['email'],
      message: 'Enter a valid email address.',
    })
  }
})

// Public: the contact form.
messagesRouter.post('/', formLimiter, async (req, res, next) => {
  try {
    const input = contactSchema.parse(req.body)
    const { rows } = await query(
      `INSERT INTO contact_messages (name, email, message, type, page_url, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING created_at`,
      [input.name, input.email || null, input.message, input.type, input.pageUrl, input.userAgent],
    )

    const time = `${new Date(rows[0].created_at).toLocaleString('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Africa/Cairo',
    })} (Cairo)`
    const report = {
      type: input.type,
      typeLabel: CONTACT_TYPE_LABELS[input.type],
      name: input.name,
      email: input.email,
      message: input.message,
      pageUrl: input.pageUrl,
      userAgent: input.userAgent,
      time,
    }

    await notifyOwnerOfContact(report)

    // The report is already saved. A mail problem is logged and swallowed so
    // the visitor still sees success and the Telegram alert still goes out.
    try {
      const to = env.ownerNotifyEmail || env.adminEmail
      if (!to) {
        await recordMessage({ channel: 'email', type: 'contact_report', status: 'skipped' })
      } else {
        const mail = await contactReportEmail(report)
        await sendEmail({
          to,
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
          replyTo: mail.replyTo,
          type: 'contact_report',
        })
      }
    } catch (emailError) {
      console.error('[email] contact report failed:', emailError.message)
      await recordMessage({
        channel: 'email',
        type: 'contact_report',
        recipient: env.ownerNotifyEmail || env.adminEmail || null,
        status: 'failed',
        error: emailError.message,
      }).catch(() => {})
    }

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
      `SELECT m.id, m.registration_id, m.waitlist_id, m.channel, m.type, m.recipient, m.status, m.error, m.created_at,
              r.name AS registration_name,
              w.name AS waitlist_name
       FROM messages_log m
       LEFT JOIN registrations r ON r.id = m.registration_id
       LEFT JOIN waitlist w ON w.id = m.waitlist_id
       ${where}
       ORDER BY m.created_at DESC
       LIMIT 200`,
      params,
    )
    res.json(rows.map((row) => ({
      id: row.id,
      registrationId: row.registration_id,
      waitlistId: row.waitlist_id,
      registrationName: row.registration_name ?? row.waitlist_name,
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
