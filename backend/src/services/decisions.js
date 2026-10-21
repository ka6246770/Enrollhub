import { query } from '../db/database.js'
import { sendEmail, siteUrl, statusEmail } from './email.js'
import { createStatusToken } from './tokens.js'

// Statuses an admin may set from the dashboard or Telegram. `accepted` and
// `declined` are deliberately absent: only the applicant can answer a private
// offer link, which is what makes "confirmed" mean the applicant agreed.
export const ADMIN_STATUSES = ['new', 'contacted', 'offered', 'rejected']

const APPLICANT_STATUSES = new Set(['accepted', 'declined'])

// Applies an admin decision to one registration and emails the customer when
// the status really changed. Returns { found, changed, registration, statusUrl }
// so callers can tell a real change from a repeated button press.
export async function applyDecision(id, nextStatus, { notes, followUpAt } = {}) {
  if (APPLICANT_STATUSES.has(nextStatus)) {
    throw Object.assign(
      new Error('A place is confirmed only after the applicant accepts their private link.'),
      { status: 400 },
    )
  }
  if (!ADMIN_STATUSES.includes(nextStatus)) {
    throw Object.assign(new Error('Invalid application status.'), { status: 400 })
  }

  const { rows } = await query(
    `SELECT r.*, o.title AS offer_title, o.slug AS offer_slug
     FROM registrations r
     JOIN offers o ON o.id = r.offer_id
     WHERE r.id = $1`,
    [id],
  )
  const existing = rows[0]
  if (!existing) return { found: false, changed: false }

  const changed = existing.status !== nextStatus
  let token = existing.status_token
  if (nextStatus === 'offered' && !token) token = createStatusToken('reg')

  const sets = [
    'status = $2',
    'updated_at = now()',
    `whatsapp_confirmed = ($2::text = ANY(ARRAY['contacted', 'offered', 'accepted']))`,
  ]
  const params = [id, nextStatus]

  if (notes !== undefined) {
    params.push(notes)
    sets.push(`notes = $${params.length}`)
  }
  if (followUpAt !== undefined) {
    params.push(followUpAt)
    sets.push(`follow_up_at = $${params.length}`)
  }
  if (token !== existing.status_token) {
    params.push(token)
    sets.push(`status_token = $${params.length}`)
  }
  if (nextStatus === 'offered' && existing.status !== 'offered') {
    sets.push('offered_at = now()')
  }
  if (nextStatus !== 'accepted' && nextStatus !== 'declined') {
    sets.push('responded_at = NULL')
  }

  const { rows: updatedRows } = await query(
    `UPDATE registrations SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    params,
  )

  const record = updatedRows[0]
  const result = { ...record, offer_title: existing.offer_title, offer_slug: existing.offer_slug }
  const link = token ? `${siteUrl()}/status/${token}` : null

  if (changed && ['contacted', 'offered', 'rejected'].includes(nextStatus)) {
    const mail = await statusEmail(nextStatus, {
      name: record.name,
      offer: existing.offer_title,
      offerSlug: existing.offer_slug,
      statusLink: link,
    })
    if (mail) {
      await sendEmail({
        to: record.email,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        registrationId: record.id,
        type: nextStatus,
      })
    }
  }

  return { found: true, changed, previousStatus: existing.status, registration: result, statusUrl: link }
}
