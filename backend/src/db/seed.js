import { assertRequiredEnv } from '../config/env.js'
import { pool } from './database.js'
import { seedTemplates } from '../services/messageTemplates.js'

// The three offers from the design.
//
// Re-running upserts them by slug, which means it also RESETS `seats_taken` and
// `status` to the values below. That is what you want while developing, and
// exactly what you must not do to a live database — see docs/DEPLOYMENT.md.
// The message texts are seeded too, with ON CONFLICT DO NOTHING so an edit made
// in the dashboard survives.
const OFFERS = [
  {
    slug: 'offer-1',
    title: '[OFFER 1 TITLE]',
    description: '[One or two sentences describing what this offer includes and who it is for.]',
    short_description: '[Short description of offer 1.]',
    price: '[PRICE]',
    duration: '[DURATION]',
    included: ['[Included item one]', '[Included item two]', '[Included item three]'],
    seats_total: 30,
    seats_taken: 18,
    closes_at: '2026-10-31',
    status: 'active',
  },
  {
    slug: 'offer-2',
    title: '[OFFER 2 TITLE]',
    description: '[One or two sentences describing what this offer includes and who it is for.]',
    short_description: '[Short description of offer 2.]',
    price: '[PRICE]',
    duration: '[DURATION]',
    included: ['[Included item one]', '[Included item two]', '[Included item three]'],
    seats_total: 20,
    seats_taken: 20,
    closes_at: '2026-10-31',
    status: 'soldout',
  },
  {
    slug: 'offer-3',
    title: '[OFFER 3 TITLE]',
    description: '[One or two sentences describing what this offer includes and who it is for.]',
    short_description: '[Short description of offer 3.]',
    price: '[PRICE]',
    duration: '[DURATION]',
    included: ['[Included item one]', '[Included item two]', '[Included item three]'],
    seats_total: 20,
    seats_taken: 9,
    closes_at: '2026-10-31',
    status: 'active',
  },
]

assertRequiredEnv()

for (const offer of OFFERS) {
  await pool.query(
    `INSERT INTO offers
       (slug, title, description, short_description, price, duration, included, seats_total, seats_taken, closes_at, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11)
     ON CONFLICT (slug) DO UPDATE SET
       title = EXCLUDED.title,
       description = EXCLUDED.description,
       short_description = EXCLUDED.short_description,
       price = EXCLUDED.price,
       duration = EXCLUDED.duration,
       included = EXCLUDED.included,
       seats_total = EXCLUDED.seats_total,
       seats_taken = EXCLUDED.seats_taken,
       closes_at = EXCLUDED.closes_at,
       status = EXCLUDED.status,
       updated_at = now()`,
    [
      offer.slug,
      offer.title,
      offer.description,
      offer.short_description,
      offer.price,
      offer.duration,
      JSON.stringify(offer.included),
      offer.seats_total,
      offer.seats_taken,
      offer.closes_at,
      offer.status,
    ],
  )
}

console.log(`✓ seeded ${OFFERS.length} offers`)

// The message texts live in the database now. ON CONFLICT DO NOTHING means
// re-seeding never overwrites a text the owner edited in the dashboard.
const templatesInserted = await seedTemplates()
console.log(`✓ seeded ${templatesInserted} message templates (existing edits kept)`)
await pool.end()
