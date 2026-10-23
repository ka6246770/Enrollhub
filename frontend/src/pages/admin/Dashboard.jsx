import { useCallback, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AdminLayout, PageHeading } from '../../components/admin/AdminLayout.jsx'
import { DashboardFilters } from '../../components/admin/DashboardFilters.jsx'
import { ActivityPanel, AttentionPanel, OfferPanel, PipelinePanel, StatGrid } from '../../components/admin/DashboardMetrics.jsx'
import RegistrationsTable from '../../components/admin/RegistrationsTable.jsx'
import RegistrationDialog from '../../components/admin/RegistrationDialog.jsx'
import { useAsyncResource } from '../../hooks/useAsyncResource.js'
import { dateOnly, lastSevenDays, needsAttention, statusCounts } from '../../lib/dashboard.js'
import { formatDate, isWithinLastDays, todayIso } from '../../lib/format.js'
import { inputClass, outlineButton } from '../../lib/ui.js'
import {
  fetchAllOffers,
  fetchMessages,
  fetchRegistrations,
  updateRegistration,
} from '../../services/api.js'

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

export default function Dashboard({ section = 'Overview' }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const [pendingId, setPendingId] = useState(0)
  const [editing, setEditing] = useState(null)

  const { data: registrations, setData, loading, error } = useAsyncResource(useCallback(() => fetchRegistrations(), []))
  const { data: messages } = useAsyncResource(useCallback(() => fetchMessages(), []))
  const { data: offers } = useAsyncResource(useCallback(() => fetchAllOffers(), []))

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

  function showAttention() {
    updateParam('attention', '1')
    document.getElementById('registrations')?.scrollIntoView({ block: 'start' })
  }

  const rows = registrations ?? []
  const offerRows = offers ?? []
  const failedMessages = (messages ?? []).filter((message) => message.status === 'failed').length
  const attentionRows = rows.filter((person) => needsAttention(person, today))

  const filtered = rows.filter((person) => {
    const haystack = `${person.name} ${person.email} ${person.phone} ${person.residence ?? ''}`.toLowerCase()
    const matchesSearch = haystack.includes(query.toLowerCase())
    const matchesStatus = status === 'All' || person.status.toLowerCase() === status.toLowerCase()
    const matchesOffer = !offer || person.offerSlug === offer
    const matchesDate = !date || String(person.createdAt ?? '').slice(0, 10) === date
    const hasRecording = Boolean(person.hasRecording || person.voiceUrl)
    const matchesRecording = !recording || (recording === 'yes' ? hasRecording : !hasRecording)
    return matchesSearch
      && matchesStatus
      && matchesOffer
      && matchesDate
      && matchesRecording
      && (!attention || needsAttention(person, today))
  })

  const newThisWeek = rows.filter((person) => isWithinLastDays(person.createdAt)).length
  const acceptedCount = rows.filter((person) => person.status === 'accepted').length
  const activeCount = [query, offer, date, recording, attention, status !== 'All'].filter(Boolean).length
  const newestAttention = [...attentionRows]
    .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
    .slice(0, 4)

  return (
    <AdminLayout active={section}>
      <PageHeading
        eyebrow="Dashboard"
        title="Overview"
        subtitle={`${formatDate(today)} · Live data from the API.`}
      >
        <div className="flex flex-wrap items-center justify-end gap-2 max-[560px]:w-full">
          {failedMessages > 0 ? (
            <Link
              aria-label={`${failedMessages} messages failed — open the message log`}
              className="relative grid size-10 place-items-center rounded-lg border border-line bg-surface text-muted transition-colors hover:border-coral-strong hover:text-coral-ink"
              title={`${failedMessages} messages failed`}
              to="/admin/messages"
            >
              <svg aria-hidden="true" className="size-[18px] stroke-current stroke-[1.7] [stroke-linecap:round] [stroke-linejoin:round]" viewBox="0 0 24 24" fill="none"><path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9Zm3.5 8.5a2.5 2.5 0 0 0 5 0" /></svg>
              <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-danger text-[9px] font-bold text-danger-ink">{failedMessages}</span>
            </Link>
          ) : null}
          <div className="w-56 max-[560px]:w-full max-[560px]:flex-1">
            <input
              aria-label="Search registrations"
              className={inputClass}
              onChange={(event) => updateParam('q', event.target.value)}
              placeholder="Search name, email, phone…"
              type="search"
              value={query}
            />
          </div>
          <button className={`${outlineButton} whitespace-nowrap`} onClick={() => exportCsv(filtered)} type="button">Export CSV</button>
        </div>
      </PageHeading>

      {loading ? <p className="mt-4 text-xs font-bold text-muted" role="status">Loading registrations…</p> : null}
      {error ? <p className="mt-4 rounded-lg border border-coral-strong/20 bg-coral p-3 text-xs font-semibold text-coral-ink" role="alert">{error}</p> : null}
      {notice ? <p className="motion-notice mt-4 rounded-lg border border-brand/15 bg-soft p-3 text-xs font-semibold text-brand-text" role="status">{notice}</p> : null}
      {actionError ? <p className="mt-4 rounded-lg border border-coral-strong/20 bg-coral p-3 text-xs font-semibold text-coral-ink" role="alert">{actionError}</p> : null}

      <StatGrid values={{ total: rows.length, new: newThisWeek, attention: attentionRows.length, accepted: acceptedCount }} />

      <section className="mt-3 grid grid-cols-[1.55fr_1fr] gap-3 max-[900px]:grid-cols-1">
        <ActivityPanel days={lastSevenDays(rows)} />
        <PipelinePanel counts={statusCounts(rows)} total={rows.length} />
      </section>

      <section className="mt-3 grid grid-cols-2 gap-3 max-[750px]:grid-cols-1">
        <OfferPanel offers={offerRows} rows={rows} />
        <AttentionPanel offers={offerRows} onManage={setEditing} onViewAll={showAttention} people={newestAttention} />
      </section>

      <div className="mt-6">
        <DashboardFilters
          activeCount={activeCount}
          attention={attention}
          attentionCount={attentionRows.length}
          date={date}
          offer={offer}
          offers={offerRows}
          onChange={updateParam}
          onClear={clearFilters}
          recording={recording}
          shown={filtered.length}
          status={status}
          total={rows.length}
        />
      </div>

      <div className="mt-3">
        <RegistrationsTable
          loading={loading}
          onDecide={decide}
          onManage={setEditing}
          pendingId={pendingId}
          rows={filtered}
          today={today}
        />
      </div>

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
