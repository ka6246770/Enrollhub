// The public site's instant first paint and its fallback when the API is
// unreachable. `hooks/useOffers.js` replaces these with the live offers from
// `GET /offers` on load, so dashboard edits reach visitors.
//
// Keep this file in sync with `backend/src/db/seed.js` so the first paint does
// not disagree with the database.

export const offers = [
  {
    id: 1,
    reference: 1,
    slug: 'sadat-packaging-labeling',
    title: 'Packaging & labeling',
    location: 'Sadat City',
    description: [
      'Pack and label products at four factories in Sadat City: pasta, dairy, biscuits and bakery. The factories are affiliated with the Armed Forces and run 12-hour shifts.',
      'Base salary is 9,000 EGP a month, plus a 2,000 EGP bonus when you complete 30 days. Housing is provided for anyone relocating, with mattresses, water heaters, bathtubs and security cameras.',
      'Social security and permanent employment start in your first week. Salary advances are available twice a week, and paid leave begins once your permanent status is secured.',
      'Come with a haircut and a neatly trimmed beard before your first shift.',
    ].join('\n\n'),
    shortDescription: 'Pasta, dairy, biscuit and bakery factories. 9,000 EGP base plus a 2,000 EGP completion bonus.',
    price: '9,000 EGP',
    duration: '12-hour shifts',
    included: [
      'Housing for anyone relocating, with mattresses, water heaters, bathtubs and cameras',
      '2,000 EGP bonus after 30 days',
      'Salary advances twice a week',
      'Social security and permanent status from the first week',
      'Paid leave after permanent status',
    ],
    seats_total: 40,
    seats_taken: 23,
    closes_at: '2026-12-31',
    status: 'active',
  },
  {
    id: 2,
    reference: 2,
    slug: 'sadat-packaging-wrapping',
    title: 'Packaging & wrapping',
    location: 'Sadat City',
    description: [
      'Pack and wrap at four factories in Sadat City. Shifts are 12 hours, including a one-hour break. Each factory pays a different base plus incentives:',
      'Potato chips — 8,100 EGP base + 3,000 EGP incentives = 11,100 EGP\nVegetables — 8,400 + 3,000 = 11,400 EGP\nOlives — 8,400 + 1,600 = 10,000 EGP\nGel and cream — 8,100 + 1,500 = 9,600 EGP',
      'Housing is free for anyone relocating, with transport between the accommodation and the factory. Meals are subsidized, and daily or weekly advances are available after three days of work.',
    ].join('\n\n'),
    shortDescription: 'Four factories, four pay levels. Totals from 9,600 to 11,400 EGP after incentives.',
    price: '9,600–11,400 EGP',
    duration: '12-hour shifts + 1-hour break',
    included: [
      'Free housing for anyone relocating',
      'Transport between housing and the factory',
      'Subsidized meals',
      'Daily and weekly advances after 3 days',
      'Potato chips, vegetables, olives, gel and cream factories',
    ],
    seats_total: 60,
    seats_taken: 41,
    closes_at: '2026-12-31',
    status: 'active',
  },
  {
    id: 3,
    reference: 3,
    slug: 'obour-steward',
    title: 'Factory steward',
    location: 'El-Obour',
    description: [
      'Work as a steward at a confectionery factory in El-Obour. Shifts are 12 hours.',
      'Base salary is 9,000 EGP plus a 2,000 EGP incentive — 11,000 EGP in total.',
      'Housing is provided for anyone relocating from another governorate, and transport runs between the accommodation and the factory. A meal is provided, and daily or weekly salary advances are available.',
    ].join('\n\n'),
    shortDescription: 'Confectionery factory. 9,000 EGP base plus a 2,000 EGP incentive.',
    price: '11,000 EGP',
    duration: '12-hour shifts',
    included: [
      'Housing for anyone relocating from another governorate',
      'Transport between housing and the factory',
      'Meal provided',
      'Daily and weekly salary advances',
    ],
    seats_total: 25,
    seats_taken: 12,
    closes_at: '2026-12-31',
    status: 'active',
  },
  {
    id: 4,
    reference: 4,
    slug: 'ramadan-10-packaging',
    title: 'Packaging & wrapping',
    location: '10th of Ramadan City',
    description: [
      'Pack and wrap at a potato chips factory in 10th of Ramadan City. Choose a 12-hour shift at 8,400 EGP, or an 8-hour shift at 6,600 EGP. Both include a one-hour break.',
      'Housing is provided for anyone relocating, with free transport to the factory. A dry meal is provided every day, and daily or weekly salary advances are available.',
    ].join('\n\n'),
    shortDescription: 'Potato chips factory. Choose a 12-hour shift at 8,400 EGP or an 8-hour shift at 6,600 EGP.',
    price: '6,600–8,400 EGP',
    duration: '8 or 12-hour shifts',
    included: [
      'Housing for anyone relocating',
      'Free transport between housing and the factory',
      'A dry meal every day',
      'Daily and weekly salary advances',
    ],
    seats_total: 50,
    seats_taken: 38,
    closes_at: '2026-12-31',
    status: 'active',
  },
]

// The eligibility rules printed in every job sheet. Kept in one place so the
// offer page, the FAQ, and the form consent cannot drift apart.
export const REQUIREMENTS = [
  'Men aged 18 to 50',
  'Egyptian nationals only',
  'National ID card — no other documents',
  'Able to work a full factory shift',
]

export function isSoldOut(offer) {
  return offer.status === 'soldout'
}

export function seatsLeft(offer) {
  return Math.max(offer.seats_total - offer.seats_taken, 0)
}
