import { Router } from 'express'
import { z } from 'zod'
import { pool, query } from '../db/database.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { formLimiter } from '../middleware/rateLimit.js'
import { sendEmail, siteUrl, waitlistEmail, waitlistOfferEmail } from '../services/email.js'
import { closeExpiredOffers } from '../services/offers.js'
import { notifyOwnerOfWaitlist } from '../services/telegram.js'
import { createStatusToken } from '../services/tokens.js'

export const waitlistRouter = Router()

const emptyToUndefined = (value) => (value === '' || value === null || value === undefined ? undefined : value)
const acceptsTrue = (value) => value === 'on' || value === 'true' || value === '1' || value === true

function mapWaitlist(row) {
  return {
    id: row.id,
    offerId: row.offer_id,
    offerSlug: row.slug,
    offerTitle: row.title,
    offerLocation: row.location,
    name: row.name,
    phone: row.phone,
    email: row.email,
    status: row.status,
    notes: row.notes,
    followUpAt: row.follow_up_at,
    placeOpenedOn: row.place_opened_on,
    statusToken: row.status_token,
    contactedAt: row.contacted_at,
    offeredAt: row.offered_at,
    respondedAt: row.responded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const waitlistSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(40),
  offerSlug: z.string().trim().min(1).max(80),
  consent: z.any().optional(),
  // Optional: the form asks for a phone number first. With an address, the person
  // also gets the waitlist confirmation email.
  email: z.preprocess(emptyToUndefined, z.string().trim().email('Enter a valid email address.').max(200).optional()),
})

// --- Public: join a waitlist ------------------------------------------------

waitlistRouter.post('/', formLimiter, async (req, res, next) => {
  try {
    const input = waitlistSchema.parse(req.body)
    if (!acceptsTrue(input.consent)) {
      return res.status(400).json({ message: 'Please agree to be contacted about this job.' })
    }

    await closeExpiredOffers()
    const { rows } = await query('SELECT id, title, slug, status FROM offers WHERE slug = $1', [input.offerSlug])
    const offer = rows[0]
    if (!offer) return res.status(404).json({ message: 'Offer not found.' })

    if (offer.status === 'paused') {
      return res.status(409).json({ message: 'Registration is paused for this offer. Please check back later.' })
    }
    if (offer.status === 'closed') {
      return res.status(409).json({ message: 'This offer is no longer accepting applications.' })
    }

    const email = input.email || null
    const { rows: inserted } = await query(
      `INSERT INTO waitlist (offer_id, name, phone, email)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [offer.id, input.name, input.phone, email],
    )
    const waitlistId = inserted[0].id
    await notifyOwnerOfWaitlist({ name: input.name, phone: input.phone, offer, waitlistId })

    // The owner is always alerted on Telegram; the joiner only hears back when
    // they left an address.
    if (email) {
      const mail = await waitlistEmail({
        name: input.name,
        offer: offer.title,
        offerSlug: offer.slug,
      })
      await sendEmail({
        to: email,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        waitlistId,
        type: 'waitlist',
      })
    }

    res.status(201).json({ ok: true })
  } catch (error) {
    next(error)
  }
})

// --- Admin: search, follow up and remove waitlist entries --------------------

waitlistRouter.get('/', requireAdmin, async (req, res, next) => {
  try {
    const clauses = []
    const params = []

    if (req.query.status && req.query.status !== 'All') {
      params.push(String(req.query.status).toLowerCase())
      clauses.push(`w.status = $${params.length}`)
    }
    if (req.query.offer) {
      params.push(String(req.query.offer))
      clauses.push(`o.slug = $${params.length}`)
    }
    if (req.query.q) {
      params.push(`%${String(req.query.q)}%`)
      clauses.push(`(w.name ILIKE $${params.length} OR w.phone ILIKE $${params.length} OR w.email ILIKE $${params.length})`)
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    const { rows } = await query(
      `SELECT w.*, o.slug, o.title, o.location
       FROM waitlist w
       JOIN offers o ON o.id = w.offer_id
       ${where}
       ORDER BY w.created_at DESC
       LIMIT 1000`,
      params,
    )
    res.json(rows.map(mapWaitlist))
  } catch (error) {
    next(error)
  }
})

const waitlistPatchSchema = z.object({
  status: z.enum(['waiting', 'contacted', 'offered', 'accepted', 'declined']).optional(),
  notes: z.preprocess(
    (value) => (value === undefined ? undefined : value === '' || value === null ? null : value),
    z.string().trim().max(4000).nullable().optional(),
  ),
  followUpAt: z.preprocess(
    (value) => (value === '' || value === undefined ? undefined : value === null ? null : value),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid follow-up date.').nullable().optional(),
  ),
  placeOpenedOn: z.preprocess(
    (value) => (value === '' || value === undefined ? undefined : value),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date.').nullable().optional(),
  ),
}).refine((value) => Object.values(value).some((item) => item !== undefined), {
  message: 'Nothing to update.',
})

// Offers are sent in bulk because an owner may have several likely candidates
// for one opening. The response returns the private link for each person, which
// the dashboard can copy into WhatsApp when no email address is available.
const offerSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).min(1).max(100),
  placeOpenedOn: z.preprocess(
    (value) => (value === '' || value === undefined ? undefined : value),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date.').nullable().optional(),
  ),
})

async function offerEntries(ids, placeOpenedOn) {
  const client = await pool.connect()
  const results = []
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `SELECT w.*, o.title, o.slug, o.location
       FROM waitlist w
       JOIN offers o ON o.id = w.offer_id
       WHERE w.id = ANY($1::int[])
       ORDER BY w.id
       FOR UPDATE OF w`,
      [ids],
    )

    for (const row of rows) {
      if (row.status === 'accepted' || row.status === 'declined') {
        results.push({
          id: row.id,
          name: row.name,
          skipped: true,
          reason: `Already ${row.status}.`,
        })
        continue
      }

      const token = row.status_token || createStatusToken('wl')
      await client.query(
        `UPDATE waitlist
         SET status = 'offered',
             status_token = $2,
             offered_at = now(),
             responded_at = NULL,
             place_opened_on = COALESCE($3::date, CURRENT_DATE),
             updated_at = now()
         WHERE id = $1`,
        [row.id, token, placeOpenedOn ?? null],
      )

      results.push({
        id: row.id,
        name: row.name,
        email: row.email,
        offer: row.title,
        offerSlug: row.slug,
        skipped: false,
        statusToken: token,
        statusPath: `/status/${token}`,
        statusUrl: `${siteUrl()}/status/${token}`,
      })
    }
    await client.query('COMMIT')
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // already committed or rolled back
    }
    throw error
  } finally {
    client.release()
  }

  for (const result of results) {
    if (result.skipped || !result.email) continue
    try {
      const mail = await waitlistOfferEmail({
        name: result.name,
        offer: result.offer,
        offerSlug: result.offerSlug,
        statusLink: result.statusUrl,
      })
      await sendEmail({
        to: result.email,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        waitlistId: result.id,
        type: 'waitlist_offer',
      })
      result.emailAttempted = true
    } catch (error) {
      console.error('[waitlist] offer email failed:', error.message)
      result.emailAttempted = false
    }
  }

  return results
}

waitlistRouter.post('/offer', requireAdmin, async (req, res, next) => {
  try {
    const input = offerSchema.parse(req.body)
    const results = await offerEntries(input.ids, input.placeOpenedOn)
    res.json({ results })
  } catch (error) {
    next(error)
  }
})

waitlistRouter.patch('/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid waitlist id.' })

    const patch = waitlistPatchSchema.parse(req.body)
    if (patch.status === 'accepted') {
      return res.status(400).json({
        message: 'A waitlist place is confirmed only after the applicant accepts their private link.',
      })
    }

    if (patch.status === 'offered') {
      const results = await offerEntries([id], patch.placeOpenedOn)
      const offered = results[0]
      if (!offered || offered.skipped) {
        return res.status(409).json({ message: offered?.reason || 'Could not offer this place.' })
      }
      if (patch.notes !== undefined || patch.followUpAt !== undefined) {
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
        await query(`UPDATE waitlist SET ${sets.join(', ')} WHERE id = $1`, params)
      }
      const { rows } = await query(
        `SELECT w.*, o.slug, o.title, o.location
         FROM waitlist w JOIN offers o ON o.id = w.offer_id WHERE w.id = $1`,
        [id],
      )
      return res.json({ ...mapWaitlist(rows[0]), ...offered })
    }

    const sets = ['updated_at = now()']
    const params = [id]
    if (patch.status !== undefined) {
      params.push(patch.status)
      sets.push(`status = $${params.length}`)
      if (patch.status === 'contacted') sets.push('contacted_at = now()')
      if (patch.status === 'declined') sets.push('responded_at = now()')
      if (patch.status === 'waiting') {
        sets.push('contacted_at = NULL', 'offered_at = NULL', 'responded_at = NULL')
      }
    }
    if (patch.notes !== undefined) {
      params.push(patch.notes)
      sets.push(`notes = $${params.length}`)
    }
    if (patch.followUpAt !== undefined) {
      params.push(patch.followUpAt)
      sets.push(`follow_up_at = $${params.length}`)
    }
    if (patch.placeOpenedOn !== undefined) {
      params.push(patch.placeOpenedOn)
      sets.push(`place_opened_on = $${params.length}`)
    }

    const { rows } = await query(
      `UPDATE waitlist SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
      params,
    )
    if (!rows[0]) return res.status(404).json({ message: 'Waitlist entry not found.' })

    const { rows: joined } = await query(
      `SELECT w.*, o.slug, o.title, o.location
       FROM waitlist w JOIN offers o ON o.id = w.offer_id WHERE w.id = $1`,
      [id],
    )
    res.json(mapWaitlist(joined[0]))
  } catch (error) {
    next(error)
  }
})

waitlistRouter.delete('/:id', requireAdmin, async (req, res, next) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid waitlist id.' })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query('SELECT id FROM waitlist WHERE id = $1 FOR UPDATE', [id])
    if (!rows[0]) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Waitlist entry not found.' })
    }
    await client.query('DELETE FROM messages_log WHERE waitlist_id = $1', [id])
    await client.query('DELETE FROM waitlist WHERE id = $1', [id])
    await client.query('COMMIT')
    res.json({ ok: true, deleted: true, message: 'Waitlist entry removed.' })
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
