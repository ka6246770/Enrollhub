import { Router } from 'express'
import { z } from 'zod'
import { pool, query } from '../db/database.js'
import { formLimiter, lookupLimiter, trackingLimiter } from '../middleware/rateLimit.js'
import { referenceReminderEmail, sendEmail, statusEmail } from '../services/email.js'
import { normalizeReference } from '../services/referenceCode.js'

export const statusRouter = Router()

// One answer for a wrong code and for a wrong email. Anything more specific
// would let a stranger test which addresses are registered.
const NOT_FOUND_MESSAGE = "We couldn't find a match. Check the reference code and the email address you applied with."

const TRACKING_MESSAGES = {
  received: "We received your request. We'll review it soon.",
  accepted: 'Accepted! Check your email for the next steps.',
  rejected: "Unfortunately we couldn't offer you a place this time.",
}

// Registration states are collapsed into the four words an applicant needs.
// `offered` still reads as received because the private link, not this page,
// is where the place is accepted.
const TRACKING_STATUS = {
  new: 'received',
  contacted: 'received',
  offered: 'received',
  accepted: 'accepted',
  rejected: 'rejected',
  declined: 'rejected',
}

const lookupSchema = z.object({
  reference: z.string().trim().min(3).max(40),
  email: z.string().trim().email().max(200),
})

const resendSchema = z.object({
  email: z.string().trim().email().max(200),
})

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

statusRouter.post('/lookup', trackingLimiter, async (req, res, next) => {
  try {
    const { reference, email } = lookupSchema.parse(req.body)
    const normalizedReference = normalizeReference(reference)

    const { rows } = await query(
      `SELECT r.id, r.status, r.created_at, r.reference_code, r.offer_id, o.title
       FROM registrations r
       JOIN offers o ON o.id = r.offer_id
       WHERE r.reference_code = $1 AND lower(r.email) = lower($2)
       LIMIT 1`,
      [normalizedReference, email],
    )
    const registration = rows[0]
    if (!registration) return res.status(404).json({ message: NOT_FOUND_MESSAGE })

    let status = TRACKING_STATUS[registration.status] ?? 'received'
    let position = null

    // A person can apply and later join the waitlist for the same job. An
    // active waitlist place is more useful than "received"; a final decision on
    // the application always wins.
    if (status === 'received') {
      const { rows: waiting } = await query(
        `SELECT id, created_at FROM waitlist
         WHERE offer_id = $1 AND lower(email) = lower($2) AND status = 'waiting'
         ORDER BY created_at ASC LIMIT 1`,
        [registration.offer_id, email],
      )
      if (waiting[0]) {
        const { rows: positionRows } = await query(
          `SELECT count(*)::int AS position FROM waitlist
           WHERE offer_id = $1 AND status = 'waiting' AND created_at <= $2`,
          [registration.offer_id, waiting[0].created_at],
        )
        status = 'waitlist'
        position = Math.max(positionRows[0]?.position ?? 1, 1)
      }
    }

    const message = status === 'waitlist'
      ? `You're on the waitlist. Position: ${position}.`
      : TRACKING_MESSAGES[status]

    res.json({
      ok: true,
      reference: registration.reference_code,
      offerTitle: registration.title,
      status,
      submittedAt: registration.created_at,
      message,
      position,
    })
  } catch (error) {
    next(error)
  }
})

statusRouter.post('/resend-reference', trackingLimiter, async (req, res, next) => {
  try {
    const { email } = resendSchema.parse(req.body)
    const { rows } = await query(
      `SELECT r.reference_code AS reference, r.name, o.title AS offer
       FROM registrations r
       JOIN offers o ON o.id = r.offer_id
       WHERE lower(r.email) = lower($1) AND r.reference_code IS NOT NULL
       ORDER BY r.created_at DESC
       LIMIT 10`,
      [email],
    )

    if (rows.length > 0) {
      const mail = await referenceReminderEmail({
        name: rows[0].name,
        codes: rows.map((row) => ({ reference: row.reference, offer: row.offer })),
      })
      await sendEmail({
        to: email,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        type: 'reference_reminder',
      })
    }

    // The same reply whether or not the address matched.
    res.json({ ok: true, message: 'If this email is registered, we sent the code.' })
  } catch (error) {
    next(error)
  }
})

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
