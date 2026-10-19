import { useRef, useState } from 'react'
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning.js'
import { formatDateTime } from '../../lib/format.js'
import { inputClass, solidButton } from '../../lib/ui.js'

// Hoisted so the regexp is not rebuilt on every keystroke.
const VARIABLE = /\{(\w+)\}/g

// Fills a text's {tokens} with the sample values so the owner can see what the
// message will look like before anyone receives it. An unknown token stays
// visible, which is the same thing the backend's renderer does.
function withSamples(body, sample) {
  return body.replace(VARIABLE, (match, key) => (sample?.[key] ?? match))
}

// One editable message text.
//
// The backend is the source of truth (see backend/src/services/messageTemplates.js):
// saving here means the very next message uses the new text. The server rejects a
// text that lost a variable the message needs, and its message is shown in place.
export function TemplateEditor({ template, sample, onSave }) {
  const [body, setBody] = useState(template.body)
  const [savedBody, setSavedBody] = useState(template.body)
  const [status, setStatus] = useState('idle') // idle | saving | saved | error
  const [message, setMessage] = useState('')
  const fieldRef = useRef(null)

  const fieldId = `template-${template.key}`
  const dirty = body !== savedBody

  useUnsavedChangesWarning(dirty)

  // Adds a variable where the cursor is, then leaves the cursor after it.
  function insertVariable(token) {
    const field = fieldRef.current
    const start = field?.selectionStart ?? body.length
    const end = field?.selectionEnd ?? start
    setBody((current) => `${current.slice(0, start)}${token}${current.slice(end)}`)
    requestAnimationFrame(() => {
      if (!field) return
      const caret = start + token.length
      field.focus()
      field.setSelectionRange(caret, caret)
    })
  }

  async function save() {
    setStatus('saving')
    setMessage('')
    try {
      const saved = await onSave(template.key, body)
      const next = saved?.body ?? body
      setBody(next)
      setSavedBody(next)
      setStatus('saved')
      setMessage('Saved. The next message will use this text.')
    } catch (error) {
      setStatus('error')
      setMessage(error.message || 'Could not save this text. Please try again.')
    }
  }

  // What the footer says. Derived here rather than stored, so the three states
  // (untouched, edited, saving) can never disagree with each other.
  let note = template.updatedAt ? `Last saved ${formatDateTime(template.updatedAt)}` : 'Not edited yet'
  if (dirty && status !== 'saving' && status !== 'error') note = 'Unsaved changes'
  if (status === 'saving') note = 'Saving…'
  if (status === 'error') note = message
  if (status === 'saved' && !dirty) note = message

  return (
    <article className="flex flex-col rounded-xl border border-line bg-white p-5">
      {/* h4 because the Messages page groups these under an h3 channel heading. */}
      <h4 className="font-bold">{template.label}</h4>
      <p className="mt-1 text-[11px] text-muted">{template.where}</p>

      <label className="mt-4 text-[10px] font-bold text-muted" htmlFor={fieldId}>Message text</label>
      <textarea
        aria-describedby={`${fieldId}-hint`}
        className={`${inputClass} mt-1.5 min-h-32 resize-y py-3 leading-relaxed`}
        id={fieldId}
        onChange={(event) => {
          setBody(event.target.value)
          // Editing again clears a stale "Saved" or error note, so the footer
          // never describes a text that is no longer in the box.
          if (status !== 'idle') setStatus('idle')
        }}
        ref={fieldRef}
        value={body}
      />

      <p className="mt-2 text-[10px] text-muted" id={`${fieldId}-hint`}>
        Add a variable where the cursor is:
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {template.variables.map((token) => (
          <button
            aria-label={`Add {${token}}`}
            className="rounded-full bg-page px-3 py-1.5 text-[10px] font-bold text-muted transition-colors hover:bg-soft hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none"
            key={token}
            onClick={() => insertVariable(`{${token}}`)}
            type="button"
          >
            {`{${token}}`}
          </button>
        ))}
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <p className="text-[10px] font-bold text-muted">Preview with sample values</p>
        <p className="mt-1.5 whitespace-pre-wrap break-words rounded-lg bg-page p-3 text-[11px] leading-relaxed text-ink">
          {withSamples(body, sample)}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button className={`${solidButton} px-4`} disabled={!dirty || status === 'saving'} onClick={save} type="button">
          {status === 'saving' ? 'Saving…' : 'Save'}
        </button>
        <span
          className={`text-[10px] font-bold ${status === 'error' ? 'text-coral-ink' : 'text-muted'}`}
          role={status === 'error' ? 'alert' : 'status'}
        >
          {note}
        </span>
      </div>
    </article>
  )
}

export default TemplateEditor
