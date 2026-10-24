import { useEffect, useState } from 'react'
import { fetchOffers } from '../services/api.js'

// Public offer pages read from this hook. Offers come from `GET /offers`, so
// dashboard edits, real seat counts and automatic sold-out states are always
// what visitors see.
//
// The API returns camelCase; the public components use the snake_case shape,
// so the values are converted here and nowhere else.
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
  const [offers, setOffers] = useState([])
  // Pages use this to show a loading line instead of a false 404 for a shared
  // job link while the first request is still running.
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetchOffers()
      .then((live) => {
        if (active && Array.isArray(live)) setOffers(live.map(toPublicShape))
      })
      .catch(() => {
        // Leave the list empty: a public page must not invent jobs that are not
        // in the database. The page's own empty state handles this case.
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
