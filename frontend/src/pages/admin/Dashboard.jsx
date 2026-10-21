import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdminLayout, PageHeading, StatCard } from '../../components/admin/AdminLayout.jsx'
import DataTable from '../../components/admin/DataTable.jsx'
import RegistrationDialog from '../../components/admin/RegistrationDialog.jsx'
import { OfferPill, StatusBadge } from '../../components/admin/StatusBadge.jsx'
import { useAsyncResource } from '../../hooks/useAsyncResource.js'
import { formatDate, isDateDue, isWithinLastDays, todayIso } from '../../lib/format.js'
import { inputClass, OFFER_BAR_STYLES, outlineButton } from '../../lib/ui.js'
import {
  fetchMessages,
  fetchOffers,
  fetchRegistrations,
  fetchVoiceClip,
  isBackendEnabled,
  updateRegistration,
} from '../../services/api.js'

const CHART_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const STATUS_FILTERS = ['All', 'New', 'Contacted', 'Offered', 'Accepted', 'Rejected', 'Declined']

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
      className="grid size-8 place-items-center rounded-full bg-mint text-brand transition-colors hover:bg-brand hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none disabled:opacity-60"
      disabled={status === 'loading'}
      onClick={play}
      title={status === 'error' ? 'Could not load the recording' : undefined}
      type="button"
    >
      <svg aria-hidden="true" className="size-3.5 fill-current" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5-11-6.5Z" /></svg>
    </button>
  )
}

function dateOnly(value) {
  if (!value) return '—'
  const date = String(value).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? formatDate(date) : '—'
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
      cell: (person) => <StatusBadge className="capitalize">{person.status}</StatusBadge>,
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

function exportCsv(rows) {
  const headings = ['Name', 'Offer', 'Applied', 'Age', 'Residence', 'Email', 'Phone', 'Status', 'Follow-up', 'Notes']
  const values = rows.map((person) => [
    person.name,
    `Offer ${person.offerId}`,
    dateOnly(person.createdAt),
    person.age ?? '',
    person.residence ?? '',
    person.email,
    person.phone,
    person.status,
    person.followUpAt ?? '',
    person.notes ?? '',
  ])
  const csv = [headings, ...values]
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
    .join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'enrollhub-registrations.csv'
  link.click()
  URL.revokeObjectURL(url)
}

function weekdayCounts(rows) {
  const counts = new Array(7).fill(0)
  for (const row of rows) {
    if (!row.createdAt) continue
    const date = new Date(row.createdAt)
    if (Number.isNaN(date.getTime())) continue
    counts[(date.getDay() + 6) % 7] += 1
  }
  return counts
}

export default function Dashboard({ section = 'Overview' }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const [pendingId, setPendingId] = useState(0)
  const [editing, setEditing] = useState(null)

  const { data: registrations, setData, loading, error } = useAsyncResource(useCallback(() => fetchRegistrations(), []))
  const { data: messages } = useAsyncResource(useCallback(() => fetchMessages(), []))
  const { data: offers } = useAsyncResource(useCallback(() => fetchOffers(), []))

  const query = searchParams.get('q') ?? ''
  const status = searchParams.get('status') ?? 'All'
  const offer = searchParams.get('offer') ?? ''
  const date = searchParams.get('date') ?? ''
  const recording = searchParams.get('recording') ?? ''
  const attention = searchParams.get('attention') === '1'
  const today = todayIso()

  function updateParam(key, value) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    }, { replace: true })
  }

  function clearFilters() {
    setSearchParams({}, { replace: true })
  }

  async function decide(person, nextStatus) {
    setActionError('')
    setNotice('')
    setPendingId(person.id)
    try {
      const updated = await updateRegistration(person.id, { status: nextStatus })
      setData((current) => (current ?? []).map((row) => (row.id === updated.id ? { ...row, ...updated } : row)))
      const copy = nextStatus === 'offered'
        ? `Place offered to ${updated.name}. They must accept the private link before it is confirmed.`
        : nextStatus === 'rejected'
          ? `${updated.name} marked not selected. The rejection update was emailed.`
          : `${updated.name} marked ${nextStatus}.`
      setNotice(copy)
    } catch (decideError) {
      setActionError(decideError.message || 'Could not update the registration.')
    } finally {
      setPendingId(0)
    }
  }

  function handleUpdated(updated) {
    setData((current) => (current ?? []).map((row) => (row.id === updated.id ? { ...row, ...updated } : row)))
    setEditing((current) => (current ? { ...current, ...updated } : current))
  }

  function handleDeleted(person) {
    setData((current) => (current ?? []).filter((row) => row.id !== person.id))
    setEditing(null)
    setNotice(`${person.name}'s personal data and recording were deleted.`)
  }

  const rows = registrations ?? []
  const offerRows = offers ?? []
  const failedMessages = (messages ?? []).filter((message) => message.status === 'failed').length
  const attentionCount = rows.filter((person) => (
    person.status === 'new'
    || (person.followUpAt && isDateDue(person.followUpAt, today) && !['accepted', 'rejected', 'declined'].includes(person.status))
  )).length

  const filtered = rows.filter((person) => {
    const haystack = `${person.name} ${person.email} ${person.phone}`.toLowerCase()
    const matchesSearch = haystack.includes(query.toLowerCase())
    const matchesStatus = status === 'All' || person.status.toLowerCase() === status.toLowerCase()
    const matchesOffer = !offer || person.offerSlug === offer
    const matchesDate = !date || String(person.createdAt ?? '').slice(0, 10) === date
    const hasRecording = Boolean(person.hasRecording || person.voiceUrl)
    const matchesRecording = !recording || (recording === 'yes' ? hasRecording : !hasRecording)
    const needsAttention = person.status === 'new'
      || (person.followUpAt && isDateDue(person.followUpAt, today) && !['accepted', 'rejected', 'declined'].includes(person.status))
    return matchesSearch && matchesStatus && matchesOffer && matchesDate && matchesRecording && (!attention || needsAttention)
  })

  const acceptedCount = rows.filter((person) => person.status === 'accepted').length
  const newThisWeek = rows.filter((person) => isWithinLastDays(person.createdAt)).length
  const perDay = weekdayCounts(rows)
  const peakDay = Math.max(...perDay, 1)
  const filtersActive = Boolean(query || offer || date || recording || attention || status !== 'All')

  const columns = makeColumns({ onDecide: decide, onManage: setEditing, pendingId, today })

  return (
    <AdminLayout active={section}>
      <PageHeading
        eyebrow="Dashboard"
        title="Overview"
        subtitle={isBackendEnabled ? 'Live data from the API.' : 'Preview data — no backend is configured.'}
      >
        <div className="flex items-center gap-2">
          {failedMessages > 0 ? (
            <span aria-label={`${failedMessages} messages failed`} className="relative grid size-10 place-items-center rounded-lg border border-line bg-white text-muted">
              <svg aria-hidden="true" className="size-[18px] stroke-current stroke-[1.7] [stroke-linecap:round] [stroke-linejoin:round]" viewBox="0 0 24 24" fill="none"><path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9Zm3.5 8.5a2.5 2.5 0 0 0 5 0" /></svg>
              <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-coral-strong text-[9px] font-bold text-white">{failedMessages}</span>
            </span>
          ) : null}
          <input className={`${inputClass} w-56 max-[500px]:w-36`} type="search" aria-label="Search registrations" placeholder="Search name, email, phone…" value={query} onChange={(event) => updateParam('q', event.target.value)} />
          <button className={`${outlineButton} whitespace-nowrap`} type="button" onClick={() => exportCsv(filtered)}>Export CSV</button>
        </div>
      </PageHeading>

      {loading ? <p className="mt-4 text-xs font-bold text-muted" role="status">Loading registrations…</p> : null}
      {error ? <p className="mt-4 rounded-lg bg-coral p-3 text-xs font-semibold text-coral-ink" role="alert">{error}</p> : null}
      {notice ? <p className="mt-4 rounded-lg bg-soft p-3 text-xs font-semibold text-brand" role="status">{notice}</p> : null}
      {actionError ? <p className="mt-4 rounded-lg bg-coral p-3 text-xs font-semibold text-coral-ink" role="alert">{actionError}</p> : null}

      <section aria-label="Registration metrics" className="mt-5 grid grid-cols-4 gap-3 max-[750px]:grid-cols-2">
        <StatCard title="Total registrations" value={rows.length} hint="All registrations received" />
        <StatCard title="New this week" value={newThisWeek} hint="Last 7 days" />
        <StatCard title="Needs attention" value={attentionCount} hint="New or follow-up due" />
        <StatCard title="Confirmed places" value={acceptedCount} hint="Applicant accepted the offer" />
      </section>

      <section className="mt-5 grid grid-cols-2 gap-3 max-[650px]:grid-cols-1">
        <article className="rounded-xl border border-line bg-white p-5">
          <h2 className="text-sm font-bold">Registrations by day</h2>
          <div aria-label="Registrations by day of week" className="mt-6 flex h-40 items-end justify-around gap-3 px-2" role="img">
            {perDay.map((count, index) => (
              <div aria-hidden="true" className="flex h-full flex-1 flex-col items-center justify-end gap-2" key={CHART_DAYS[index]}>
                <span className={`w-full rounded-t ${count > 0 ? 'bg-brand' : 'bg-soft'}`} style={{ height: `${Math.round((count / peakDay) * 100)}%` }} />
                <span className="text-[9px] text-muted tabular-nums">{CHART_DAYS[index]}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="rounded-xl border border-line bg-white p-5">
          <h2 className="text-sm font-bold">By offer</h2>
          <div className="mt-6 grid gap-5">
            {offerRows.map((offerRow) => {
              const count = rows.filter((person) => person.offerId === offerRow.id).length
              return (
                <div key={offerRow.id}>
                  <div className="mb-1.5 flex justify-between text-[11px] tabular-nums"><span>{offerRow.title}</span><span className="font-bold">{count}</span></div>
                  <div aria-hidden="true" className="h-2 rounded-full bg-soft"><div className={`h-full rounded-full ${OFFER_BAR_STYLES[(offerRow.id - 1) % OFFER_BAR_STYLES.length]}`} style={{ width: `${rows.length ? (count / rows.length) * 100 : 0}%` }} /></div>
                </div>
              )
            })}
          </div>
        </article>
      </section>

      <section className="mt-6" id="registrations">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Registrations</h2>
            <p className="mt-0.5 text-[11px] text-muted">{filtered.length} shown · {rows.length} total</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((filter) => (
              <button
                aria-pressed={status === filter}
                className={`rounded-full px-3 py-1.5 text-[10px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none ${status === filter ? 'bg-brand text-white' : 'bg-white text-muted hover:bg-soft'}`}
                key={filter}
                onClick={() => updateParam('status', filter === 'All' ? '' : filter)}
                type="button"
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3 grid gap-2 rounded-xl border border-line bg-white p-3 min-[900px]:grid-cols-[minmax(180px,1fr)_repeat(2,minmax(135px,190px))_auto_auto]">
          <label className="sr-only" htmlFor="filter-offer">Filter by job</label>
          <select className={inputClass} id="filter-offer" value={offer} onChange={(event) => updateParam('offer', event.target.value)}>
            <option value="">All jobs</option>
            {offerRows.map((offerRow) => <option key={offerRow.id} value={offerRow.slug}>{offerRow.title}</option>)}
          </select>

          <label className="sr-only" htmlFor="filter-date">Filter by application date</label>
          <input className={inputClass} id="filter-date" type="date" value={date} onChange={(event) => updateParam('date', event.target.value)} />

          <label className="sr-only" htmlFor="filter-recording">Filter by recording</label>
          <select className={inputClass} id="filter-recording" value={recording} onChange={(event) => updateParam('recording', event.target.value)}>
            <option value="">Any recording</option>
            <option value="yes">Recording available</option>
            <option value="no">No recording</option>
          </select>

          <button
            aria-pressed={attention}
            className={`${outlineButton} whitespace-nowrap ${attention ? 'border-brand bg-brand text-white hover:bg-brand-dark hover:text-white' : ''}`}
            onClick={() => updateParam('attention', attention ? '' : '1')}
            type="button"
          >
            Needs attention ({attentionCount})
          </button>
          <button className={`${outlineButton} whitespace-nowrap`} disabled={!filtersActive} onClick={clearFilters} type="button">Clear filters</button>
        </div>

        <DataTable
          caption="Registrations"
          cellClass="px-3 py-3"
          columns={columns}
          emptyMessage={loading ? 'Loading…' : 'No registrations match your filters.'}
          getRowKey={(person) => person.id}
          minWidth="min-w-[1500px]"
          rows={filtered}
          textSize="text-[11px]"
        />
      </section>

      {editing ? (
        <RegistrationDialog
          key={editing.id}
          onClose={() => setEditing(null)}
          onDeleted={handleDeleted}
          onUpdated={handleUpdated}
          person={editing}
        />
      ) : null}
    </AdminLayout>
  )
}
