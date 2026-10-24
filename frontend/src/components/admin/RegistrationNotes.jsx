import { useEffect, useRef, useState } from 'react'
import { formatDateTime } from '../../lib/format.js'
import { dangerButton, inputClass, label, outlineButton, solidButton } from '../../lib/ui.js'
import {
  createRegistrationNote,
  deleteRegistrationNote,
  fetchRegistrationNotes,
  updateRegistrationNote,
} from '../../services/api.js'

const QUICK_NOTES = ['Called', 'WhatsApp sent', 'No answer', 'Wants a discount']

function isEdited(note) {
  if (!note.createdAt || !note.updatedAt) return false
  return new Date(note.updatedAt).getTime() - new Date(note.createdAt).getTime() > 1000
}

// The running notes log for one application. The list is optimistic: a new
// note appears immediately and is removed again if the API rejects it, so the
// owner never waits on a round trip to keep writing.
export default function RegistrationNotes({ onCountChange, registrationId }) {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [toast, setToast] = useState('')
  const nextTempId = useRef(-1)
  const countChangeRef = useRef(onCountChange)

  useEffect(() => {
    countChangeRef.current = onCountChange
  }, [onCountChange])

  useEffect(() => {
    let active = true
    fetchRegistrationNotes(registrationId)
      .then((data) => {
        if (active) setNotes(Array.isArray(data) ? data : [])
      })
      .catch((error) => {
        if (active) setLoadError(error.message || 'Could not load notes.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [registrationId])

  // The dashboard badge and search follow the list, including optimistic
  // changes, so a new note is searchable without a reload.
  useEffect(() => {
    if (!loading) {
      countChangeRef.current?.(notes.length, notes.map((note) => note.body).join(' '))
    }
  }, [loading, notes])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(''), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  async function addNote(text = draft) {
    const body = String(text).trim()
    if (!body) {
      setToast('Write a note first.')
      return
    }
    if (body.length > 1000) {
      setToast('A note can be at most 1000 characters.')
      return
    }

    const optimistic = {
      id: nextTempId.current,
      registrationId,
      author: '',
      body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pending: true,
    }
    nextTempId.current -= 1
    setDraft('')
    setNotes((current) => [optimistic, ...current])
    setSaving(true)
    try {
      const saved = await createRegistrationNote(registrationId, body)
      setNotes((current) => current.map((note) => (note.id === optimistic.id ? saved : note)))
    } catch (error) {
      setNotes((current) => current.filter((note) => note.id !== optimistic.id))
      setDraft(body)
      setToast(error.message || 'Could not add the note.')
    } finally {
      setSaving(false)
    }
  }

  function startEdit(note) {
    setEditingId(note.id)
    setEditDraft(note.body)
    setConfirmDeleteId(null)
  }

  async function saveEdit(note) {
    const body = editDraft.trim()
    if (!body) {
      setToast('A note cannot be empty.')
      return
    }
    if (body.length > 1000) {
      setToast('A note can be at most 1000 characters.')
      return
    }

    const before = note.body
    setNotes((current) => current.map((item) => (item.id === note.id ? { ...item, body } : item)))
    setSavingEdit(true)
    try {
      const saved = await updateRegistrationNote(note.id, body)
      setNotes((current) => current.map((item) => (item.id === note.id ? saved : item)))
      setEditingId(null)
    } catch (error) {
      setNotes((current) => current.map((item) => (item.id === note.id ? { ...item, body: before } : item)))
      setToast(error.message || 'Could not save the note.')
    } finally {
      setSavingEdit(false)
    }
  }

  async function removeNote(note) {
    const before = notes
    setNotes((current) => current.filter((item) => item.id !== note.id))
    setDeletingId(note.id)
    try {
      await deleteRegistrationNote(note.id)
      setConfirmDeleteId(null)
    } catch (error) {
      setNotes(before)
      setToast(error.message || 'Could not delete the note.')
    } finally {
      setDeletingId(null)
    }
  }

  function handleDraftKeyDown(event) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      addNote()
    }
  }

  return (
    <section aria-labelledby="registration-notes-heading" className="rounded-lg border border-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold" id="registration-notes-heading">Notes</h3>
        <span className="rounded-full bg-soft px-2 py-0.5 text-[10px] font-bold text-muted">
          {notes.length} {notes.length === 1 ? 'note' : 'notes'}
        </span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        A private log of calls and messages. Applicants never see these notes.
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {QUICK_NOTES.map((text) => (
          <button
            className={`${outlineButton} px-2.5 py-1 text-[10px]`}
            disabled={saving}
            key={text}
            onClick={() => addNote(text)}
            type="button"
          >
            {text}
          </button>
        ))}
      </div>

      <label className={`${label} mt-3`}>
        New note
        <textarea
          className={`${inputClass} min-h-20 resize-y py-2`}
          disabled={saving}
          maxLength={1000}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleDraftKeyDown}
          placeholder="What happened? Ctrl+Enter to add."
          value={draft}
        />
      </label>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] text-muted">{draft.length}/1000 · Ctrl+Enter</span>
        <button className={solidButton} disabled={saving || !draft.trim()} onClick={() => addNote()} type="button">
          {saving ? 'Adding…' : 'Add note'}
        </button>
      </div>

      {loading ? <p className="mt-4 text-xs font-bold text-muted" role="status">Loading notes…</p> : null}
      {loadError ? <p className="mt-4 rounded-lg bg-coral p-3 text-xs font-semibold text-coral-ink" role="alert">{loadError}</p> : null}
      {!loading && !loadError && notes.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-line p-3 text-xs text-muted">
          No notes yet. Add the first one above.
        </p>
      ) : null}

      {notes.length > 0 ? (
        <ul className="mt-4 grid list-none gap-2 p-0" aria-busy={loading}>
          {notes.map((note) => (
            <li className={`rounded-lg border border-line p-3 ${note.pending ? 'opacity-60' : 'bg-soft/30'}`} key={note.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-[11px] text-muted">
                  <span className="font-bold text-ink">{note.author || 'Saving…'}</span>
                  {' · '}
                  {note.pending ? 'sending' : formatDateTime(note.createdAt)}
                  {isEdited(note) ? ' · edited' : ''}
                </p>
                {!note.pending ? (
                  <div className="flex gap-1.5">
                    <button className={`${outlineButton} px-2 py-1 text-[10px]`} onClick={() => startEdit(note)} type="button">
                      Edit
                    </button>
                    <button
                      className={`${outlineButton} px-2 py-1 text-[10px] text-coral-ink`}
                      onClick={() => setConfirmDeleteId(note.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>

              {editingId === note.id ? (
                <div className="mt-2">
                  <textarea
                    aria-label="Edit note"
                    className={`${inputClass} min-h-20 resize-y py-2`}
                    disabled={savingEdit}
                    maxLength={1000}
                    onChange={(event) => setEditDraft(event.target.value)}
                    value={editDraft}
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button className={`${solidButton} px-2.5 py-1 text-[10px]`} disabled={savingEdit} onClick={() => saveEdit(note)} type="button">
                      {savingEdit ? 'Saving…' : 'Save note'}
                    </button>
                    <button className={`${outlineButton} px-2.5 py-1 text-[10px]`} disabled={savingEdit} onClick={() => setEditingId(null)} type="button">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-ink">{note.body}</p>
              )}

              {confirmDeleteId === note.id ? (
                <div className="mt-3 rounded border border-coral-strong/30 bg-coral/20 p-2.5">
                  <p className="text-[11px] font-semibold text-coral-ink">Delete this note? This cannot be undone.</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button className={dangerButton} disabled={deletingId === note.id} onClick={() => removeNote(note)} type="button">
                      {deletingId === note.id ? 'Deleting…' : 'Yes, delete'}
                    </button>
                    <button className={`${outlineButton} px-2.5 py-1 text-[10px]`} disabled={deletingId === note.id} onClick={() => setConfirmDeleteId(null)} type="button">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {toast ? (
        <p
          className="motion-notice fixed bottom-4 left-1/2 z-50 w-[calc(100%-32px)] max-w-sm -translate-x-1/2 rounded-lg border border-coral-strong/40 bg-night px-4 py-3 text-xs font-semibold text-white shadow-lg"
          role="alert"
        >
          {toast}
        </p>
      ) : null}
    </section>
  )
}
