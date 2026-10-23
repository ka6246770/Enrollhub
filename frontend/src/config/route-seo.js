// SEO: static-route metadata lives in one map so every page has a unique title,
// description, canonical path, schema graph and breadcrumb trail.
// GEO: the FAQ and article schema here are generated from the same visible copy
// used by the pages, which keeps answers citation-ready and consistent.

import { faq } from '../data/site-content.js'
import { site } from './site.js'
import {
  buildArticleSchema,
  buildCollectionPageSchema,
  buildContactPageSchema,
  buildFaqPageSchema,
  buildWebPageSchema,
} from '../lib/seo.js'

export function normalizePath(pathname = '/') {
  const path = String(pathname).split('?')[0].split('#')[0].replace(/\/+$/, '')
  return path || '/'
}

const HOME_DESCRIPTION =
  'Apply for packaging, labeling and steward jobs in Sadat City, El-Obour and 10th of Ramadan. Monthly pay from 6,600 EGP; housing included.'

const OFFERS_DESCRIPTION =
  'Compare packaging, labeling and steward jobs in Sadat City, El-Obour and 10th of Ramadan. Pay 6,600–11,400 EGP a month; housing included.'

const ABOUT_DESCRIPTION =
  'Al-Tayeb factory jobs take about three minutes to apply for: choose a job, enter your details and record a one-to-two-minute voice note. No CV.'

const FAQ_DESCRIPTION =
  'Answers about Al-Tayeb factory jobs: pay from 6,600 to 11,400 EGP a month, 8- and 12-hour shifts, housing, National ID rules and age limits.'

const CONTACT_DESCRIPTION =
  'Contact Al-Tayeb about factory jobs in Sadat City, El-Obour and 10th of Ramadan. Ask about pay, shifts, housing, applications or report a problem.'

const PRIVACY_DESCRIPTION =
  'How Al-Tayeb collects, uses and retains job application data, including contact details, voice notes and National ID eligibility information.'

const TERMS_DESCRIPTION =
  'The terms that apply when you use Al-Tayeb’s job site, submit a factory job application, join a waitlist or contact the recruitment team.'

const HOME = {
  title: 'Al-Tayeb | Factory jobs in Egypt with housing',
  description: HOME_DESCRIPTION,
  schema: (path) => [
    buildWebPageSchema({
      title: 'Al-Tayeb factory jobs in Egypt',
      description: HOME_DESCRIPTION,
      path,
    }),
    buildFaqPageSchema(faq.slice(0, 4), {
      title: 'Questions before you apply',
      description: 'Answers about applying, eligibility, voice notes and pay at Al-Tayeb.',
      path,
    }),
  ],
}

const OFFERS = {
  title: 'Open factory jobs in Egypt | Al-Tayeb',
  description: OFFERS_DESCRIPTION,
  schema: (path) => buildCollectionPageSchema({
    title: 'Open factory jobs in Egypt',
    description: OFFERS_DESCRIPTION,
    path,
  }),
  breadcrumbs: [
    { name: 'Home', path: '/' },
    { name: 'Open jobs', path: '/offers' },
  ],
}

const ABOUT = {
  title: 'How Al-Tayeb hiring works | 3-minute application',
  description: ABOUT_DESCRIPTION,
  type: 'article',
  publishedTime: site.content.publishedAt,
  modifiedTime: site.content.modifiedAt,
  schema: (path) => buildArticleSchema({
    title: 'How Al-Tayeb hiring works',
    description: ABOUT_DESCRIPTION,
    path,
  }),
  breadcrumbs: [
    { name: 'Home', path: '/' },
    { name: 'How it works', path: '/about' },
  ],
}

const FAQ = {
  title: 'Al-Tayeb jobs FAQ | Pay, housing, shifts, eligibility',
  description: FAQ_DESCRIPTION,
  schema: (path) => buildFaqPageSchema(faq, {
    title: 'Al-Tayeb factory jobs FAQ',
    description: FAQ_DESCRIPTION,
    path,
  }),
  breadcrumbs: [
    { name: 'Home', path: '/' },
    { name: 'FAQ', path: '/faq' },
  ],
}

const CONTACT = {
  title: 'Contact Al-Tayeb | Factory job applications',
  description: CONTACT_DESCRIPTION,
  schema: (path) => buildContactPageSchema({
    title: 'Contact Al-Tayeb',
    description: CONTACT_DESCRIPTION,
    path,
  }),
  breadcrumbs: [
    { name: 'Home', path: '/' },
    { name: 'Contact', path: '/contact' },
  ],
}

const PRIVACY = {
  title: 'Privacy policy | Al-Tayeb',
  description: PRIVACY_DESCRIPTION,
  schema: (path) => buildWebPageSchema({
    title: 'Privacy policy',
    description: PRIVACY_DESCRIPTION,
    path,
  }),
  breadcrumbs: [
    { name: 'Home', path: '/' },
    { name: 'Privacy policy', path: '/privacy' },
  ],
}

const TERMS = {
  title: 'Terms of use | Al-Tayeb',
  description: TERMS_DESCRIPTION,
  schema: (path) => buildWebPageSchema({
    title: 'Terms of use',
    description: TERMS_DESCRIPTION,
    path,
  }),
  breadcrumbs: [
    { name: 'Home', path: '/' },
    { name: 'Terms of use', path: '/terms' },
  ],
}

const THANKS = {
  title: 'Application received | Al-Tayeb',
  description: 'Your Al-Tayeb factory job application has been received. Here is what happens next on WhatsApp.',
  noindex: true,
}

const APPLY = {
  title: 'Apply for this job | Al-Tayeb',
  description: 'Apply for an Al-Tayeb factory job. Enter your details and record a short voice note; no CV or account is needed.',
  noindex: true,
}

const WAITLIST = {
  title: 'Join the waitlist | Al-Tayeb',
  description: 'Join the waitlist for a filled Al-Tayeb factory job. Leave your name and WhatsApp number and we will contact you if a place opens.',
  noindex: true,
}

const ADMIN = {
  title: 'Dashboard | Al-Tayeb',
  description: 'Al-Tayeb team dashboard.',
  noindex: true,
}

const NOT_FOUND = {
  title: 'Page not found | Al-Tayeb',
  description: 'This page is not on the board. Browse open Al-Tayeb factory jobs or return to the homepage.',
  noindex: true,
}

const PAGES = {
  '/': HOME,
  '/offers': OFFERS,
  '/about': ABOUT,
  '/faq': FAQ,
  '/contact': CONTACT,
  '/privacy': PRIVACY,
  '/terms': TERMS,
  '/thank-you': THANKS,
}

export function getRouteSeo(pathname = '/') {
  const path = normalizePath(pathname)

  if (path.startsWith('/admin')) {
    return path === '/admin/login'
      ? { ...ADMIN, title: 'Dashboard sign in | Al-Tayeb' }
      : ADMIN
  }

  // The offer detail page builds its own metadata from live offer data.
  // Returning undefined prevents this static map from overwriting it.
  if (/^\/offers\/[^/]+$/.test(path)) return undefined
  if (/^\/offers\/[^/]+\/apply$/.test(path)) return APPLY
  if (/^\/offers\/[^/]+\/waitlist$/.test(path)) return WAITLIST

  return PAGES[path] ?? NOT_FOUND
}
