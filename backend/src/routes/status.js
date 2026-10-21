import { Router } from 'express'
import { z } from 'zod'
import { pool, query } from '../db/database.js'
import { formLimiter, lookupLimiter } from '../middleware/rateLimit.js'
import { sendEmail, statusEmail } from '../services/email.js'

export const statusRouter = Router()

// Applicant-facing words, never the raw database values.
const STATUS_LABELS = {
  new: 'Received',
  contacted: 'In review',
  offered: 'Place offered',
  accepted: 'Place confirmed',
  rejected: 'Not selected',
  declined: 'Offer declined',
}

const WAITLIST_LABELS = {
  waiting: 'On the waitlist',
  contacted: 'Contacted',
  offered: 'Place offered',
  accepted: 'Place confirmed',
  declined: 'Offer declined',
}

function mapStatus(kind, row) {
  const labels = kind === 'waitlist' ? WAITLIST_LABELS : STATUS_LABELS
  return {
    kind,
    name: row.name,
    offerTitle: row.title,
    offerSlug: row.slug,
    offerLocation: row.location,
    status: row.status,
    statusLabel: labels[row.status] ?? 'Application received',
    canRespond: row.status === 'offered',
    offeredAt: row.offered_at,
    respondedAt: row.responded_at,
    createdAt: row.created_at,
  }
}

async function findRegistration(token, client = pool) {
  const { rows } = await client.query(
    `SELECT r.id, r.name, r.email, r.phone, r.status, r.offered_at, r.responded_at, r.created_at,
            o.title, o.slug, o.location
     FROM registrations r
     JOIN offers o ON o.id = r.offer_id
     WHERE r.status_token = $1
     ${client === pool ? '' : 'FOR UPDATE OF r'}`,
    [token],
  )
  return rows[0] ?? null
}

async function findWaitlist(token, client = pool) {
  const { rows } = await client.query(
    `SELECT w.id, w.name, w.email, w.phone, w.status, w.offered_at, w.responded_at, w.created_at,
            o.title, o.slug, o.location
     FROM waitlist w
     JOIN offers o ON o.id = w.offer_id
     WHERE w.status_token = $1
     ${client === pool ? '' : 'FOR UPDATE OF w'}`,
    [token],
  )
  return rows[0] ?? null
}

async function locate(token, client = pool) {
  if (token.startsWith('wl_')) {
    const row = await findWaitlist(token, client)
    return row ? { kind: 'waitlist', row } : null
  }
  if (token.startsWith('reg_')) {
    const row = await findRegistration(token, client)
    return row ? { kind: 'registration', row } : null
  }
  return null
}

statusRouter.get('/:token', lookupLimiter, async (req, res, next) => {
  try {
    const found = await locate(String(req.params.token))
    if (!found) return res.status(404).json({ message: 'This private link is not valid.' })
    res.json(mapStatus(found.kind, found.row))
  } catch (error) {
    next(error)
  }
})

const respondSchema = z.object({
  decision: z.enum(['accept', 'decline']),
})

statusRouter.post('/:token/respond', formLimiter, async (req, res, next) => {
  const client = await pool.connect()
  try {
    const { decision } = respondSchema.parse(req.body)
    const token = String(req.params.token)

    await client.query('BEGIN')
    // Read under a row lock so two taps cannot both answer the offer.
    const locked = await locate(token, client)
    if (!locked) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'This private link is not valid.' })
    }
    if (locked.row.status !== 'offered') {
      await client.query('ROLLBACK')
      return res.status(409).json({
        message: 'This place has already been answered or is no longer available.',
      })
    }

    const nextStatus = decision === 'accept' ? 'accepted' : 'declined'
    if (locked.kind === 'registration') {
      await client.query(
        `UPDATE registrations
         SET status = $2,
             responded_at = now(),
             whatsapp_confirmed = ($2 = 'accepted'),
             updated_at = now()
         WHERE id = $1`,
        [locked.row.id, nextStatus],
      )
    } else {
      await client.query(
        `UPDATE waitlist
         SET status = $2, responded_at = now(), updated_at = now()
         WHERE id = $1`,
        [locked.row.id, nextStatus],
      )
    }
    await client.query('COMMIT')

    // A confirmation email is a courtesy, not part of the state change. The
    // send helper records a failure and never throws.
    if (decision === 'accept') {
      try {
        const mail = await statusEmail('accepted', {
          name: locked.row.name,
          offer: locked.row.title,
          offerSlug: locked.row.slug,
        })
        if (mail) {
          await sendEmail({
            to: locked.row.email,
            subject: mail.subject,
            text: mail.text,
            html: mail.html,
            registrationId: locked.kind === 'registration' ? locked.row.id : null,
            waitlistId: locked.kind === 'waitlist' ? locked.row.id : null,
            type: locked.kind === 'waitlist' ? 'waitlist_accepted' : 'accepted',
          })
        }
      } catch (emailError) {
        console.error('[status] confirmation email failed:', emailError.message)
      }
    }

    const { rows: refreshed } = await query(
      locked.kind === 'registration'
        ? `SELECT r.id, r.name, r.email, r.phone, r.status, r.offered_at, r.responded_at, r.created_at,
                  o.title, o.slug, o.location
           FROM registrations r JOIN offers o ON o.id = r.offer_id WHERE r.id = $1`
        : `SELECT w.id, w.name, w.email, w.phone, w.status, w.offered_at, w.responded_at, w.created_at,
                  o.title, o.slug, o.location
           FROM waitlist w JOIN offers o ON o.id = w.offer_id WHERE w.id = $1`,
      [locked.row.id],
    )

    res.json({
      ...mapStatus(locked.kind, refreshed[0]),
      message: decision === 'accept'
        ? 'Your place is confirmed. We will send the schedule and joining details shortly.'
        : 'You declined the place. Thank you for letting us know.',
    })
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // already committed or no transaction was open
    }
    next(error)
  } finally {
    client.release()
  }
})
