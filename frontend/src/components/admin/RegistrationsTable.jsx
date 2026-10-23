import { useEffect, useRef, useState } from 'react'
import { dateOnly } from '../../lib/dashboard.js'
import { formatDate, isDateDue } from '../../lib/format.js'
import { outlineButton } from '../../lib/ui.js'
import { fetchVoiceClip } from '../../services/api.js'
import DataTable from './DataTable.jsx'
import { OfferPill, StatusBadge } from './StatusBadge.jsx'

const STATUS_TONES = {
  new: 'neutral',
  contacted: 'plum',
  offered: 'warning',
  accepted: 'brand',
  rejected: 'danger',
  declined: 'neutral',
}

// Plays a registration's voice note. The endpoint is admin-only, so the clip is
// downloaded with fetch (cookie included) and played from a blob URL.
function VoiceButton({ registrationId, hasRecording, label }) {
  const [status, setStatus] = useState('idle')
  const audioRef = useRef(null)
  const urlRef = useRef('')

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
  }, [])

  if (!hasRecording) {
    return <span aria-label="No recording" className="text-muted">—</span>
  }

  async function play() {
    try {
      setStatus('loading')
      const blob = await fetchVoiceClip(registrationId)
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      urlRef.current = URL.createObjectURL(blob)

      const audio = audioRef.current ?? new Audio()
      audioRef.current = audio
      audio.src = urlRef.current
      audio.onended = () => setStatus('idle')
      await audio.play()
      setStatus('playing')
    } catch {
      setStatus('error')
    }
  }

  return (
    <button
      aria-label={status === 'error' ? `${label} — could not load` : label}
      className="grid size-8 place-items-center rounded-full bg-mint text-brand-text transition-colors hover:bg-brand hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none disabled:opacity-60"
      disabled={status === 'loading'}
      onClick={play}
      title={status === 'error' ? 'Could not load the recording' : undefined}
      type="button"
    >
      <svg aria-hidden="true" className="size-3.5 fill-current" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5-11-6.5Z" /></svg>
    </button>
  )
}

function makeColumns({ onDecide, onManage, pendingId, today }) {
  return [
    { key: 'name', header: 'Name', rowHeader: true, className: 'whitespace-nowrap text-left font-bold', cell: (person) => person.name },
    { key: 'offer', header: 'Offer', cell: (person) => <OfferPill id={person.offerId} /> },
    { key: 'applied', header: 'Applied', className: 'whitespace-nowrap', cell: (person) => dateOnly(person.createdAt) },
    { key: 'age', header: 'Age', className: 'tabular-nums', cell: (person) => person.age ?? '—' },
    { key: 'residence', header: 'Residence', cell: (person) => person.residence ?? '—' },
    { key: 'email', header: 'Email', cell: (person) => person.email },
    { key: 'phone', header: 'Phone', className: 'whitespace-nowrap', cell: (person) => person.phone },
    {
      key: 'voice',
      header: 'Voice',
      cell: (person) => (
        <VoiceButton
          hasRecording={Boolean(person.hasRecording || person.voiceUrl)}
          label={`Play ${person.name}'s recording`}
          registrationId={person.id}
        />
      ),
    },
    {
      key: 'followUp',
      header: 'Follow-up',
      className: 'whitespace-nowrap',
      cell: (person) => {
        if (!person.followUpAt) return <span className="text-muted">—</span>
        const due = isDateDue(person.followUpAt, today)
        return (
          <span className={due ? 'font-bold text-coral-ink' : ''}>
            {formatDate(person.followUpAt)}{due ? ' · due' : ''}
          </span>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      cell: (person) => (
        <StatusBadge className="capitalize" tone={STATUS_TONES[person.status]}>
          {person.status}
        </StatusBadge>
      ),
    },
    {
      key: 'decision',
      header: 'Action',
      className: 'whitespace-nowrap',
      cell: (person) => (
        <span className="flex flex-wrap gap-1.5">
          <button
            className={`${outlineButton} px-2.5 py-1 text-[10px]`}
            onClick={() => onManage(person)}
            type="button"
          >
            Manage
          </button>
          <button
            className={`${outlineButton} px-2.5 py-1 text-[10px]`}
            disabled={pendingId === person.id || ['offered', 'accepted'].includes(person.status)}
            onClick={() => onDecide(person, 'offered')}
            type="button"
          >
            Offer place
          </button>
          <button
            className={`${outlineButton} px-2.5 py-1 text-[10px]`}
            disabled={pendingId === person.id || person.status === 'rejected' || person.status === 'accepted'}
            onClick={() => onDecide(person, 'rejected')}
            type="button"
          >
            Not selected
          </button>
        </span>
      ),
    },
  ]
}

export function RegistrationsTable({ loading, onDecide, onManage, pendingId, rows, today }) {
  return (
    <DataTable
      caption="Registrations"
      cellClass="px-3 py-3"
      columns={makeColumns({ onDecide, onManage, pendingId, today })}
      emptyMessage={loading ? 'Loading…' : 'No registrations match your filters.'}
      getRowKey={(person) => person.id}
      minWidth="min-w-[1500px]"
      rows={rows}
      textSize="text-[11px]"
    />
  )
}

export default RegistrationsTable
