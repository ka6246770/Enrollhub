import path from 'node:path'
import { createReadStream } from 'node:fs'
import { rm } from 'node:fs/promises'
import { Router } from 'express'
import { z } from 'zod'
import { env } from '../config/env.js'
import { pool, query } from '../db/database.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { formLimiter } from '../middleware/rateLimit.js'
import { uploadVoice, verifyAudioSignature } from '../middleware/upload.js'
import { applyDecision } from '../services/decisions.js'
import { confirmationEmail, ownerRegistrationEmail, sendEmail, siteUrl } from '../services/email.js'
import { closeExpiredOffers } from '../services/offers.js'
import { notifyNewRegistration, storeVoiceFile } from '../services/telegram.js'
import { createStatusToken } from '../services/tokens.js'

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
  status: z.enum(['new', 'contacted', 'offered', 'accepted', 'rejected', 'declined']).optional(),
  notes: z.preprocess(
    (value) => (value === undefined ? undefined : value === '' || value === null ? null : value),
    z.string().trim().max(4000).nullable().optional(),
  ),
  followUpAt: z.preprocess(
    (value) => (value === '' || value === undefined ? undefined : value === null ? null : value),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid follow-up date.').nullable().optional(),
  ),
}).refine((value) => Object.values(value).some((item) => item !== undefined), {
  message: 'Nothing to update.',
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
    hasRecording: Boolean(row.voice_path),
    status: row.status,
    notes: row.notes,
    followUpAt: row.follow_up_at,
    statusToken: row.status_token,
    offeredAt: row.offered_at,
    respondedAt: row.responded_at,
    whatsappConfirmed: row.whatsapp_confirmed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function publicStatus(response) {
  return {
    ...response,
    statusPath: response.statusUrl ? new URL(response.statusUrl).pathname : null,
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

    // Date-driven closure is applied before the offer is read, so a stale
    // `active` row cannot accept an application after its closing date.
    await closeExpiredOffers()

    const { rows: offerRows } = await client.query('SELECT * FROM offers WHERE slug = $1', [input.offerSlug])
    const offer = offerRows[0]
    if (!offer) return res.status(404).json({ message: 'Offer not found.' })

    if (offer.status === 'paused') {
      return res.status(409).json({ message: 'Registration is paused for this offer. Please check back later.' })
    }
    if (offer.status === 'closed') {
      return res.status(409).json({ message: 'This offer is no longer accepting applications.' })
    }
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

    const statusToken = createStatusToken('reg')
    const { rows: insertedRows } = await client.query(
      `INSERT INTO registrations (offer_id, name, age, language, level, residence, email, phone, voice_mime, status_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
        statusToken,
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

    // Notify the owner and confirm to the customer. Nothing here throws: a
    // notification failure must not fail the registration.
    const messageId = await notifyNewRegistration({
      registration: registration,
      offer: offer,
      voice: req.file,
    })
    if (messageId) {
      await query('UPDATE registrations SET telegram_message_id = $1 WHERE id = $2', [messageId, registration.id])
    }

    // The owner also gets the whole form by email, recording attached. This is
    // the copy that can be searched later; it is skipped while OWNER_EMAIL is
    // empty and fails without affecting the visitor.
    if (env.ownerEmail) {
      const ownerCopy = await ownerRegistrationEmail({ registration, offer, voice: req.file })
      await sendEmail({
        to: env.ownerEmail,
        subject: ownerCopy.subject,
        text: ownerCopy.text,
        html: ownerCopy.html,
        attachments: ownerCopy.attachments,
        registrationId: registration.id,
        type: 'owner_email',
      })
    }

    const statusUrl = `${siteUrl()}/status/${statusToken}`
    const confirmation = await confirmationEmail({
      name: registration.name,
      offer: offer.title,
      offerSlug: offer.slug,
      statusLink: statusUrl,
    })
    await sendEmail({
      to: registration.email,
      subject: confirmation.subject,
      text: confirmation.text,
      html: confirmation.html,
      registrationId: registration.id,
      type: 'customer_confirmation',
    })

    res.status(201).json({ ok: true, id: registration.id, statusPath: `/status/${statusToken}` })
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

registrationsRouter.get('/', requireAdmin, async (req, res, next) => {
  try {
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
    if (req.query.date) {
      params.push(String(req.query.date))
      clauses.push(`r.created_at::date = $${params.length}::date`)
    }
    if (req.query.recording === 'yes') clauses.push('r.voice_path IS NOT NULL')
    if (req.query.recording === 'no') clauses.push('r.voice_path IS NULL')
    if (req.query.followUp === 'due') {
      clauses.push('r.follow_up_at IS NOT NULL AND r.follow_up_at <= CURRENT_DATE')
    }
    if (req.query.attention === '1') {
      clauses.push(`(r.status = 'new' OR (r.follow_up_at IS NOT NULL AND r.follow_up_at <= CURRENT_DATE))`)
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
    if (patch.status) {
      // Shared with the Telegram webhook, so a status change made here also
      // emails the customer. `accepted` and `declined` are rejected by the
      // service: the applicant must answer the private link.
      const result = await applyDecision(id, patch.status, {
        notes: patch.notes,
        followUpAt: patch.followUpAt,
      })
      if (!result.found) return res.status(404).json({ message: 'Registration not found.' })

      return res.json({
        ...mapRegistration({ ...result.registration, slug: result.registration.offer_slug }),
        ...publicStatus(result),
      })
    }

    const sets = ['updated_at = now()']
    const params = [id]
    if (patch.notes !== undefined) {
      params.push(patch.notes)
      sets.push(`notes = $${params.length}`)
    }
    if (patch.followUpAt !== undefined) {
      params.push(patch.followUpAt)
      sets.push(`follow_up_at = $${params.length}`)
    }

    const { rows } = await query(
      `UPDATE registrations SET ${sets.join(', ')} WHERE id = $1
       RETURNING id, offer_id, name, age, language, level, residence, email, phone, voice_path,
                 status, notes, follow_up_at, status_token, offered_at, responded_at,
                 whatsapp_confirmed, created_at, updated_at,
                 (SELECT slug FROM offers WHERE offers.id = registrations.offer_id) AS slug`,
      params,
    )
    if (!rows[0]) return res.status(404).json({ message: 'Registration not found.' })
    res.json(mapRegistration(rows[0]))
  } catch (error) {
    next(error)
  }
})

// Admin: create (or reuse) the applicant's private status link. Useful for an
// application received before status links existed, and for resending a link
// after an email bounced.
registrationsRouter.post('/:id/status-link', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid registration id.' })

    const { rows } = await query('SELECT id, status_token FROM registrations WHERE id = $1', [id])
    const row = rows[0]
    if (!row) return res.status(404).json({ message: 'Registration not found.' })

    const token = row.status_token || createStatusToken('reg')
    if (!row.status_token) {
      await query('UPDATE registrations SET status_token = $2, updated_at = now() WHERE id = $1', [id, token])
    }

    res.json({
      statusToken: token,
      statusPath: `/status/${token}`,
      statusUrl: `${siteUrl()}/status/${token}`,
    })
  } catch (error) {
    next(error)
  }
})

// Admin: fulfil a privacy request. This removes the recording from disk, the
// applicant's message log entries, and the registration itself, then frees the
// seat it occupied so the public offer page reflects the change immediately.
registrationsRouter.delete('/:id', requireAdmin, async (req, res, next) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid registration id.' })

  const client = await pool.connect()
  let voicePath = null
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      'SELECT id, offer_id, voice_path FROM registrations WHERE id = $1 FOR UPDATE',
      [id],
    )
    const registration = rows[0]
    if (!registration) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Registration not found.' })
    }
    voicePath = registration.voice_path

    if (voicePath) {
      const file = path.join(path.resolve(env.uploadDir), path.basename(voicePath))
      try {
        await rm(file, { force: true })
      } catch (error) {
        if (error.code !== 'ENOENT') throw error
      }
    }

    await client.query('DELETE FROM messages_log WHERE registration_id = $1', [id])
    await client.query(
      `UPDATE offers
       SET seats_taken = GREATEST(seats_taken - 1, 0),
           status = CASE
             WHEN status = 'soldout' AND GREATEST(seats_taken - 1, 0) < seats_total THEN 'active'
             ELSE status
           END,
           updated_at = now()
       WHERE id = $1`,
      [registration.offer_id],
    )
    await client.query('DELETE FROM registrations WHERE id = $1', [id])
    await client.query('COMMIT')

    res.json({
      ok: true,
      deleted: true,
      recordingRemoved: Boolean(voicePath),
      message: 'Applicant details and recording deleted.',
    })
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
