import { useState } from 'react'
import { SITE_URL } from '../../config/site.js'
import { copyText } from '../../lib/clipboard.js'
import { formatDate, formatDateTime } from '../../lib/format.js'
import { inputClass, label, outlineButton, solidButton } from '../../lib/ui.js'
import {
  createRegistrationStatusLink,
  deleteRegistration,
  updateRegistration,
} from '../../services/api.js'
import AdminDialog from './AdminDialog.jsx'

const ADMIN_STATUS_OPTIONS = [
  ['new', 'Received'],
  ['contacted', 'In review'],
  ['offered', 'Place offered'],
  ['rejected', 'Not selected'],
]

const APPLICANT_STATUS_OPTIONS = [
  ['accepted', 'Place confirmed (applicant accepted)'],
  ['declined', 'Offer declined (applicant declined)'],
]

const STATUS_NOTES = {
  contacted: 'The applicant will receive an under-review update.',
  offered: 'A private link is emailed. The place is not confirmed until the applicant accepts it.',
  rejected: 'The applicant will receive a not-selected update.',
  new: 'The application returns to the received queue. No email is sent for this change.',
}

function statusUrlFor(token) {
  return token ? `${SITE_URL}/status/${token}` : ''
}

export default function RegistrationDialog({ person, onClose, onDeleted, onUpdated }) {
  const [status, setStatus] = useState(person.status)
  const [notes, setNotes] = useState(person.notes ?? '')
  const [followUpAt, setFollowUpAt] = useState(person.followUpAt ?? '')
  const [saving, setSaving] = useState(false)
  const [linkState, setLinkState] = useState('idle')
  const [link, setLink] = useState(statusUrlFor(person.statusToken))
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const applicantStatus = APPLICANT_STATUS_OPTIONS.find(([value]) => value === status)

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const patch = {
        notes: notes.trim() ? notes.trim() : null,
        followUpAt: followUpAt || null,
      }
      if (status !== person.status) patch.status = status
      const updated = await updateRegistration(person.id, patch)
      if (updated.statusToken) setLink(statusUrlFor(updated.statusToken))
      setNotice(
        status !== person.status && STATUS_NOTES[status]
          ? STATUS_NOTES[status]
          : 'Follow-up details saved.',
      )
      onUpdated(updated)
    } catch (saveError) {
      setError(saveError.message || 'Could not save the application.')
    } finally {
      setSaving(false)
    }
  }

  async function createLink() {
    setLinkState('loading')
    setError('')
    try {
      const result = await createRegistrationStatusLink(person.id)
      setLink(statusUrlFor(result.statusToken))
      setLinkState('copied')
      await copyText(statusUrlFor(result.statusToken))
    } catch (linkError) {
      setLinkState('idle')
      setError(linkError.message || 'Could not create a status link.')
    }
  }

  async function copyLink() {
    const copied = await copyText(link)
    setLinkState(copied ? 'copied' : 'error')
  }

  async function remove() {
    setDeleting(true)
    setError('')
    try {
      await deleteRegistration(person.id)
      onDeleted(person)
    } catch (deleteError) {
      setDeleting(false)
      setError(deleteError.message || 'Could not delete the application.')
    }
  }

  return (
    <AdminDialog
      description={`${person.name} · ${person.email} · ${person.phone}`}
      footer={(
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {link ? (
              <>
                <button className={outlineButton} onClick={copyLink} type="button">
                  {linkState === 'copied' ? 'Link copied' : 'Copy private link'}
                </button>
                <a className={outlineButton} href={link} rel="noreferrer" target="_blank">Open status page</a>
              </>
            ) : (
              <button className={outlineButton} disabled={linkState === 'loading'} onClick={createLink} type="button">
                {linkState === 'loading' ? 'Creating…' : 'Create private link'}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button className={outlineButton} onClick={onClose} type="button">Close</button>
            <button className={solidButton} disabled={saving} form="registration-follow-up" type="submit">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      )}
      onClose={onClose}
      open
      title="Application follow-up"
      wide
    >
      <form className="grid gap-5" id="registration-follow-up" onSubmit={save}>
        <div className="grid gap-3 rounded-lg border border-line bg-soft/40 p-4 text-xs text-muted min-[600px]:grid-cols-2">
          <p><span className="font-bold text-ink">Applied:</span> {formatDateTime(person.createdAt)}</p>
          <p><span className="font-bold text-ink">Recording:</span> {person.hasRecording || person.voiceUrl ? 'Available' : 'Not uploaded'}</p>
          <p><span className="font-bold text-ink">Offer sent:</span> {formatDateTime(person.offeredAt)}</p>
          <p><span className="font-bold text-ink">Applicant response:</span> {formatDateTime(person.respondedAt)}</p>
        </div>

        {notice ? <p className="rounded-lg bg-soft p-3 text-xs font-semibold text-brand" role="status">{notice}</p> : null}
        {error ? <p className="rounded-lg bg-coral p-3 text-xs font-semibold text-coral-ink" role="alert">{error}</p> : null}

        <div className="grid gap-4 min-[600px]:grid-cols-2">
          <label className={label}>
            Status
            <select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}>
              {applicantStatus ? <option value={applicantStatus[0]} disabled>{applicantStatus[1]}</option> : null}
              {ADMIN_STATUS_OPTIONS.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
            </select>
          </label>
          <label className={label}>
            Follow-up date
            <input className={inputClass} type="date" value={followUpAt} onChange={(event) => setFollowUpAt(event.target.value)} />
          </label>
        </div>

        {applicantStatus ? (
          <p className="rounded-lg bg-sand p-3 text-xs leading-relaxed text-sand-ink">
            This state was set by the applicant through their private link. If plans changed, choose
            In review or Place offered and save. Confirmation itself always stays with the applicant.
          </p>
        ) : (
          <p className="text-xs leading-relaxed text-muted">{STATUS_NOTES[status]}</p>
        )}

        <label className={label}>
          Internal notes
          <textarea
            className={`${inputClass} min-h-28 resize-y py-2.5`}
            maxLength={4000}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="What was discussed, what to check next, or why the decision was made…"
            value={notes}
          />
        </label>

        <div className="rounded-lg border border-line p-4">
          <h3 className="text-sm font-bold">Private applicant link</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            The link is the applicant&apos;s credential. Anyone with it can see the status and, when a
            place is offered, accept or decline. Share it only with that applicant.
          </p>
          {link ? <p className="mt-3 break-all rounded bg-soft p-2 font-mono text-[10px] text-ink">{link}</p> : null}
        </div>

        <div className="rounded-lg border border-coral-strong/40 bg-coral/20 p-4">
          <h3 className="text-sm font-bold text-coral-ink">Privacy deletion</h3>
          <p className="mt-1 text-xs leading-relaxed text-coral-ink">
            Permanently removes the applicant&apos;s details, voice recording, message-log entries,
            and the application row. The seat is freed. This cannot be undone.
          </p>
          {confirmDelete ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="inline-flex min-h-9 items-center justify-center rounded-[4px] border border-coral-strong bg-coral-strong px-3 text-xs font-bold text-white disabled:opacity-50" disabled={deleting} onClick={remove} type="button">
                {deleting ? 'Deleting…' : 'Yes, delete permanently'}
              </button>
              <button className={outlineButton} disabled={deleting} onClick={() => setConfirmDelete(false)} type="button">Cancel</button>
            </div>
          ) : (
            <button className={`${outlineButton} mt-3 border-coral-strong text-coral-ink`} onClick={() => setConfirmDelete(true)} type="button">
              Delete applicant data
            </button>
          )}
        </div>

        <p className="text-[11px] text-muted">Follow-up date: {followUpAt ? formatDate(followUpAt) : 'not set'}</p>
      </form>
    </AdminDialog>
  )
}
