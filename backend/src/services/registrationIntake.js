// Registration intake: the write workflow behind POST /api/registrations.
//
// The route owns HTTP. This module owns the rules that must stay together:
// consent, validation, offer availability, the duplicate guard, the seat
// counter, voice storage, and the notifications that follow a saved row.
// Keeping them here means a new caller (a retry job, an import) reaches the
// same rules through one interface.
import { z } from 'zod'
import { env } from '../config/env.js'
import { pool, query } from '../db/database.js'
import { confirmationEmail, ownerRegistrationEmail, sendEmail, siteUrl } from './email.js'
import { closeExpiredOffers } from './offers.js'
import { createReferenceCode } from './referenceCode.js'
import { notifyNewRegistration, storeVoiceFile } from './telegram.js'
import { createStatusToken } from './tokens.js'

const emptyToUndefined = (value) => (value === '' || value === null || value === undefined ? undefined : value)
const optionalNumber = (min, max) => z.preprocess(emptyToUndefined, z.coerce.number().int().min(min).max(max).optional())
const optionalText = (max) => z.preprocess(emptyToUndefined, z.string().trim().max(max).optional())

const registrationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  age: optionalNumber(13, 120),
  language: optionalText(60),
  level: optionalText(60),
  residence: optionalText(160),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(6).max(40),
  offerSlug: z.string().trim().min(1).max(80),
})

// The dashboard forms post checkbox values, which arrive as strings.
function isConsentGiven(value) {
  return value === 'on' || value === 'true' || value === '1' || value === true
}

function httpError(message, status) {
  return Object.assign(new Error(message), { status })
}

async function rollbackQuietly(client) {
  try {
    await client.query('ROLLBACK')
  } catch {
    // The transaction already ended; the original error is the one to report.
  }
}

// Reads the offer and refuses it unless it can accept one more application.
// Runs before BEGIN so a rejected form never opens a transaction.
async function findBookableOffer(client, slug) {
  const { rows } = await client.query('SELECT * FROM offers WHERE slug = $1', [slug])
  const offer = rows[0]
  if (!offer) throw httpError('Offer not found.', 404)

  if (offer.status === 'paused') {
    throw httpError('Registration is paused for this offer. Please check back later.', 409)
  }
  if (offer.status === 'closed') {
    throw httpError('This offer is no longer accepting applications.', 409)
  }
  if (offer.status !== 'active' || offer.seats_taken >= offer.seats_total) {
    throw httpError('This offer is sold out. Please join the waitlist instead.', 409)
  }

  return offer
}

// The duplicate guard, the row insert, and the seat counter share one
// transaction: a duplicate must not consume a seat, and a failed insert must
// not leave seats_taken behind.
async function saveRegistration(client, { offer, input, voiceMime }) {
  const statusToken = createStatusToken('reg')
  const referenceCode = createReferenceCode()

  try {
    await client.query('BEGIN')

    const { rows: duplicates } = await client.query(
      `SELECT 1 FROM registrations
       WHERE offer_id = $1 AND (email = $2 OR phone = $3)
         AND created_at > now() - make_interval(hours => $4::int)
       LIMIT 1`,
      [offer.id, input.email, input.phone, env.duplicateWindowHours],
    )
    if (duplicates.length > 0) {
      throw httpError('You have already registered for this offer. We will contact you soon.', 409)
    }

    const { rows: insertedRows } = await client.query(
      `INSERT INTO registrations (offer_id, name, age, language, level, residence, email, phone, voice_mime, status_token, reference_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        offer.id,
        input.name,
        input.age ?? null,
        input.language ?? null,
        input.level ?? null,
        input.residence ?? null,
        input.email,
        input.phone,
        voiceMime,
        statusToken,
        referenceCode,
      ],
    )

    await client.query(
      `UPDATE offers
       SET seats_taken = seats_taken + 1,
           status = CASE WHEN seats_taken + 1 >= seats_total THEN 'soldout' ELSE status END,
           updated_at = now()
       WHERE id = $1`,
      [offer.id],
    )

    await client.query('COMMIT')
    return { registration: insertedRows[0], statusToken }
  } catch (error) {
    await rollbackQuietly(client)
    throw error
  }
}

async function emailOwnerCopy({ registration, offer, voice }) {
  if (!env.ownerEmail) return

  const mail = await ownerRegistrationEmail({ registration, offer, voice })
  await sendEmail({
    to: env.ownerEmail,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
    attachments: mail.attachments,
    // Lets the owner answer the applicant straight from the report email.
    replyTo: registration.email,
    registrationId: registration.id,
    type: 'owner_email',
  })
}

async function emailApplicantConfirmation({ registration, offer, statusToken }) {
  const mail = await confirmationEmail({
    name: registration.name,
    offer: offer.title,
    offerSlug: offer.slug,
    reference: registration.reference_code,
    statusLink: `${siteUrl()}/status/${statusToken}`,
  })
  await sendEmail({
    to: registration.email,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
    registrationId: registration.id,
    type: 'customer_confirmation',
  })
}

// Everything after COMMIT. Each step is independent inside its own helper, and
// none of them may fail the visitor's registration (storeVoiceFile is the one
// exception the route already treats as a server error).
async function announceRegistration({ registration, offer, voice, statusToken }) {
  if (voice) {
    const filename = await storeVoiceFile(registration.id, voice)
    await query('UPDATE registrations SET voice_path = $1 WHERE id = $2', [filename, registration.id])
    registration.voice_path = filename
  }

  const messageId = await notifyNewRegistration({ registration, offer, voice })
  if (messageId) {
    await query('UPDATE registrations SET telegram_message_id = $1 WHERE id = $2', [messageId, registration.id])
  }

  await emailOwnerCopy({ registration, offer, voice })
  await emailApplicantConfirmation({ registration, offer, statusToken })
}

// Creates one registration and announces it. Throws an error with `status` for
// the route to render; validation errors stay ZodError for the shared handler.
export async function createRegistration({ form, voice }) {
  if (!isConsentGiven(form?.consent)) {
    throw httpError('Please accept the consent statement to continue.', 400)
  }

  const input = registrationSchema.parse(form)

  // Date-driven closure is applied before the offer is read, so a stale
  // `active` row cannot accept an application after its closing date.
  await closeExpiredOffers()

  const client = await pool.connect()
  let offer
  let registration
  let statusToken
  try {
    offer = await findBookableOffer(client, input.offerSlug)
    const saved = await saveRegistration(client, { offer, input, voiceMime: voice?.mimetype ?? null })
    registration = saved.registration
    statusToken = saved.statusToken
  } finally {
    client.release()
  }

  await announceRegistration({ registration, offer, voice, statusToken })
  return { registration, offer, statusToken }
}
