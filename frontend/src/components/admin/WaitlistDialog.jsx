import { useState } from 'react'
import { SITE_URL } from '../../config/site.js'
import { copyText } from '../../lib/clipboard.js'
import { formatDate, formatDateTime, todayIso } from '../../lib/format.js'
import { inputClass, label, outlineButton, solidButton } from '../../lib/ui.js'
import { deleteWaitlistEntry, updateWaitlist } from '../../services/api.js'
import AdminDialog from './AdminDialog.jsx'

const STATUS_OPTIONS = [
  ['waiting', 'Waiting'],
  ['contacted', 'Contacted'],
  ['offered', 'Place offered'],
  ['declined', 'Declined'],
]

const STATUS_NOTES = {
  waiting: 'Returns to the waiting list. No message is sent.',
  contacted: 'Record that you reached the person. No automatic message is sent.',
  offered: 'A private link is emailed when an address is on file. The place is confirmed only when the applicant accepts.',
  declined: 'Record that this person is no longer interested. No confirmation is created.',
}

function whatsappHref(entry, link) {
  const digits = String(entry.phone ?? '').replace(/[^\d]/g, '')
  if (!digits || !link) return ''
  const message = `Hello ${entry.name}, a place has opened for ${entry.offerTitle}. Open this private link to accept or decline: ${link}`
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

export default function WaitlistDialog({ entry, onClose, onDeleted, onUpdated }) {
  const [status, setStatus] = useState(entry.status)
  const [notes, setNotes] = useState(entry.notes ?? '')
  const [followUpAt, setFollowUpAt] = useState(entry.followUpAt ?? '')
  const [placeOpenedOn, setPlaceOpenedOn] = useState(entry.placeOpenedOn || todayIso())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const acceptedByApplicant = status === 'accepted'
  const link = entry.statusToken ? `${SITE_URL}/status/${entry.statusToken}` : ''
  const whatsapp = whatsappHref(entry, link)

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const patch = {
        notes: notes.trim() ? notes.trim() : null,
        followUpAt: followUpAt || null,
        placeOpenedOn: placeOpenedOn || null,
      }
      if (status !== entry.status) patch.status = status
      const updated = await updateWaitlist(entry.id, patch)
      setNotice(
        status !== entry.status && STATUS_NOTES[status]
          ? STATUS_NOTES[status]
          : 'Waitlist follow-up saved.',
      )
      onUpdated(updated)
    } catch (saveError) {
      setError(saveError.message || 'Could not save the waitlist entry.')
    } finally {
      setSaving(false)
    }
  }

  async function copyLink() {
    const copyCould = await copyText(link)
    setCopied(copyCould)
  }

  async function remove() {
    setDeleting(true)
    setError('')
    try {
      await deleteWaitlistEntry(entry.id)
      onDeleted(entry)
    } catch (deleteError) {
      setDeleting(false)
      setError(deleteError.message || 'Could not remove the waitlist entry.')
    }
  }

  return (
    <AdminDialog
      description={`${entry.offerTitle} · signed up ${formatDateTime(entry.createdAt)}`}
      footer={(
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {link ? <button className={outlineButton} onClick={copyLink} type="button">{copied ? 'Link copied' : 'Copy private link'}</button> : null}
            {whatsapp ? <a className={outlineButton} href={whatsapp} rel="noreferrer" target="_blank">WhatsApp</a> : null}
          </div>
          <div className="flex gap-2">
            <button className={outlineButton} onClick={onClose} type="button">Close</button>
            <button className={solidButton} disabled={saving} form="waitlist-follow-up" type="submit">{saving ? 'Saving…' : 'Save changes'}</button>
          </div>
        </div>
      )}
      onClose={onClose}
      open
      title="Waitlist follow-up"
      wide
    >
      <form className="grid gap-5" id="waitlist-follow-up" onSubmit={save}>
        <div className="grid gap-3 rounded-lg border border-line bg-soft/40 p-4 text-xs text-muted min-[600px]:grid-cols-2">
          <p><span className="font-bold text-ink">Name:</span> {entry.name}</p>
          <p><span className="font-bold text-ink">Phone:</span> {entry.phone}</p>
          <p><span className="font-bold text-ink">Email:</span> {entry.email || 'Not provided — send the link by WhatsApp'}</p>
          <p><span className="font-bold text-ink">Place opened:</span> {entry.placeOpenedOn ? formatDate(entry.placeOpenedOn) : 'Not recorded'}</p>
          <p><span className="font-bold text-ink">Offered:</span> {formatDateTime(entry.offeredAt)}</p>
          <p><span className="font-bold text-ink">Response:</span> {formatDateTime(entry.respondedAt)}</p>
        </div>

        {notice ? <p className="rounded-lg bg-soft p-3 text-xs font-semibold text-brand" role="status">{notice}</p> : null}
        {error ? <p className="rounded-lg bg-coral p-3 text-xs font-semibold text-coral-ink" role="alert">{error}</p> : null}

        <div className="grid gap-4 min-[600px]:grid-cols-2">
          <label className={label}>
            Status
            <select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}>
              {acceptedByApplicant ? <option disabled value="accepted">Place confirmed (applicant accepted)</option> : null}
              {STATUS_OPTIONS.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
            </select>
          </label>
          <label className={label}>
            Follow-up date
            <input className={inputClass} type="date" value={followUpAt} onChange={(event) => setFollowUpAt(event.target.value)} />
          </label>
        </div>

        <div className="grid gap-4 min-[600px]:grid-cols-2">
          <label className={label}>
            Place opened on
            <input className={inputClass} type="date" value={placeOpenedOn} onChange={(event) => setPlaceOpenedOn(event.target.value)} />
          </label>
          <div className="self-end text-xs leading-relaxed text-muted">{STATUS_NOTES[status]}</div>
        </div>

        <label className={label}>
          Internal notes
          <textarea
            className={`${inputClass} min-h-28 resize-y py-2.5`}
            maxLength={4000}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="What you discussed, when to call again, or why they declined…"
            value={notes}
          />
        </label>

        <div className="rounded-lg border border-line p-4">
          <h3 className="text-sm font-bold">Private acceptance link</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            The applicant uses this link to accept or decline. Until they accept, the place is not
            confirmed. If there is no email address, copy the link and send it by WhatsApp.
          </p>
          {link ? (
            <p className="mt-3 break-all rounded bg-soft p-2 font-mono text-[10px] text-ink">{link}</p>
          ) : (
            <p className="mt-3 text-xs font-semibold text-muted">Offer the place first to create the link.</p>
          )}
        </div>

        <div className="rounded-lg border border-coral-strong/40 bg-coral/20 p-4">
          <h3 className="text-sm font-bold text-coral-ink">Remove from waitlist</h3>
          <p className="mt-1 text-xs leading-relaxed text-coral-ink">
            Deletes this waitlist entry and its email/Telegram logs. It does not affect applications.
          </p>
          {confirmDelete ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="inline-flex min-h-9 items-center justify-center rounded-[4px] border border-coral-strong bg-coral-strong px-3 text-xs font-bold text-white disabled:opacity-50" disabled={deleting} onClick={remove} type="button">
                {deleting ? 'Removing…' : 'Yes, remove permanently'}
              </button>
              <button className={outlineButton} disabled={deleting} onClick={() => setConfirmDelete(false)} type="button">Cancel</button>
            </div>
          ) : (
            <button className={`${outlineButton} mt-3 border-coral-strong text-coral-ink`} onClick={() => setConfirmDelete(true)} type="button">
              Remove entry
            </button>
          )}
        </div>
      </form>
    </AdminDialog>
  )
}
