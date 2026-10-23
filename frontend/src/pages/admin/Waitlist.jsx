import { useCallback, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdminLayout, PageHeading, StatCard } from '../../components/admin/AdminLayout.jsx'
import DataTable from '../../components/admin/DataTable.jsx'
import { StatusBadge } from '../../components/admin/StatusBadge.jsx'
import WaitlistDialog from '../../components/admin/WaitlistDialog.jsx'
import { SITE_URL } from '../../config/site.js'
import { useAsyncResource } from '../../hooks/useAsyncResource.js'
import { copyText } from '../../lib/clipboard.js'
import { formatDate, isDateDue, todayIso } from '../../lib/format.js'
import { inputClass, outlineButton } from '../../lib/ui.js'
import { fetchOffers, fetchWaitlist, offerWaitlist, updateWaitlist } from '../../services/api.js'

const STATUS_FILTERS = ['All', 'Waiting', 'Contacted', 'Offered', 'Accepted', 'Declined']

const STATUS_TONES = {
  waiting: 'neutral',
  contacted: 'warning',
  offered: 'plum',
  accepted: 'brand',
  declined: 'danger',
}

function dateOnly(value) {
  const date = String(value ?? '').slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? formatDate(date) : '—'
}

function whatsappHref(entry, link) {
  const digits = String(entry.phone ?? '').replace(/[^\d]/g, '')
  if (!digits || !link) return ''
  const message = `Hello ${entry.name}, a place has opened for ${entry.offerTitle}. Open this private link to accept or decline: ${link}`
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

function OfferResults({ results, rows, onDismiss }) {
  if (!results.length) return null
  return (
    <section aria-label="Private links created" className="mt-4 rounded-xl border border-brand/30 bg-mint/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-mint-ink">Offer links ready</h2>
          <p className="mt-1 text-xs leading-relaxed text-mint-ink/80">
            Applications are not confirmed until the applicant accepts. Send the link by email or
            WhatsApp; entries without an email need a manual message.
          </p>
        </div>
        <button className={outlineButton} onClick={onDismiss} type="button">Dismiss</button>
      </div>
      <ul className="mt-4 grid gap-2">
        {results.map((result) => {
          if (result.skipped) {
            return <li className="rounded-lg bg-surface px-3 py-2 text-xs text-muted" key={result.id}>{result.name}: {result.reason}</li>
          }
          const entry = rows.find((row) => row.id === result.id)
          const whatsapp = whatsappHref({ ...entry, name: result.name }, result.statusUrl)
          return (
            <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2" key={result.id}>
              <div className="min-w-0">
                <p className="text-xs font-bold">{result.name}</p>
                <p className="truncate font-mono text-[10px] text-muted">{result.statusUrl}</p>
                <p className="text-[10px] font-semibold text-muted">
                  {entry?.email ? 'Email attempted' : 'No email — send by WhatsApp'}
                </p>
              </div>
              <div className="flex gap-1.5">
                <button className={outlineButton} onClick={() => copyText(result.statusUrl)} type="button">Copy link</button>
                {whatsapp ? <a className={outlineButton} href={whatsapp} rel="noreferrer" target="_blank">WhatsApp</a> : null}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default function Waitlist() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selected, setSelected] = useState([])
  const [copiedId, setCopiedId] = useState(0)
  const [placeOpenedOn, setPlaceOpenedOn] = useState(todayIso())
  const [offerResults, setOfferResults] = useState([])
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)

  const { data: entries, setData, loading, error: loadError, reload } = useAsyncResource(useCallback(() => fetchWaitlist(), []))
  const { data: offers } = useAsyncResource(useCallback(() => fetchOffers(), []))

  const query = searchParams.get('q') ?? ''
  const status = searchParams.get('status') ?? 'All'
  const offer = searchParams.get('offer') ?? ''
  const today = todayIso()

  function updateParam(key, value) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    }, { replace: true })
  }

  const rows = entries ?? []
  const offerRows = offers ?? []
  const filtered = rows.filter((entry) => {
    const haystack = `${entry.name} ${entry.phone} ${entry.email ?? ''}`.toLowerCase()
    const matchesSearch = haystack.includes(query.toLowerCase())
    const matchesStatus = status === 'All' || entry.status === status.toLowerCase()
    const matchesOffer = !offer || entry.offerSlug === offer
    return matchesSearch && matchesStatus && matchesOffer
  })

  const visibleIds = filtered.map((entry) => entry.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id))
  const selectedRows = rows.filter((entry) => selected.includes(entry.id))
  const selectedContactable = selectedRows.filter((entry) => ['waiting', 'contacted'].includes(entry.status))
  const selectedOfferable = selectedRows.filter((entry) => !['accepted', 'declined'].includes(entry.status))
  const waitingCount = rows.filter((entry) => entry.status === 'waiting').length
  const offeredCount = rows.filter((entry) => entry.status === 'offered').length
  const acceptedCount = rows.filter((entry) => entry.status === 'accepted').length
  const attentionCount = rows.filter((entry) => (
    ['waiting', 'contacted', 'offered'].includes(entry.status) && entry.followUpAt && isDateDue(entry.followUpAt, today)
  )).length
  const filtersActive = Boolean(query || offer || status !== 'All')

  function toggleSelected(id) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  function toggleAllVisible() {
    if (allVisibleSelected) {
      setSelected((current) => current.filter((id) => !visibleIds.includes(id)))
    } else {
      setSelected((current) => [...new Set([...current, ...visibleIds])])
    }
  }

  async function copyLink(entry) {
    if (!entry.statusToken) return
    const copied = await copyText(`${SITE_URL}/status/${entry.statusToken}`)
    setCopiedId(copied ? entry.id : 0)
  }

  async function markContacted() {
    if (!selectedContactable.length) return
    setPending(true)
    setError('')
    setNotice('')
    try {
      await Promise.all(selectedContactable.map((entry) => updateWaitlist(entry.id, { status: 'contacted' })))
      setData((current) => (current ?? []).map((entry) => (
        selectedContactable.some((item) => item.id === entry.id)
          ? { ...entry, status: 'contacted', contactedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
          : entry
      )))
      setNotice(`${selectedContactable.length} ${selectedContactable.length === 1 ? 'entry' : 'entries'} marked contacted.`)
      setSelected([])
    } catch (contactError) {
      setError(contactError.message || 'Could not record the contact.')
    } finally {
      setPending(false)
    }
  }

  async function offerSelected() {
    if (!selectedOfferable.length) return
    setPending(true)
    setError('')
    setNotice('')
    setOfferResults([])
    try {
      const response = await offerWaitlist(selectedOfferable.map((entry) => entry.id), placeOpenedOn)
      const results = response?.results ?? []
      setOfferResults(results)
      const offered = results.filter((result) => !result.skipped)
      setData((current) => (current ?? []).map((entry) => {
        const result = offered.find((item) => item.id === entry.id)
        if (!result) return entry
        return {
          ...entry,
          status: 'offered',
          statusToken: result.statusToken,
          offeredAt: new Date().toISOString(),
          respondedAt: null,
          placeOpenedOn,
          updatedAt: new Date().toISOString(),
        }
      }))
      const withoutEmail = offered.filter((result) => {
        const entry = rows.find((row) => row.id === result.id)
        return !entry?.email
      }).length
      setNotice(
        `${offered.length} ${offered.length === 1 ? 'place offer' : 'place offers'} recorded.`
        + (withoutEmail ? ` ${withoutEmail} ${withoutEmail === 1 ? 'person has' : 'people have'} no email — copy the private link and send it by WhatsApp.` : ''),
      )
      setSelected([])
    } catch (offerError) {
      setError(offerError.message || 'Could not offer the selected places.')
    } finally {
      setPending(false)
    }
  }

  function handleUpdated(updated) {
    setData((current) => (current ?? []).map((entry) => (entry.id === updated.id ? { ...entry, ...updated } : entry)))
    setEditing((current) => (current ? { ...current, ...updated } : current))
    if (updated.status === 'offered' && updated.statusToken) {
      setOfferResults((current) => {
        if (current.some((result) => result.id === updated.id)) return current
        return [...current, {
          id: updated.id,
          name: updated.name,
          email: updated.email,
          statusUrl: `${SITE_URL}/status/${updated.statusToken}`,
          statusPath: `/status/${updated.statusToken}`,
          emailAttempted: Boolean(updated.email),
          skipped: false,
        }]
      })
    }
  }

  function handleDeleted(entry) {
    setData((current) => (current ?? []).filter((row) => row.id !== entry.id))
    setEditing(null)
    setSelected((current) => current.filter((id) => id !== entry.id))
    setNotice(`${entry.name} was removed from the waitlist.`)
  }

  const columns = [
    {
      key: 'select',
      header: (
        <input
          aria-label="Select all visible waitlist entries"
          checked={allVisibleSelected}
          onChange={toggleAllVisible}
          type="checkbox"
        />
      ),
      cell: (entry) => (
        <input
          aria-label={`Select ${entry.name}`}
          checked={selected.includes(entry.id)}
          onChange={() => toggleSelected(entry.id)}
          type="checkbox"
        />
      ),
    },
    { key: 'name', header: 'Name', rowHeader: true, className: 'whitespace-nowrap text-left font-bold', cell: (entry) => entry.name },
    {
      key: 'contact',
      header: 'Contact',
      cell: (entry) => (
        <span className="grid gap-1">
          <span className="whitespace-nowrap">{entry.phone}</span>
          <span className="text-[10px] text-muted">{entry.email || 'No email'}</span>
        </span>
      ),
    },
    { key: 'offer', header: 'Job', cell: (entry) => <span className="whitespace-nowrap">{entry.offerTitle}</span> },
    { key: 'created', header: 'Signed up', className: 'whitespace-nowrap', cell: (entry) => dateOnly(entry.createdAt) },
    {
      key: 'status',
      header: 'Status',
      cell: (entry) => (
        <StatusBadge className="capitalize" tone={STATUS_TONES[entry.status] ?? 'neutral'}>{entry.status}</StatusBadge>
      ),
    },
    {
      key: 'place',
      header: 'Place opened',
      className: 'whitespace-nowrap',
      cell: (entry) => entry.placeOpenedOn ? formatDate(entry.placeOpenedOn) : '—',
    },
    {
      key: 'followUp',
      header: 'Follow-up',
      className: 'whitespace-nowrap',
      cell: (entry) => {
        if (!entry.followUpAt) return <span className="text-muted">—</span>
        const due = isDateDue(entry.followUpAt, today)
        return <span className={due ? 'font-bold text-coral-ink' : ''}>{formatDate(entry.followUpAt)}{due ? ' · due' : ''}</span>
      },
    },
    {
      key: 'action',
      header: 'Action',
      className: 'whitespace-nowrap',
      cell: (entry) => {
        const link = entry.statusToken ? `${SITE_URL}/status/${entry.statusToken}` : ''
        const whatsapp = whatsappHref(entry, link)
        return (
          <span className="flex flex-wrap gap-1.5">
            <button className={`${outlineButton} px-2.5 py-1 text-[10px]`} onClick={() => setEditing(entry)} type="button">Manage</button>
            {entry.statusToken ? (
              <button className={`${outlineButton} px-2.5 py-1 text-[10px]`} onClick={() => copyLink(entry)} type="button">
                {copiedId === entry.id ? 'Copied' : 'Copy link'}
              </button>
            ) : null}
            {whatsapp ? <a className={`${outlineButton} px-2.5 py-1 text-[10px]`} href={whatsapp} rel="noreferrer" target="_blank">WhatsApp</a> : null}
          </span>
        )
      },
    },
  ]

  return (
    <AdminLayout active="Waitlist">
      <PageHeading
        eyebrow="Follow-up"
        title="Waitlist"
        subtitle="Offer places, record contact, and keep the private acceptance link with the applicant."
      >
        <div className="flex flex-wrap items-center gap-2">
          <button className={outlineButton} onClick={reload} type="button">{loading ? 'Refreshing…' : 'Refresh'}</button>
        </div>
      </PageHeading>

      {loadError ? <p className="mt-4 rounded-lg bg-coral p-3 text-xs font-semibold text-coral-ink" role="alert">{loadError}</p> : null}
      {notice ? <p className="mt-4 rounded-lg bg-soft p-3 text-xs font-semibold text-brand-text" role="status">{notice}</p> : null}
      {error ? <p className="mt-4 rounded-lg bg-coral p-3 text-xs font-semibold text-coral-ink" role="alert">{error}</p> : null}

      <section aria-label="Waitlist metrics" className="mt-5 grid grid-cols-4 gap-3 max-[750px]:grid-cols-2">
        <StatCard title="Waiting" value={waitingCount} hint="Not contacted yet" />
        <StatCard title="Offers open" value={offeredCount} hint="Awaiting applicant acceptance" />
        <StatCard title="Confirmed" value={acceptedCount} hint="Applicant accepted" />
        <StatCard title="Follow-up due" value={attentionCount} hint="Date reached" />
      </section>

      <section className="mt-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Waitlist entries</h2>
            <p className="mt-0.5 text-[11px] text-muted">{filtered.length} shown · {rows.length} total</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((filter) => (
              <button
                aria-pressed={status === filter}
                className={`rounded-full px-3 py-1.5 text-[10px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none ${status === filter ? 'bg-brand text-white' : 'bg-surface text-muted hover:bg-soft'}`}
                key={filter}
                onClick={() => updateParam('status', filter === 'All' ? '' : filter)}
                type="button"
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3 grid gap-2 rounded-xl border border-line bg-surface p-3 min-[850px]:grid-cols-[minmax(180px,1fr)_minmax(160px,220px)_auto]">
          <input
            aria-label="Search waitlist by name, phone, or email"
            className={inputClass}
            placeholder="Search name, phone, or email…"
            type="search"
            value={query}
            onChange={(event) => updateParam('q', event.target.value)}
          />
          <select aria-label="Filter waitlist by job" className={inputClass} value={offer} onChange={(event) => updateParam('offer', event.target.value)}>
            <option value="">All jobs</option>
            {offerRows.map((offerRow) => <option key={offerRow.id} value={offerRow.slug}>{offerRow.title}</option>)}
          </select>
          <button className={outlineButton} disabled={!filtersActive} onClick={() => setSearchParams({}, { replace: true })} type="button">Clear filters</button>
        </div>

        <div className="mb-3 flex flex-wrap items-end gap-2 rounded-xl border border-line bg-surface p-3">
          <p className="mr-auto text-xs font-semibold text-muted">
            {selected.length ? `${selected.length} selected · ${selectedOfferable.length} can be offered` : 'Select contacts above, then offer a place.'}
          </p>
          <label className="text-[11px] font-semibold text-muted">
            Place opened
            <input className={`${inputClass} mt-1`} type="date" value={placeOpenedOn} onChange={(event) => setPlaceOpenedOn(event.target.value)} />
          </label>
          <button className={outlineButton} disabled={pending || !selectedContactable.length} onClick={markContacted} type="button">
            Mark contacted
          </button>
          <button
            className="inline-flex min-h-9 items-center justify-center rounded-[4px] border border-brand bg-brand px-3 text-xs font-bold text-white transition-colors hover:border-brand-dark hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"
            disabled={pending || !selectedOfferable.length}
            onClick={offerSelected}
            type="button"
          >
            {pending ? 'Working…' : `Offer selected (${selectedOfferable.length})`}
          </button>
        </div>

        <OfferResults results={offerResults} rows={rows} onDismiss={() => setOfferResults([])} />

        <DataTable
          caption="Waitlist entries"
          cellClass="px-3 py-3"
          columns={columns}
          emptyMessage={loading ? 'Loading…' : 'No waitlist entries match your filters.'}
          getRowKey={(entry) => entry.id}
          minWidth="min-w-[1250px]"
          rows={filtered}
          textSize="text-[11px]"
        />

        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          A place is confirmed only when the applicant accepts the private link. Marking someone as
          contacted or offered is an internal record, not a confirmation.
        </p>
      </section>

      {editing ? (
        <WaitlistDialog
          entry={editing}
          key={editing.id}
          onClose={() => setEditing(null)}
          onDeleted={handleDeleted}
          onUpdated={handleUpdated}
        />
      ) : null}
    </AdminLayout>
  )
}
