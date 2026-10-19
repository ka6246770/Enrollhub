import { Router } from 'express'
import { z } from 'zod'
import { query } from '../db/database.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

export const offersRouter = Router()

const OFFER_SELECT = `
  SELECT o.*,
         (SELECT count(*)::int FROM waitlist w WHERE w.offer_id = o.id) AS waitlist_count
  FROM offers o`

function mapOffer(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    shortDescription: row.short_description,
    price: row.price,
    duration: row.duration,
    included: row.included,
    seatsTotal: row.seats_total,
    seatsTaken: row.seats_taken,
    closesAt: row.closes_at,
    status: row.status,
    waitlistCount: row.waitlist_count ?? 0,
  }
}

const offerPatchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  shortDescription: z.string().trim().max(500).optional(),
  price: z.string().trim().min(1).max(60).optional(),
  duration: z.string().trim().min(1).max(60).optional(),
  seatsTotal: z.coerce.number().int().min(0).optional(),
  closesAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['active', 'soldout', 'closed']).optional(),
})

const COLUMNS = {
  title: 'title',
  description: 'description',
  shortDescription: 'short_description',
  price: 'price',
  duration: 'duration',
  seatsTotal: 'seats_total',
  closesAt: 'closes_at',
  status: 'status',
}

// Public: list and read offers.
offersRouter.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(`${OFFER_SELECT} ORDER BY o.id`)
    res.json(rows.map(mapOffer))
  } catch (error) {
    next(error)
  }
})

offersRouter.get('/:slug', async (req, res, next) => {
  try {
    const { rows } = await query(`${OFFER_SELECT} WHERE o.slug = $1`, [req.params.slug])
    if (!rows[0]) return res.status(404).json({ message: 'Offer not found.' })
    res.json(mapOffer(rows[0]))
  } catch (error) {
    next(error)
  }
})

// Admin: update an offer (title, price, seats, closing date, status).
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
