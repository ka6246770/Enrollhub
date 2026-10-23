import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resend } from 'resend'
import { capabilities, env } from '../config/env.js'
import { recordMessage } from '../db/database.js'
import { renderTemplate } from './messageTemplates.js'
import { registrationValues } from './registrationValues.js'

let client
function getClient() {
  if (!client) client = new Resend(env.resendApiKey)
  return client
}

// --- The frame the emails wear ----------------------------------------------
//
// The layouts are React Email components in ../emails, rendered to static HTML
// by "npm run export" from that folder (see emails/README.md). Every file keeps
// four {{tokens}} that are filled in here, so the text the owner edits on the
// dashboard's Messages page ends up inside a designed email rather than a bare
// paragraph.
//
// The files are read once and kept in memory; restart the API after an export.

const emailDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'emails')
const layouts = new Map()

// Which file belongs to which message. The keys match the template keys in
// config/templates.js, so the missing-design report below is easy to read.
const designFiles = {
  customerConfirmation: 'registration-confirmation.html',
  accepted: 'registration-accepted.html',
  rejected: 'registration-rejected.html',
  waitlist: 'waitlist-joined.html',
  ownerRegistration: 'registration-alert.html',
}

function layout(file) {
  if (!layouts.has(file)) {
    try {
      layouts.set(file, readFileSync(path.join(emailDir, file), 'utf8'))
    } catch {
      // Not exported yet. Not fatal: the email is still sent, as plain text.
      layouts.set(file, null)
    }
  }
  return layouts.get(file)
}

// Reported at boot and by GET /api/health, so a deploy that forgot to run the
// export does not go unnoticed (the emails would quietly become plain text).
export function emailDesignStatus() {
  const missing = Object.entries(designFiles)
    .filter(([, file]) => !layout(file))
    .map(([key, file]) => `${key} (${file})`)
  return { total: Object.keys(designFiles).length, missing }
}

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')

// FRONTEND_URL may list several allowed origins (for CORS), but a link inside an
// email needs exactly one address, so the first one wins.
export function siteUrl() {
  const [first] = String(env.frontendUrl).split(',')
  return (first ?? '').trim().replace(/\/+$/, '')
}

export function statusUrl(token) {
  return token ? `${siteUrl()}/status/${token}` : null
}

function fillLayout(file, values) {
  const html = layout(file)
  if (!html) return null

  const tokens = {
    // The owner's text is escaped and its line breaks become <br />, so a message
    // cannot inject markup into the frame.
    body: escapeHtml(values.body).replace(/\r?\n/g, '<br />'),
    offer: escapeHtml(values.offer),
    // Only the owner's alert uses the applicant's name.
    name: escapeHtml(values.name ?? ''),
    ctaUrl: escapeHtml(values.ctaUrl),
    privacyUrl: escapeHtml(`${siteUrl()}/privacy`),
    // Available for designs that link somewhere of their own, such as a hosted
    // logo (see emails/emails/static/README.md).
    siteUrl: escapeHtml(siteUrl()),
  }

  // Defensive fallback for older exported designs or customized templates. The
  // generated designs no longer contain these tokens; contact is routed to the
  // site rather than inventing an address or phone number.
  const filled = html
    .replaceAll('[YOUR BRAND]', 'Al-Tayeb Company')
    .replaceAll('[BUSINESS ADDRESS]', 'Egypt')
    .replaceAll('[SUPPORT EMAIL]', 'Contact us through the website')

  return filled.replace(/\{\{(\w+)\}\}/g, (match, token) => (
    token in tokens ? tokens[token] : match
  ))
}

const offerLink = (slug) => (slug ? `${siteUrl()}/offers/${slug}` : `${siteUrl()}/offers`)

// Sends one email and records the outcome. Never throws: email failures are
// logged, not surfaced to the visitor.
export async function sendEmail({ to, subject, text, html = null, attachments = null, replyTo = null, registrationId = null, waitlistId = null, type = 'email' }) {
  if (!capabilities.email) {
    console.log(`[email] not configured — would send "${subject}" to ${to}:\n${text}`)
    await recordMessage({ registrationId, waitlistId, channel: 'email', type, recipient: to, status: 'skipped' }).catch(() => {})
    return null
  }

  try {
    const message = { from: env.mailFrom, to, subject, text }
    // Plain text goes out either way: it is the fallback for readers that block
    // HTML, and it is what the dashboard shows when a send is retried.
    if (html) message.html = html
    // Resend takes the bytes straight from memory; this is only used by the
    // owner's copy, which carries the recording.
    if (attachments?.length) message.attachments = attachments
    // So the owner can reply to the visitor straight from the report email.
    if (replyTo) message.replyTo = replyTo

    const { data, error } = await getClient().emails.send(message)
    if (error) throw new Error(error.message)
    await recordMessage({ registrationId, waitlistId, channel: 'email', type, recipient: to, status: 'delivered' })
    return data
  } catch (error) {
    console.error('[email] failed:', error.message)
    await recordMessage({ registrationId, waitlistId, channel: 'email', type, recipient: to, status: 'failed', error: error.message }).catch(() => {})
    return null
  }
}

// The subject lines stay in code (they are not part of the editable texts), but
// every body is rendered from the live template so a dashboard edit applies to
// the next email. All three are async for that reason, and each returns
// { subject, text, html }.
export async function confirmationEmail({ name, offer, offerSlug, reference = null, statusLink = null }) {
  const template = await renderTemplate('customerConfirmation', { name, offer })
  const lines = [template]
  if (reference) {
    lines.push(
      `Your reference code: ${reference}`,
      `Track your application any time: ${siteUrl()}/track?ref=${encodeURIComponent(reference)} (use the email address you applied with).`,
    )
  }
  if (statusLink) lines.push(`Check your application status any time: ${statusLink}`)
  const text = lines.join('\n\n')
  return {
    subject: `We received your registration for ${offer}`,
    text,
    html: fillLayout(designFiles.customerConfirmation, {
      body: text,
      offer,
      ctaUrl: statusLink || offerLink(offerSlug),
    }),
  }
}

// "Email me my reference code" sends every code on record for the address in a
// single message. The route keeps the reply generic; this builder only runs
// when at least one registration matched.
export async function referenceReminderEmail({ name = null, codes = [] }) {
  const lines = [
    `Hello${name ? ` ${name}` : ''},`,
    'You asked us to resend your EnrollHub reference code.',
    ...codes.map((item) => `${item.offer}: ${item.reference}`),
    `Track your application: ${siteUrl()}/track`,
    'Open the tracking page and enter one of the codes above with the email address you applied with.',
  ]
  const text = lines.join('\n\n')
  return {
    subject: 'Your EnrollHub reference code',
    text,
    html: fillLayout(designFiles.customerConfirmation, {
      body: text,
      offer: codes[0]?.offer ?? 'EnrollHub',
      ctaUrl: `${siteUrl()}/track`,
    }),
  }
}

// One place for every status transition email. `offered` and `contacted` share
// the positive design; a rejection points at the other open jobs. The private
// status link is appended to the text so the recipient always has the action.
export async function statusEmail(status, { name, offer, offerSlug, statusLink = null }) {
  const keys = {
    contacted: 'contacted',
    offered: 'offered',
    accepted: 'accepted',
    rejected: 'rejected',
  }
  const key = keys[status]
  if (!key) return null

  const template = await renderTemplate(key, { name, offer })
  const action = status === 'offered' ? 'Open your private link to accept or decline' : 'View your application status'
  const text = statusLink ? `${template}\n\n${action}: ${statusLink}` : template
  const subject = status === 'accepted'
    ? `You're in — ${offer}`
    : status === 'rejected'
      ? `About your registration for ${offer}`
      : status === 'offered'
        ? `A place is available — ${offer}`
        : `We are reviewing your application — ${offer}`

  return {
    subject,
    text,
    html: fillLayout(
      status === 'rejected' ? designFiles.rejected : designFiles.accepted,
      {
        body: text,
        offer,
        ctaUrl: statusLink || (status === 'rejected' ? `${siteUrl()}/offers` : offerLink(offerSlug)),
      },
    ),
  }
}

export async function waitlistEmail({ name, offer, offerSlug }) {
  const text = await renderTemplate('waitlist', { name, offer })
  return {
    subject: `You're on the waitlist for ${offer}`,
    text,
    html: fillLayout(designFiles.waitlist, { body: text, offer, ctaUrl: offerLink(offerSlug) }),
  }
}

export async function waitlistOfferEmail({ name, offer, offerSlug, statusLink }) {
  const template = await renderTemplate('waitlistOffer', { name, offer })
  const text = `${template}\n\nAccept or decline your place: ${statusLink}`
  return {
    subject: `A place has opened — ${offer}`,
    text,
    html: fillLayout(designFiles.waitlist, { body: text, offer, ctaUrl: statusLink || offerLink(offerSlug) }),
  }
}

// The owner's copy of a problem report, comment or question. The text comes
// from the editable `contactReport` template; the HTML is a minimal wrapper
// around the escaped text, so no visitor input can inject markup.
export async function contactReportEmail(report) {
  const text = await renderTemplate('contactReport', {
    type: report.typeLabel,
    name: report.name,
    email: report.email || '—',
    message: report.message,
    pageUrl: report.pageUrl || '—',
    time: report.time,
  })
  const preview = String(report.message).replace(/\s+/g, ' ').trim().slice(0, 60)
  const html = [
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#17211c">',
    '<pre style="margin:0;white-space:pre-wrap;word-break:break-word;font-family:inherit">',
    escapeHtml(text),
    '</pre>',
    '</div>',
  ].join('')

  return {
    subject: `[EnrollHub] ${report.typeLabel}: ${preview}`,
    text,
    html,
    replyTo: report.email || null,
  }
}

// Reads a recording back from disk, for a retry: multer keeps a fresh upload in
// memory, but a resend only has the stored file. Missing files just mean the
// email goes without an attachment.
function storedVoice(voicePath) {
  if (!voicePath) return []
  try {
    return [{
      filename: path.basename(voicePath),
      content: readFileSync(path.resolve(env.uploadDir, voicePath)),
    }]
  } catch {
    return []
  }
}

// The owner's copy of a registration: the whole form (the same editable text
// the Telegram alert uses) plus the recording attached, so it can be searched
// and listened to later without opening Telegram. Sent only when OWNER_EMAIL is
// set; unlike the customer emails, the requester is the owner.
export async function ownerRegistrationEmail({ registration, offer, voice = null, voicePath = null }) {
  const text = await renderTemplate('ownerRegistration', registrationValues(registration, offer))
  const attachments = voice?.buffer
    ? [{ filename: path.basename(voice.originalname || 'recording.mp3'), content: voice.buffer }]
    : storedVoice(voicePath)

  const body = [
    text,
    `Voice recording: ${attachments.length > 0 ? 'attached.' : 'not provided.'}`,
  ].join('\n\n')

  return {
    subject: `New registration — ${registration.name} for ${offer.title}`,
    text: `${body}\n\nReview it in the dashboard: ${siteUrl()}/admin`,
    html: fillLayout(designFiles.ownerRegistration, {
      body,
      offer: offer.title,
      name: registration.name,
      ctaUrl: `${siteUrl()}/admin`,
    }),
    attachments,
  }
}
