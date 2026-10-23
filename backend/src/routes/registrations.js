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
import { siteUrl } from '../services/email.js'
import { createRegistration } from '../services/registrationIntake.js'
import { createStatusToken } from '../services/tokens.js'

export const registrationsRouter = Router()

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
  try {
    const { registration, statusToken } = await createRegistration({
      form: req.body,
      voice: req.file,
    })
    res.status(201).json({ ok: true, id: registration.id, statusPath: `/status/${statusToken}` })
  } catch (error) {
    next(error)
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
