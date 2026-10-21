// SEO: generates public/sitemap.xml from the public routes plus every offer
// returned by the API, and keeps the Sitemap line in robots.txt on the same
// origin. Run it after changing VITE_SITE_URL, after adding offers, or as a
// scheduled/CI step. It deliberately fails soft: a missing API still produces a
// valid sitemap for the static pages.
//
// Usage:
//   VITE_SITE_URL=https://example.com VITE_API_URL=/api npm run seo:sitemap

import { access, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC_DIR = path.join(ROOT, 'public')
const DIST_DIR = path.join(ROOT, 'dist')

const siteUrl = (
  process.env.VITE_SITE_URL
  || process.env.SITE_URL
  || 'https://enrollhub.example.com'
).replace(/\/+$/, '')

const apiSetting = process.env.VITE_API_URL || process.env.SITEMAP_API_URL || 'http://localhost:3001/api'
const apiUrl = (apiSetting.startsWith('http') ? apiSetting : new URL(apiSetting || '/api', siteUrl).toString()).replace(/\/+$/, '')
const contentDate = process.env.VITE_CONTENT_UPDATED_AT || '2026-10-21'

const STATIC_ROUTES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/offers', changefreq: 'daily', priority: '0.9' },
  { path: '/about', changefreq: 'monthly', priority: '0.7' },
  { path: '/faq', changefreq: 'monthly', priority: '0.7' },
  { path: '/contact', changefreq: 'yearly', priority: '0.6' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
]

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function isoDay(value) {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10)
}

function urlEntry({ loc, lastmod, changefreq, priority }) {
  return [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod ? `    <lastmod>${escapeXml(lastmod)}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    '  </url>',
  ].filter(Boolean).join('\n')
}

async function fetchOffers() {
  try {
    const response = await fetch(`${apiUrl}/offers`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) throw new Error(`API returned ${response.status}`)
    const data = await response.json()
    if (!Array.isArray(data)) throw new Error('API did not return an offer array')
    return data.filter((offer) => offer?.slug && offer.status !== 'closed')
  } catch (error) {
    console.warn(`[sitemap] Could not load offers from ${apiUrl}: ${error.message}`)
    console.warn('[sitemap] Writing static routes only. Re-run when the API is reachable.')
    return []
  }
}

async function main() {
  if (!process.env.VITE_SITE_URL && !process.env.SITE_URL) {
    console.warn('[sitemap] VITE_SITE_URL is not set; using the placeholder https://enrollhub.example.com.')
  }

  const offers = await fetchOffers()

  const entries = [
    ...STATIC_ROUTES.map((route) => urlEntry({
      ...route,
      loc: `${siteUrl}${route.path}`,
      lastmod: contentDate,
    })),
    ...offers.map((offer) => urlEntry({
      loc: `${siteUrl}/offers/${encodeURIComponent(offer.slug)}`,
      lastmod: isoDay(offer.updatedAt ?? offer.createdAt),
      changefreq: 'daily',
      priority: '0.8',
    })),
  ]

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n')

  await writeFile(path.join(PUBLIC_DIR, 'sitemap.xml'), xml, 'utf8')
  console.log(`[sitemap] Wrote ${entries.length} URLs (${offers.length} offers) to public/sitemap.xml`)

  // Keep the sitemap declaration in robots.txt on the same origin.
  try {
    const robotsPath = path.join(PUBLIC_DIR, 'robots.txt')
    const robots = await readFile(robotsPath, 'utf8')
    const nextRobots = robots.includes('Sitemap:')
      ? robots.replace(/^Sitemap:.*$/m, `Sitemap: ${siteUrl}/sitemap.xml`)
      : `${robots.trimEnd()}\n\nSitemap: ${siteUrl}/sitemap.xml\n`
    await writeFile(robotsPath, nextRobots, 'utf8')
    console.log('[sitemap] Synced the Sitemap line in public/robots.txt')
  } catch (error) {
    console.warn(`[sitemap] Could not update public/robots.txt: ${error.message}`)
  }

  // When the script runs after `vite build`, keep the copied file in sync too.
  try {
    await access(DIST_DIR)
    await writeFile(path.join(DIST_DIR, 'sitemap.xml'), xml, 'utf8')
    console.log('[sitemap] Also wrote dist/sitemap.xml')
  } catch {
    // No dist directory; nothing to sync.
  }
}

main().catch((error) => {
  console.error('[sitemap] Failed:', error)
  process.exitCode = 1
})
