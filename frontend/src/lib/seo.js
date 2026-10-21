// SEO + GEO: schema.org builders shared by every public page. The resulting
// @graph always identifies the company and the website, then adds the schema
// that best describes the page: WebPage, Article, FAQPage, CollectionPage or
// JobPosting. Keeping builders here prevents route-level metadata from drifting
// out of sync with the visible content.
//
// Comments below mark whether a builder mainly serves traditional SEO, AI
// answer engines (GEO), or both.

import { absoluteUrl, site } from '../config/site.js'

const ORGANIZATION_ID = `${site.url}/#organization`
const WEBSITE_ID = `${site.url}/#website`

function withoutEmpty(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null && entry !== ''))
}

function isoDate(value) {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10)
}

// SEO + GEO: describes the recruiting company, its service area and the topics
// it is qualified to answer questions about. sameAs is only emitted when the
// owner has supplied verified URLs.
export function buildOrganizationSchema() {
  const contact = site.contact

  return withoutEmpty({
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: site.name,
    alternateName: site.shortName,
    legalName: site.legalName,
    url: `${site.url}/`,
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl(site.logo),
      width: site.logoWidth,
      height: site.logoHeight,
    },
    description: site.description,
    sameAs: site.sameAs.length > 0 ? site.sameAs : undefined,
    areaServed: site.areaServed.map((name) => ({ '@type': 'City', name })),
    knowsAbout: site.knowsAbout,
    address: contact.address
      ? {
          '@type': 'PostalAddress',
          streetAddress: contact.address,
          addressCountry: contact.country,
        }
      : {
          '@type': 'PostalAddress',
          addressCountry: contact.country,
        },
    email: contact.email || undefined,
    telephone: contact.telephone || undefined,
    contactPoint: contact.email || contact.telephone
      ? {
          '@type': 'ContactPoint',
          contactType: 'recruitment',
          email: contact.email || undefined,
          telephone: contact.telephone || undefined,
          areaServed: 'EG',
        }
      : undefined,
  })
}

// SEO + GEO: the website entity. There is deliberately no SearchAction because
// the public site does not have a public site-search endpoint; claiming one
// would create a broken sitelinks search box in Google.
export function buildWebSiteSchema() {
  return withoutEmpty({
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: `${site.url}/`,
    name: site.shortName,
    alternateName: site.name,
    description: site.description,
    inLanguage: site.language,
    publisher: { '@id': ORGANIZATION_ID },
  })
}

// SEO: breadcrumbs appear in search results and give crawlers an explicit page
// hierarchy. GEO: they also tell answer engines where a fact sits on the site.
export function buildBreadcrumbSchema(items = []) {
  const visibleItems = items.filter((item) => item?.name && item?.path)
  if (visibleItems.length < 2) return undefined

  const pageUrl = absoluteUrl(visibleItems[visibleItems.length - 1].path)
  return {
    '@type': 'BreadcrumbList',
    '@id': `${pageUrl}#breadcrumb`,
    itemListElement: visibleItems.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

// SEO: gives each route a canonical WebPage entity and a stable @id that other
// schema nodes can reference. GEO: names the page and its language explicitly.
export function buildWebPageSchema({
  title,
  description,
  path = '/',
  type = 'WebPage',
  dateModified,
  mainEntityId,
}) {
  const pageUrl = absoluteUrl(path)

  return withoutEmpty({
    '@type': type,
    '@id': `${pageUrl}#webpage`,
    url: pageUrl,
    name: title,
    description,
    isPartOf: { '@id': WEBSITE_ID },
    about: { '@id': ORGANIZATION_ID },
    inLanguage: site.language,
    dateModified,
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: absoluteUrl(site.socialImage),
      width: site.socialImageWidth,
      height: site.socialImageHeight,
    },
    mainEntity: mainEntityId ? { '@id': mainEntityId } : undefined,
  })
}

// SEO: Article schema can earn article-style presentation and helps search
// engines understand authorship and freshness. GEO: dates and a named publisher
// make the content easier to cite.
export function buildArticleSchema({
  title,
  description,
  path = '/',
  datePublished = site.content.publishedAt,
  dateModified = site.content.modifiedAt,
}) {
  const pageUrl = absoluteUrl(path)

  return withoutEmpty({
    '@type': 'Article',
    '@id': `${pageUrl}#article`,
    headline: title,
    description,
    url: pageUrl,
    mainEntityOfPage: { '@id': `${pageUrl}#webpage` },
    author: { '@id': ORGANIZATION_ID },
    publisher: { '@id': ORGANIZATION_ID },
    image: {
      '@type': 'ImageObject',
      url: absoluteUrl(site.socialImage),
      width: site.socialImageWidth,
      height: site.socialImageHeight,
    },
    datePublished: isoDate(datePublished),
    dateModified: isoDate(dateModified),
    inLanguage: site.language,
    isPartOf: { '@id': WEBSITE_ID },
  })
}

export function buildCollectionPageSchema({ title, description, path = '/offers' }) {
  return buildWebPageSchema({ title, description, path, type: 'CollectionPage' })
}

export function buildContactPageSchema({ title, description, path = '/contact' }) {
  return buildWebPageSchema({ title, description, path, type: 'ContactPage' })
}

// SEO + GEO: FAQPage turns visible question/answer pairs into structured data.
// Every question passed here must also be visible on the page; do not mark up
// FAQs that are hidden behind a tab or omitted from the rendered content.
export function buildFaqPageSchema(items = [], { title = 'Frequently asked questions', description, path = '/' } = {}) {
  const questions = items.filter((item) => item?.question && item?.answer)
  if (questions.length === 0) return undefined

  const pageUrl = absoluteUrl(path)
  return withoutEmpty({
    '@type': 'FAQPage',
    '@id': `${pageUrl}#faq`,
    url: pageUrl,
    name: title,
    description,
    inLanguage: site.language,
    isPartOf: { '@id': WEBSITE_ID },
    mainEntity: questions.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  })
}

function parseMonthlySalary(price) {
  const values = [...String(price ?? '').matchAll(/\d[\d,]*/g)]
    .map((match) => Number(match[0].replaceAll(',', '')))
    .filter((value) => Number.isFinite(value) && value > 0)

  if (values.length === 0) return undefined

  return {
    '@type': 'MonetaryAmount',
    currency: 'EGP',
    value: {
      '@type': 'QuantitativeValue',
      minValue: Math.min(...values),
      maxValue: Math.max(...values),
      unitText: 'MONTH',
    },
  }
}

// SEO: JobPosting is the highest-value structured data for a recruitment page
// and can appear in Google's job-search experiences. GEO: it gives answer
// engines a machine-readable salary, employer, location and closing date.
//
// datePosted is required by Google. The public API supplies createdAt; when a
// static fallback offer has no date, this builder returns undefined rather than
// publishing an invalid job posting.
export function buildJobPostingSchema(offer, { path } = {}) {
  const datePosted = isoDate(offer?.created_at ?? offer?.createdAt)
  if (!offer?.title || !datePosted) return undefined

  const pageUrl = absoluteUrl(path ?? `/offers/${offer.slug}`)
  const description = [offer.shortDescription, offer.description].filter(Boolean).join('\n\n')

  return withoutEmpty({
    '@type': 'JobPosting',
    '@id': `${pageUrl}#job`,
    title: offer.title,
    description,
    datePosted,
    validThrough: isoDate(offer.closes_at ?? offer.closesAt),
    employmentType: 'FULL_TIME',
    hiringOrganization: { '@id': ORGANIZATION_ID },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: offer.location,
        addressCountry: site.contact.country,
      },
    },
    baseSalary: parseMonthlySalary(offer.price),
    industry: 'Manufacturing',
    workHours: offer.duration,
    jobBenefits: Array.isArray(offer.included) && offer.included.length > 0 ? offer.included.join('; ') : undefined,
    identifier: {
      '@type': 'PropertyValue',
      name: 'Al-Tayeb job reference',
      value: String(offer.reference ?? offer.id ?? ''),
    },
    url: pageUrl,
    directApply: true,
    inLanguage: site.language,
  })
}

// SEO: an ItemList makes a jobs index easier to understand and can help search
// engines discover individual postings. GEO: exposes a clean ordered list of
// entities instead of asking a model to infer it from layout.
export function buildItemListSchema(items = [], { path = '/offers', name = 'Open factory jobs' } = {}) {
  const offers = items.filter((offer) => offer?.slug && offer?.title)
  if (offers.length === 0) return undefined

  const pageUrl = absoluteUrl(path)
  return {
    '@type': 'ItemList',
    '@id': `${pageUrl}#jobs`,
    name,
    numberOfItems: offers.length,
    itemListElement: offers.map((offer, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: offer.title,
      url: absoluteUrl(`/offers/${offer.slug}`),
    })),
  }
}

// SEO + GEO: one JSON-LD graph per page. This avoids several disconnected
// script tags and lets every node reference the same Organization and WebSite
// IDs.
export function buildPageGraph({
  pageSchema,
  breadcrumbs,
  title,
  description,
  path = '/',
} = {}) {
  const pages = (Array.isArray(pageSchema) ? pageSchema : [pageSchema]).filter(Boolean)

  if (pages.length === 0) {
    pages.push(buildWebPageSchema({ title, description, path }))
  }

  const hasWebPageType = pages.some((item) => (
    typeof item['@type'] === 'string'
    && ['WebPage', 'AboutPage', 'ContactPage', 'CollectionPage', 'FAQPage', 'ItemPage', 'Article'].includes(item['@type'])
  ))

  if (!hasWebPageType) {
    pages.push(buildWebPageSchema({
      title,
      description,
      path,
      mainEntityId: pages[0]?.['@id'],
    }))
  }

  const graph = [
    buildOrganizationSchema(),
    buildWebSiteSchema(),
    buildBreadcrumbSchema(breadcrumbs ?? []),
    ...pages,
  ].filter(Boolean)

  // @id values must be unique; a duplicate would make the graph ambiguous.
  const seen = new Set()
  const uniqueGraph = graph.filter((node) => {
    if (!node['@id']) return true
    if (seen.has(node['@id'])) return false
    seen.add(node['@id'])
    return true
  })

  return {
    '@context': 'https://schema.org',
    '@graph': uniqueGraph,
  }
}

export {
  ORGANIZATION_ID,
  WEBSITE_ID,
  isoDate,
  parseMonthlySalary,
}
