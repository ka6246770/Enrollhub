import { query } from '../db/database.js'
import { confirmationEmail, decisionEmail, sendEmail } from './email.js'
import { notifyNewRegistration } from './telegram.js'

// Re-sends one entry from messages_log. Used by the dashboard's Retry action.
// Rebuilds the message from the registration so nothing has to be stored twice.
export async function resendLogEntry(entry) {
  if (!entry.registration_id) {
    throw Object.assign(new Error('This message is not linked to a registration, so it cannot be retried.'), { status: 400 })
  }

  const { rows } = await query(
    `SELECT r.*, o.title AS offer_title, o.slug AS offer_slug
     FROM registrations r
     JOIN offers o ON o.id = r.offer_id
     WHERE r.id = $1`,
    [entry.registration_id],
  )
  const registration = rows[0]
  if (!registration) {
    throw Object.assign(new Error('The original registration no longer exists.'), { status: 400 })
  }

  if (entry.channel === 'email') {
    const details = {
      name: registration.name,
      offer: registration.offer_title,
      offerSlug: registration.offer_slug,
    }
    let mail = null
    if (entry.type === 'customer_confirmation') {
      mail = await confirmationEmail(details)
    } else if (entry.type === 'accepted' || entry.type === 'rejected') {
      mail = await decisionEmail(entry.type, details)
    }

    if (!mail) {
      throw Object.assign(new Error('This email cannot be retried automatically.'), { status: 400 })
    }
    return sendEmail({
      to: registration.email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      registrationId: registration.id,
      type: entry.type,
    })
  }

  if (entry.channel === 'telegram' && entry.type === 'owner_registration') {
    await notifyNewRegistration({
      registration,
      offer: { id: registration.offer_id, title: registration.offer_title, slug: registration.offer_slug },
      voice: null,
    })
    return null
  }

  throw Object.assign(new Error('This message cannot be retried automatically.'), { status: 400 })
}
