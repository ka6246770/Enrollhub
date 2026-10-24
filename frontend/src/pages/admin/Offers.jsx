import { useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AdminLayout, PageHeading } from '../../components/admin/AdminLayout.jsx'
import { StatusBadge } from '../../components/admin/StatusBadge.jsx'
import { useAsyncResource } from '../../hooks/useAsyncResource.js'
import { formatDate } from '../../lib/format.js'
import { outlineButton, solidButton } from '../../lib/ui.js'
import { fetchAllOffers } from '../../services/api.js'

function statusCopy(status) {
  if (status === 'paused') return { label: 'Paused', tone: 'warning', note: 'Registration is paused on the public site.' }
  if (status === 'soldout') return { label: 'Sold out', tone: 'danger', note: 'All places are taken; the waitlist is open.' }
  if (status === 'closed') return { label: 'Archived', tone: 'warning', note: 'Hidden from the public site.' }
  return { label: 'Active', tone: 'neutral', note: 'Registration is open on the public site.' }
}

function placesBarColor(offer) {
  if (offer.status === 'closed') return 'bg-ink/30'
  if (offer.status === 'paused') return 'bg-sand-strong'
  if (offer.status === 'soldout' || offer.seatsTaken >= offer.seatsTotal) return 'bg-coral-strong'
  return 'bg-brand'
}

function OfferSummary({ offer }) {
  const status = statusCopy(offer.status)
  const waitlistCount = offer.waitlistCount ?? 0
  const waitlistPath = `/admin/waitlist?offer=${encodeURIComponent(offer.slug)}`

  return (
    <article className="motion-card rounded-xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="font-bold">{offer.title}</h2>
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          <span className="text-[10px] text-muted">{offer.slug}</span>
        </div>
        <p className="text-[10px] text-muted">{status.note}</p>
      </div>

      <dl className="mt-4 grid gap-3 text-xs min-[640px]:grid-cols-3 min-[1000px]:grid-cols-5">
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wide text-muted">City</dt>
          <dd className="mt-0.5 font-semibold">{offer.location || '—'}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wide text-muted">Pay / month</dt>
          <dd className="mt-0.5 font-semibold">{offer.price}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wide text-muted">Shift</dt>
          <dd className="mt-0.5 font-semibold">{offer.duration}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wide text-muted">Closes</dt>
          <dd className="mt-0.5 font-semibold">
            {offer.closesAt ? <time dateTime={offer.closesAt}>{formatDate(offer.closesAt)}</time> : 'Open'}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wide text-muted">Waitlist</dt>
          <dd className="mt-0.5 font-semibold tabular-nums">{waitlistCount}</dd>
        </div>
      </dl>

      <p className="mt-4 text-xs font-bold tabular-nums">Places taken: {offer.seatsTaken} of {offer.seatsTotal}</p>
      <div className="mt-2 h-2.5 rounded-full bg-soft">
        <div
          className={`h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${placesBarColor(offer)}`}
          style={{ width: `${offer.seatsTotal ? Math.min((offer.seatsTaken / offer.seatsTotal) * 100, 100) : 0}%` }}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link className={solidButton} to={`/admin/offers/${offer.id}/edit`}>Edit offer</Link>
        {offer.status !== 'closed' ? (
          <Link className={outlineButton} to={`/offers/${offer.slug}`}>View public page</Link>
        ) : null}
        {waitlistCount > 0 ? (
          <Link className={outlineButton} to={waitlistPath}>View waitlist ({waitlistCount})</Link>
        ) : null}
      </div>
    </article>
  )
}

export default function Offers() {
  const location = useLocation()
  const notice = location.state?.notice ?? ''
  const { data, loading, error } = useAsyncResource(useCallback(() => fetchAllOffers(), []))
  const offers = data ?? []

  return (
    <AdminLayout active="Offers">
      <PageHeading
        eyebrow="Dashboard"
        subtitle="Open an offer to change its details, status or removal. The public job page stays read-only."
        title="Offers"
      >
        <Link className={solidButton} to="/admin/offers/new">New offer</Link>
      </PageHeading>

      {loading ? <p className="mt-4 text-xs font-bold text-muted" role="status">Loading offers…</p> : null}
      {error ? <p className="mt-4 rounded-lg bg-coral p-3 text-xs font-semibold text-coral-ink" role="alert">{error}</p> : null}
      {notice ? <p className="motion-notice mt-4 rounded-lg bg-soft p-3 text-xs font-semibold text-brand-text" role="status">{notice}</p> : null}

      <div className="motion-stagger mt-5 grid gap-4">
        {!loading && offers.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-surface p-5 text-xs text-muted">
            No offers yet. Use New offer to create the first one.
          </p>
        ) : null}

        {offers.map((offer) => <OfferSummary key={offer.id} offer={offer} />)}
      </div>
    </AdminLayout>
  )
}
