// Sample offers used as the public site's instant first paint and as the
// fallback when the API is unreachable. `hooks/useOffers.js` replaces them with
// the live offers from `GET /offers` on load, so edits made in the dashboard
// reach visitors. Keep this file roughly in sync so the fallback is not stale.

export const offers = [
  {
    id: 1,
    slug: 'offer-1',
    title: '[OFFER 1 TITLE]',
    description: '[One or two sentences describing what this offer includes and who it is for.]',
    shortDescription: '[Short description of offer 1.]',
    price: '[PRICE]',
    duration: '[DURATION]',
    included: ['[Included item one]', '[Included item two]', '[Included item three]'],
    seats_total: 30,
    seats_taken: 18,
    closes_at: '2026-10-31',
    status: 'active',
  },
  {
    id: 2,
    slug: 'offer-2',
    title: '[OFFER 2 TITLE]',
    description: '[One or two sentences describing what this offer includes and who it is for.]',
    shortDescription: '[Short description of offer 2.]',
    price: '[PRICE]',
    duration: '[DURATION]',
    included: ['[Included item one]', '[Included item two]', '[Included item three]'],
    seats_total: 20,
    seats_taken: 20,
    closes_at: '2026-10-31',
    status: 'soldout',
  },
  {
    id: 3,
    slug: 'offer-3',
    title: '[OFFER 3 TITLE]',
    description: '[One or two sentences describing what this offer includes and who it is for.]',
    shortDescription: '[Short description of offer 3.]',
    price: '[PRICE]',
    duration: '[DURATION]',
    included: ['[Included item one]', '[Included item two]', '[Included item three]'],
    seats_total: 20,
    seats_taken: 9,
    closes_at: '2026-10-31',
    status: 'active',
  },
]

export const LANGUAGE_OPTIONS = ['Arabic', 'English', 'French', 'Other']
export const LEVEL_OPTIONS = ['Beginner', 'Intermediate', 'Advanced']

export function isSoldOut(offer) {
  return offer.status === 'soldout'
}

export function seatsLeft(offer) {
  return Math.max(offer.seats_total - offer.seats_taken, 0)
}
