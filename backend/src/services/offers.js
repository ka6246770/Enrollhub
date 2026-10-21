import { query } from '../db/database.js'

// A close date is a promise to applicants: after that date the job must stop
// accepting applications and disappear from the public board. Closing also
// preserves registrations, recordings and waitlist rows, exactly like the
// dashboard's archive action.
export async function closeExpiredOffers() {
  const { rowCount } = await query(
    `UPDATE offers
     SET status = 'closed', updated_at = now()
     WHERE status IN ('active', 'soldout')
       AND closes_at IS NOT NULL
       AND closes_at < CURRENT_DATE`,
  )
  return rowCount
}

// Used by code that already has the row and should agree with the database
// rule (a date closes at the end of that day in the server's timezone).
export function isOfferPastClosing(offer, now = new Date()) {
  if (!offer?.closes_at) return false
  const closing = new Date(`${String(offer.closes_at).slice(0, 10)}T23:59:59.999`)
  return !Number.isNaN(closing.getTime()) && closing < now
}
