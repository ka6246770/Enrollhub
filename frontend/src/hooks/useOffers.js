import { useEffect, useState } from 'react'
import { offers as staticOffers } from '../data/offers.js'
import { fetchOffers, isBackendEnabled } from '../services/api.js'

// Public offer pages read from this hook.
//
// The static offers in `data/offers.js` render immediately, so the first paint
// is instant and the site still reads correctly when the API is unreachable.
// The live offers from `GET /offers` then replace them, which is what makes
// dashboard edits, real seat counts and automatic sold-out states visible to
// visitors.
//
// The API returns camelCase; `data/offers.js` and every public component use the
// snake_case shape, so the values are converted here and nowhere else.
function toPublicShape(offer, index) {
  return {
    id: offer.id,
    reference: index + 1,
    slug: offer.slug,
    title: offer.title,
    location: offer.location,
    description: offer.description,
    shortDescription: offer.shortDescription,
    price: offer.price,
    duration: offer.duration,
    included: Array.isArray(offer.included) ? offer.included : [],
    seats_total: offer.seatsTotal,
    seats_taken: offer.seatsTaken,
    closes_at: offer.closesAt,
    status: offer.status,
    // SEO: JobPosting needs datePosted; updated_at keeps the sitemap lastmod
    // and article timestamps tied to the real offer record.
    created_at: offer.createdAt,
    updated_at: offer.updatedAt,
  }
}

export function useOffers() {
  const [offers, setOffers] = useState(staticOffers)
  // Only a live API can add slugs the bundled preview does not have. Pages use
  // this to show a loading line instead of a false 404 for a shared job link.
  const [isLoading, setIsLoading] = useState(isBackendEnabled)

  useEffect(() => {
    let active = true
    fetchOffers()
      .then((live) => {
        if (active && Array.isArray(live)) setOffers(live.map(toPublicShape))
      })
      .catch(() => {
        // Keep the static content; a missing API must not blank the site.
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return { offers, isLoading }
}

export default useOffers
