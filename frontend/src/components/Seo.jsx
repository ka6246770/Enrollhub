// SEO: keeps route-specific title, description, canonical, robots, Open Graph
// and Twitter tags in sync without adding a metadata dependency.
// GEO: injects one JSON-LD @graph per route so answer engines receive the same
// company, page and FAQ facts that visitors can see.
//
// The tags are updated in place rather than removed on unmount. That keeps the
// head populated during client-side navigation and avoids a flash where a
// crawler could see no description at all.

import { useEffect } from 'react'
import { SEO_LIMITS, absoluteUrl, site } from '../config/site.js'
import { buildPageGraph } from '../lib/seo.js'

const MANAGED = 'data-seo-managed'

function setMeta(attribute, key, content) {
  if (content === undefined || content === null || content === '') return

  let element = document.head.querySelector(`meta[${attribute}="${key}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }
  element.setAttribute(MANAGED, 'true')
  element.setAttribute('content', String(content))
}

function setOptionalMeta(attribute, key, content) {
  if (content) {
    setMeta(attribute, key, content)
    return
  }

  const element = document.head.querySelector(`meta[${attribute}="${key}"]`)
  if (element?.getAttribute(MANAGED) === 'true') element.remove()
}

function setCanonical(href) {
  let element = document.head.querySelector('link[rel="canonical"]')
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', 'canonical')
    document.head.appendChild(element)
  }
  element.setAttribute(MANAGED, 'true')
  element.setAttribute('href', href)
}

function setJsonLd(json) {
  let element = document.getElementById('seo-jsonld')
  if (!element) {
    element = document.createElement('script')
    element.id = 'seo-jsonld'
    element.type = 'application/ld+json'
    document.head.appendChild(element)
  }
  element.setAttribute(MANAGED, 'true')
  element.textContent = json
}

export function Seo({
  title = site.defaultTitle,
  description = site.defaultDescription,
  path = '/',
  image = site.socialImage,
  type = 'website',
  noindex = false,
  schema,
  breadcrumbs,
  publishedTime,
  modifiedTime,
}) {
  const canonical = absoluteUrl(path)
  const imageUrl = absoluteUrl(image)
  const graph = buildPageGraph({ pageSchema: schema, breadcrumbs, title, description, path })
  // Escaping "<" prevents a description or job title containing "</script>"
  // from ending the JSON-LD element early.
  const graphJson = JSON.stringify(graph).replaceAll('<', '\\u003c')

  useEffect(() => {
    document.title = title

    setMeta('name', 'description', description)
    setMeta(
      'name',
      'robots',
      noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    )

    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:url', canonical)
    setMeta('property', 'og:type', type)
    setMeta('property', 'og:site_name', site.shortName)
    setMeta('property', 'og:locale', site.locale)
    setMeta('property', 'og:image', imageUrl)
    setMeta('property', 'og:image:alt', site.socialImageAlt)
    setMeta('property', 'og:image:width', site.socialImageWidth)
    setMeta('property', 'og:image:height', site.socialImageHeight)

    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:title', title)
    setMeta('name', 'twitter:description', description)
    setMeta('name', 'twitter:image', imageUrl)
    setMeta('name', 'twitter:image:alt', site.socialImageAlt)

    setOptionalMeta('property', 'article:published_time', publishedTime)
    setOptionalMeta('property', 'article:modified_time', modifiedTime)

    setCanonical(canonical)
    setJsonLd(graphJson)

    if (import.meta.env.DEV) {
      if (title.length > SEO_LIMITS.title) {
        console.warn(`[SEO] Title is ${title.length} characters; target <= ${SEO_LIMITS.title}.`, title)
      }
      if (description.length > SEO_LIMITS.description) {
        console.warn(`[SEO] Description is ${description.length} characters; target <= ${SEO_LIMITS.description}.`, description)
      }
    }
  }, [
    canonical,
    description,
    graphJson,
    imageUrl,
    modifiedTime,
    noindex,
    publishedTime,
    title,
    type,
  ])

  return null
}

export default Seo
