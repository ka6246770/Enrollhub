// Job helpers shared by the public pages. The offer records themselves live in
// the database and arrive through `hooks/useOffers.js`.

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

export function isPaused(offer) {
  return offer.status === 'paused'
}

// A closing date is inclusive: the job stays visible through the end of that
// day, then disappears even before the API has persisted the archived status.
export function isPastClosing(offer, now = new Date()) {
  if (!offer.closes_at) return false
  const closing = new Date(`${String(offer.closes_at).slice(0, 10)}T23:59:59.999`)
  return !Number.isNaN(closing.getTime()) && closing < now
}

export function isClosed(offer) {
  return offer.status === 'closed' || isPastClosing(offer)
}

export function isOpen(offer) {
  return offer.status === 'active' && seatsLeft(offer) > 0 && !isPastClosing(offer)
}

export function seatsLeft(offer) {
  return Math.max(offer.seats_total - offer.seats_taken, 0)
}
