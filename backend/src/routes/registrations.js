import path from 'node:path'
import { createReadStream } from 'node:fs'
import { Router } from 'express'
import { z } from 'zod'
import { env } from '../config/env.js'
import { pool, query } from '../db/database.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { formLimiter } from '../middleware/rateLimit.js'
import { uploadVoice, verifyAudioSignature } from '../middleware/upload.js'
import { applyDecision } from '../services/decisions.js'
import { sendEmail, confirmationEmail } from '../services/email.js'
import { notifyNewRegistration, notifyOwnerOfWaitlist, storeVoiceFile } from '../services/telegram.js'

export const registrationsRouter = Router()

const emptyToUndefined = (value) => (value === '' || value === null || value === undefined ? undefined : value)
const optionalNumber = (min, max) => z.preprocess(emptyToUndefined, z.coerce.number().int().min(min).max(max).optional())
const optionalText = (max) => z.preprocess(emptyToUndefined, z.string().trim().max(max).optional())

const registrationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  age: optionalNumber(13, 120),
  language: optionalText(60),
  level: optionalText(60),
  residence: optionalText(160),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(6).max(40),
  offerSlug: z.string().trim().min(1).max(80),
})

const statusSchema = z.object({
  status: z.enum(['new', 'contacted', 'accepted', 'rejected']),
  notes: z.string().trim().max(2000).optional(),
})

const acceptsTrue = (value) => value === 'on' || value === 'true' || value === '1' || value === true

function mapRegistration(row) {
  return {
    id: row.id,
    offerId: row.offer_id,
    offerSlug: row.slug,
    name: row.name,
    age: row.age,
    language: row.language,
    level: row.level,
    residence: row.residence,
    email: row.email,
    phone: row.phone,
    voiceUrl: row.voice_path ? `/registrations/${row.id}/voice` : null,
    status: row.status,
    notes: row.notes,
    whatsappConfirmed: row.whatsapp_confirmed,
    createdAt: row.created_at,
  }
}

// --- Public: submit a registration -----------------------------------------

registrationsRouter.post('/', formLimiter, uploadVoice, verifyAudioSignature, async (req, res, next) => {
  const client = await pool.connect()
  try {
    if (!acceptsTrue(req.body.consent)) {
      return res.status(400).json({ message: 'Please accept the consent statement to continue.' })
    }

    const input = registrationSchema.parse(req.body)

    const { rows: offerRows } = await client.query('SELECT * FROM offers WHERE slug = $1', [input.offerSlug])
    const offer = offerRows[0]
    if (!offer) return res.status(404).json({ message: 'Offer not found.' })

    if (offer.status !== 'active' || offer.seats_taken >= offer.seats_total) {
      return res.status(409).json({ message: 'This offer is sold out. Please join the waitlist instead.' })
    }

    await client.query('BEGIN')

    const { rows: duplicates } = await client.query(
      `SELECT 1 FROM registrations
       WHERE offer_id = $1 AND (email = $2 OR phone = $3)
         AND created_at > now() - make_interval(hours => $4::int)
       LIMIT 1`,
      [offer.id, input.email, input.phone, env.duplicateWindowHours],
    )
    if (duplicates.length > 0) {
      await client.query('ROLLBACK')
      return res.status(409).json({ message: 'You have already registered for this offer. We will contact you soon.' })
    }

    const { rows: insertedRows } = await client.query(
      `INSERT INTO registrations (offer_id, name, age, language, level, residence, email, phone, voice_mime)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        offer.id,
        input.name,
        input.age ?? null,
        input.language ?? null,
        input.level ?? null,
        input.residence ?? null,
        input.email,
        input.phone,
        req.file?.mimetype ?? null,
      ],
    )
    const registration = insertedRows[0]

    await client.query(
      `UPDATE offers
       SET seats_taken = seats_taken + 1,
           status = CASE WHEN seats_taken + 1 >= seats_total THEN 'soldout' ELSE status END,
           updated_at = now()
       WHERE id = $1`,
      [offer.id],
    )

    await client.query('COMMIT')

    // Store the voice note and remember its path.
    if (req.file) {
      const filename = await storeVoiceFile(registration.id, req.file)
      await query('UPDATE registrations SET voice_path = $1 WHERE id = $2', [filename, registration.id])
      registration.voice_path = filename
    }

    // Notify the owner and confirm to the customer. Both never throw.
    const messageId = await notifyNewRegistration({
      registration: registration,
      offer: offer,
      voice: req.file,
    })
    if (messageId) {
      await query('UPDATE registrations SET telegram_message_id = $1 WHERE id = $2', [messageId, registration.id])
    }

    const confirmation = await confirmationEmail({
      name: registration.name,
      offer: offer.title,
      offerSlug: offer.slug,
    })
    await sendEmail({
      to: registration.email,
      subject: confirmation.subject,
      text: confirmation.text,
      html: confirmation.html,
      registrationId: registration.id,
      type: 'customer_confirmation',
    })

    res.status(201).json({ ok: true, id: registration.id })
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // already committed or rolled back
    }
    next(error)
  } finally {
    client.release()
  }
})

// --- Admin: list and update registrations ----------------------------------

registrationsRouter.get('/', requireAdmin, async (req, res, next) => {  try {
    const clauses = []
    const params = []

    if (req.query.status && req.query.status !== 'All') {
      params.push(String(req.query.status).toLowerCase())
      clauses.push(`r.status = $${params.length}`)
    }
    if (req.query.offer) {
      params.push(String(req.query.offer))
      clauses.push(`o.slug = $${params.length}`)
    }
    if (req.query.q) {
      params.push(`%${String(req.query.q)}%`)
      clauses.push(`(r.name ILIKE $${params.length} OR r.email ILIKE $${params.length} OR r.phone ILIKE $${params.length})`)
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    // The dashboard shows, filters, and exports this list in one go, so the
    // response is capped rather than unbounded. 1000 is far above what a
    // single-owner business sees in a season; paging is the next step if it is
    // ever reached (the newest rows are the ones that matter).
    const { rows } = await query(
      `SELECT r.*, o.slug FROM registrations r JOIN offers o ON o.id = r.offer_id ${where} ORDER BY r.created_at DESC LIMIT 1000`,
      params,
    )
    res.json(rows.map(mapRegistration))
  } catch (error) {
    next(error)
  }
})

registrationsRouter.patch('/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid registration id.' })

    const patch = statusSchema.parse(req.body)
    // Shared with the Telegram webhook, so a status change made here also emails
    // the customer when it is an accept or reject.
    const result = await applyDecision(id, patch.status, { notes: patch.notes })
    if (!result.found) return res.status(404).json({ message: 'Registration not found.' })

    res.json(mapRegistration({ ...result.registration, slug: result.registration.offer_slug }))
  } catch (error) {
    next(error)
  }
})

// Voice notes are personal data, so they are streamed only to a signed-in admin.
registrationsRouter.get('/:id/voice', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid registration id.' })

    const { rows } = await query('SELECT voice_path, voice_mime FROM registrations WHERE id = $1', [id])
    const row = rows[0]
    if (!row || !row.voice_path) return res.status(404).json({ message: 'No recording for this registration.' })

    res.type(row.voice_mime || 'audio/mpeg')
    createReadStream(path.resolve(env.uploadDir, row.voice_path)).on('error', () => res.sendStatus(404)).pipe(res)
  } catch (error) {
    next(error)
  }
})

// --- Public: join a waitlist ------------------------------------------------
// Mounted separately at /api/waitlist (see src/index.js).

export const waitlistRouter = Router()

const waitlistSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(40),
  offerSlug: z.string().trim().min(1).max(80),
})

waitlistRouter.post('/', formLimiter, async (req, res, next) => {
  try {
    const input = waitlistSchema.parse(req.body)

    const { rows } = await query('SELECT id, title FROM offers WHERE slug = $1', [input.offerSlug])
    const offer = rows[0]
    if (!offer) return res.status(404).json({ message: 'Offer not found.' })

    await query('INSERT INTO waitlist (offer_id, name, phone) VALUES ($1, $2, $3)', [offer.id, input.name, input.phone])
    await notifyOwnerOfWaitlist({ name: input.name, phone: input.phone, offer })

    res.status(201).json({ ok: true })
  } catch (error) {
    next(error)
  }
})
