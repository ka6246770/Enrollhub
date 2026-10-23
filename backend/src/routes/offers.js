import { Router } from 'express'
import { z } from 'zod'
import { pool, query } from '../db/database.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { closeExpiredOffers } from '../services/offers.js'

export const offersRouter = Router()

const OFFER_SELECT = `
  SELECT o.*,
         (SELECT count(*)::int
          FROM waitlist w
          WHERE w.offer_id = o.id
            AND w.status IN ('waiting', 'contacted', 'offered')) AS waitlist_count
  FROM offers o`

function mapOffer(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    shortDescription: row.short_description,
    location: row.location,
    price: row.price,
    duration: row.duration,
    included: row.included,
    seatsTotal: row.seats_total,
    seatsTaken: row.seats_taken,
    closesAt: row.closes_at,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    waitlistCount: row.waitlist_count ?? 0,
  }
}

// Public: list and read offers. A closed offer is archived: its registrations
// and waitlist rows stay in the database, but the job is no longer part of the
// public site. Paused offers stay visible so visitors can see that applications
// are temporarily on hold.
offersRouter.get('/', async (req, res, next) => {
  try {
    await closeExpiredOffers()
    const { rows } = await query(`${OFFER_SELECT} WHERE o.status <> 'closed' ORDER BY o.id`)
    res.json(rows.map(mapOffer))
  } catch (error) {
    next(error)
  }
})

offersRouter.get('/all', requireAdmin, async (req, res, next) => {
  try {
    // Archived offers keep their registrations, so the dashboard still needs
    // their titles. The public list deliberately hides them.
    const { rows } = await query(`${OFFER_SELECT} ORDER BY o.id DESC`)
    res.json(rows.map(mapOffer))
  } catch (error) {
    next(error)
  }
})

offersRouter.get('/:slug', async (req, res, next) => {
  try {
    await closeExpiredOffers()
    const { rows } = await query(`${OFFER_SELECT} WHERE o.slug = $1 AND o.status <> 'closed'`, [req.params.slug])
    if (!rows[0]) return res.status(404).json({ message: 'Offer not found.' })
    res.json(mapOffer(rows[0]))
  } catch (error) {
    next(error)
  }
})

const createOfferSchema = z.object({
  title: z.string().trim().min(1, 'Enter a title.').max(200),
  description: z.string().trim().min(1, 'Enter a description.').max(2000),
  shortDescription: z.string().trim().min(1, 'Enter a short description.').max(500),
  location: z.string().trim().max(80).optional().default(''),
  price: z.string().trim().min(1, 'Enter the monthly pay.').max(60),
  duration: z.string().trim().min(1, 'Enter the shift.').max(60),
  included: z.array(z.string().trim().min(1, 'Included items cannot be empty.').max(200)).max(20).optional().default([]),
  seatsTotal: z.coerce.number().int().min(0, 'Seats cannot be negative.').max(100000),
  closesAt: z.preprocess(
    (value) => (value === '' || value === undefined ? null : value),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid closing date.').nullable().optional(),
  ),
})

const offerPatchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  shortDescription: z.string().trim().max(500).optional(),
  location: z.string().trim().max(80).optional(),
  price: z.string().trim().min(1).max(60).optional(),
  duration: z.string().trim().min(1).max(60).optional(),
  seatsTotal: z.coerce.number().int().min(0).optional(),
  closesAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['active', 'soldout', 'paused', 'closed']).optional(),
})

const COLUMNS = {
  title: 'title',
  description: 'description',
  shortDescription: 'short_description',
  location: 'location',
  price: 'price',
  duration: 'duration',
  seatsTotal: 'seats_total',
  closesAt: 'closes_at',
  status: 'status',
}

function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)
}

async function uniqueSlug(title) {
  const base = slugify(title) || 'offer'
  let slug = base
  let suffix = 1

  while (true) {
    const { rowCount } = await query('SELECT 1 FROM offers WHERE slug = $1', [slug])
    if (!rowCount) return slug
    suffix += 1
    slug = `${base}-${suffix}`
  }
}

// Admin: create an offer. The slug is generated from the title and the offer is
// published immediately. An owner who wants to prepare it first can pause it
// after creation from the Offers page.
offersRouter.post('/', requireAdmin, async (req, res, next) => {
  try {
    const input = createOfferSchema.parse(req.body)
    let createdId

    // Two admins could create offers with the same title at the same moment.
    // Retry the insert with a new suffix if the unique slug check loses that race.
    for (let attempt = 0; attempt < 3 && !createdId; attempt += 1) {
      const slug = await uniqueSlug(input.title)
      try {
        const { rows } = await query(
          `INSERT INTO offers
             (slug, title, description, short_description, location, price, duration, included, seats_total, closes_at, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, 'active')
           RETURNING id`,
          [
            slug,
            input.title,
            input.description,
            input.shortDescription,
            input.location,
            input.price,
            input.duration,
            JSON.stringify(input.included),
            input.seatsTotal,
            input.closesAt ?? null,
          ],
        )
        createdId = rows[0].id
      } catch (error) {
        if (error.code !== '23505' || attempt === 2) throw error
      }
    }

    const { rows } = await query(`${OFFER_SELECT} WHERE o.id = $1`, [createdId])
    res.status(201).json(mapOffer(rows[0]))
  } catch (error) {
    next(error)
  }
})

offersRouter.patch('/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid offer id.' })

    const patch = offerPatchSchema.parse(req.body)
    const entries = Object.entries(patch).filter(([, value]) => value !== undefined)
    if (entries.length === 0) return res.status(400).json({ message: 'Nothing to update.' })

    const assignments = entries.map(([key], index) => `${COLUMNS[key]} = $${index + 2}`)
    const values = entries.map(([, value]) => value)

    const { rows } = await query(
      `UPDATE offers SET ${assignments.join(', ')}, updated_at = now() WHERE id = $1 RETURNING id`,
      [id, ...values],
    )
    if (!rows[0]) return res.status(404).json({ message: 'Offer not found.' })

    const { rows: refreshed } = await query(`${OFFER_SELECT} WHERE o.id = $1`, [id])
    res.json(mapOffer(refreshed[0]))
  } catch (error) {
    next(error)
  }
})

// Admin: remove an offer safely.
//
// Deletes only when there is no applicant data. Anything else is archived by
// setting status = 'closed', which hides it from the public site while keeping
// registrations, waitlist rows, and voice-note references intact.
offersRouter.delete('/:id', requireAdmin, async (req, res, next) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid offer id.' })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows: offers } = await client.query('SELECT id FROM offers WHERE id = $1 FOR UPDATE', [id])
    if (!offers[0]) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Offer not found.' })
    }

    const { rows: counts } = await client.query(
      `SELECT
         (SELECT count(*)::int FROM registrations WHERE offer_id = $1) AS registrations,
         (SELECT count(*)::int FROM waitlist WHERE offer_id = $1) AS waitlist`,
      [id],
    )
    const { registrations, waitlist } = counts[0]

    if (registrations > 0 || waitlist > 0) {
      await client.query("UPDATE offers SET status = 'closed', updated_at = now() WHERE id = $1", [id])
      await client.query('COMMIT')
      const reason = registrations > 0 ? 'it has registrations' : 'it has waitlist entries'
      return res.json({
        id,
        deleted: false,
        archived: true,
        message: `This offer was archived instead of deleted because ${reason}. No applicant data was removed.`,
      })
    }

    await client.query('DELETE FROM offers WHERE id = $1', [id])
    await client.query('COMMIT')
    return res.json({ id, deleted: true, archived: false, message: 'Offer deleted.' })
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
