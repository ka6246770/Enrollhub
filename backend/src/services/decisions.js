import { query } from '../db/database.js'
import { decisionEmail, sendEmail } from './email.js'

// Applies an accept/reject (or contacted) decision to one registration and
// emails the customer for accept/reject.
//
// Shared by the Telegram webhook and the dashboard's PATCH endpoint, so a
// decision made in either place behaves the same. Returns { found, changed } so
// callers can tell a real change from a repeated button press.
export async function applyDecision(id, nextStatus, { notes } = {}) {
  const { rows } = await query(
    `SELECT r.*, o.title AS offer_title, o.slug AS offer_slug
     FROM registrations r
     JOIN offers o ON o.id = r.offer_id
     WHERE r.id = $1`,
    [id],
  )
  const existing = rows[0]
  if (!existing) return { found: false, changed: false }

  if (existing.status === nextStatus) {
    return { found: true, changed: false, registration: existing }
  }

  const { rows: updatedRows } = await query(
    `UPDATE registrations
     SET status = $2,
         notes = COALESCE($3, notes),
         whatsapp_confirmed = $2 IN ('accepted', 'contacted')
     WHERE id = $1
     RETURNING *`,
    [id, nextStatus, notes ?? null],
  )

  const record = updatedRows[0]
  const result = { ...record, offer_title: existing.offer_title, offer_slug: existing.offer_slug }

  // Only accept / reject notify the customer.
  if (nextStatus === 'accepted' || nextStatus === 'rejected') {
    const mail = await decisionEmail(nextStatus, {
      name: record.name,
      offer: existing.offer_title,
      offerSlug: existing.offer_slug,
    })
    await sendEmail({
      to: record.email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      registrationId: record.id,
      type: nextStatus,
    })
  }

  return { found: true, changed: true, previousStatus: existing.status, registration: result }
}
