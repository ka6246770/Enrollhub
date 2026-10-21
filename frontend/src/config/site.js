// SEO + GEO: one source of truth for the facts search engines and answer
// engines use to identify the company. Keep every value exact. If a fact is
// not known yet, leave it empty rather than approximating it.
//
// VITE_SITE_URL must be the canonical production origin, with no trailing
// slash, for example https://enrollhub.example.com.

const configuredSiteUrl = (import.meta.env.VITE_SITE_URL ?? '').trim()
const browserOrigin = typeof window === 'undefined' ? '' : window.location.origin

export const SITE_URL = (configuredSiteUrl || browserOrigin || 'https://enrollhub.example.com').replace(/\/+$/, '')

function httpsUrls(value) {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    // sameAs must be exact, live, https URLs. A typo or an approximated
    // profile URL weakens entity matching, so invalid values are dropped.
    .filter((url) => {
      try {
        return new URL(url).protocol === 'https:'
      } catch {
        return false
      }
    })
}

export const site = {
  name: 'Al-Tayeb Company',
  shortName: 'Al-Tayeb',
  legalName: 'Al-Tayeb Company',
  url: SITE_URL,
  language: 'en',
  locale: 'en_US',
  description:
    'Factory recruitment for packaging, labeling and steward jobs in Sadat City, El-Obour and 10th of Ramadan City, Egypt.',
  defaultTitle: 'Al-Tayeb | Factory jobs in Egypt',
  defaultDescription:
    'Al-Tayeb hires packaging, labeling and steward workers in Sadat City, El-Obour and 10th of Ramadan. Pay from 6,600 EGP a month, housing included.',

  // SEO: 1200 x 630 social card. Replace with a PNG/JPG before launch because
  // some social platforms do not render SVG previews.
  socialImage: '/og-image.svg',
  socialImageAlt: 'Al-Tayeb factory jobs in Sadat City, El-Obour and 10th of Ramadan.',
  socialImageWidth: 1200,
  socialImageHeight: 630,

  // SEO: Organization logo. Google prefers a raster logo of at least 112 x 112.
  logo: '/logo.svg',
  logoWidth: 512,
  logoHeight: 512,

  // GEO: these are the verifiable entities and topics the company is about.
  areaServed: ['Sadat City', 'El-Obour', '10th of Ramadan City'],
  knowsAbout: [
    'Factory recruitment in Egypt',
    'Packaging and labeling jobs',
    'Factory steward jobs',
    'Housing for factory workers',
    'Shift work in Sadat City, El-Obour and 10th of Ramadan',
  ],

  // SEO/GEO: add only exact, verified profile URLs through VITE_SAME_AS.
  // Examples of acceptable targets are the official LinkedIn or Facebook page,
  // a Wikipedia article about the company, or an official industry directory.
  // Do not add guessed or placeholder URLs: an empty list is safer.
  sameAs: httpsUrls(import.meta.env.VITE_SAME_AS),

  // GEO: placeholders are intentionally empty until the owner supplies them.
  // Organization schema omits empty values instead of publishing fake data.
  contact: {
    email: (import.meta.env.VITE_SUPPORT_EMAIL ?? '').trim(),
    telephone: (import.meta.env.VITE_WHATSAPP_NUMBER ?? '').trim(),
    address: (import.meta.env.VITE_BUSINESS_ADDRESS ?? '').trim(),
    country: 'EG',
  },

  // GEO: dates make the content easier to verify and cite. Update these when
  // the public offer facts, pay figures or eligibility rules change.
  content: {
    publishedAt: (import.meta.env.VITE_CONTENT_PUBLISHED_AT ?? '2026-10-21').trim(),
    modifiedAt: (import.meta.env.VITE_CONTENT_UPDATED_AT ?? '2026-10-21').trim(),
  },
}

// SEO: title and description targets. These are not hard limits enforced by
// search engines, but they keep snippets from being truncated.
export const SEO_LIMITS = {
  title: 60,
  description: 160,
  directAnswerWords: [40, 60],
}

// SEO: every canonical, Open Graph URL and schema @id should be absolute.
export function absoluteUrl(path = '/') {
  if (/^https?:\/\//i.test(path)) return path
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

export default site
