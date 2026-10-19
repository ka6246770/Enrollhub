import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminLayout, PageHeading } from '../../components/admin/AdminLayout.jsx'
import { StatusBadge } from '../../components/admin/StatusBadge.jsx'
import { useAsyncResource } from '../../hooks/useAsyncResource.js'
import { inputClass, outlineButton, solidButton } from '../../lib/ui.js'
import { fetchOffers, isBackendEnabled, updateOffer } from '../../services/api.js'

function Toggle({ checked, label, onChange, disabled }) {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${checked ? 'bg-brand' : 'bg-line'}`}
      disabled={disabled}
      onClick={onChange}
      role="switch"
      type="button"
    >
      <span className={`absolute size-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  )
}

export default function Offers() {
  const { data, setData, loading, error } = useAsyncResource(useCallback(() => fetchOffers(), []))
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const [savingId, setSavingId] = useState(0)

  const offers = data ?? []

  function updateLocal(id, key, value) {
    setData((current) => (current ?? []).map((offer) => (offer.id === id ? { ...offer, [key]: value } : offer)))
  }

  async function persist(id, patch) {
    setSavingId(id)
    setNotice('')
    setActionError('')
    try {
      const updated = await updateOffer(id, patch)
      setData((current) => (current ?? []).map((offer) => (offer.id === id ? { ...offer, ...updated } : offer)))
      setNotice(`Offer ${id} saved.`)
    } catch (saveError) {
      setActionError(saveError.message || 'Could not save the offer.')
    } finally {
      setSavingId(0)
    }
  }

  function saveChanges(offer) {
    const patch = {
      title: offer.title,
      price: offer.price,
      seatsTotal: Number(offer.seatsTotal),
      closesAt: offer.closesAt,
      status: offer.status,
    }
    for (const key of Object.keys(patch)) {
      if (patch[key] === '' || patch[key] === undefined || Number.isNaN(patch[key])) delete patch[key]
    }
    return persist(offer.id, patch)
  }

  return (
    <AdminLayout active="Offers">
      <PageHeading
        eyebrow="Dashboard"
        title="Offers"
        subtitle={isBackendEnabled ? 'Changes are saved to the database and used by the public pages.' : 'Preview data — changes are not saved.'}
      />

      {loading ? <p className="mt-4 text-xs font-bold text-muted" role="status">Loading offers…</p> : null}
      {error ? <p className="mt-4 rounded-lg bg-coral p-3 text-xs font-semibold text-coral-ink" role="alert">{error}</p> : null}
      {notice ? <p className="mt-4 rounded-lg bg-soft p-3 text-xs font-semibold text-brand" role="status">{notice}</p> : null}
      {actionError ? <p className="mt-4 rounded-lg bg-coral p-3 text-xs font-semibold text-coral-ink" role="alert">{actionError}</p> : null}

      <div className="mt-5 grid gap-4">
        {offers.map((offer) => {
          const soldOut = offer.status !== 'active'
          const saving = savingId === offer.id
          return (
            <article className="rounded-xl border border-line bg-white p-5" key={offer.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <h2 className="font-bold">Offer {offer.id}</h2>
                  <StatusBadge tone={soldOut ? 'danger' : 'neutral'}>{soldOut ? 'Sold out' : 'Active'}</StatusBadge>
                </div>
                <label className="flex items-center gap-2 text-xs text-muted">
                  Accepting registrations
                  <Toggle
                    checked={!soldOut}
                    disabled={saving}
                    label={`Accept registrations for offer ${offer.id}`}
                    onChange={() => persist(offer.id, { status: soldOut ? 'active' : 'soldout' })}
                  />
                </label>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-3 max-[700px]:grid-cols-2 max-[450px]:grid-cols-1">
                <label className="text-[10px] font-bold text-muted">Title<input className={`${inputClass} mt-1`} name={`title-${offer.id}`} autoComplete="off" value={offer.title} onChange={(event) => updateLocal(offer.id, 'title', event.target.value)} /></label>
                <label className="text-[10px] font-bold text-muted">Price<input className={`${inputClass} mt-1`} name={`price-${offer.id}`} autoComplete="off" value={offer.price} onChange={(event) => updateLocal(offer.id, 'price', event.target.value)} /></label>
                <label className="text-[10px] font-bold text-muted">Seat limit<input className={`${inputClass} mt-1`} name={`seats-${offer.id}`} autoComplete="off" type="number" inputMode="numeric" min={offer.seatsTaken} value={offer.seatsTotal} onChange={(event) => updateLocal(offer.id, 'seatsTotal', Number(event.target.value))} /></label>
                <label className="text-[10px] font-bold text-muted">Closes on<input className={`${inputClass} mt-1`} name={`closes-${offer.id}`} autoComplete="off" type="date" value={offer.closesAt ?? ''} onChange={(event) => updateLocal(offer.id, 'closesAt', event.target.value)} /></label>
              </div>
              <p className="mt-4 text-xs font-bold tabular-nums">Seats taken: {offer.seatsTaken} of {offer.seatsTotal}</p>
              <div className="mt-2 h-2.5 rounded-full bg-soft">
                <div className={`h-full rounded-full ${offer.seatsTaken >= offer.seatsTotal ? 'bg-coral-strong' : 'bg-brand'}`} style={{ width: `${offer.seatsTotal ? Math.min((offer.seatsTaken / offer.seatsTotal) * 100, 100) : 0}%` }} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {soldOut ? (
                  <>
                    <button className={solidButton} disabled={saving} onClick={() => persist(offer.id, { seatsTotal: offer.seatsTotal + 1, status: 'active' })} type="button">Raise seat limit</button>
                    <Link className={outlineButton} to={`/offers/${offer.slug}/waitlist`}>View waitlist ({offer.waitlistCount ?? 0})</Link>
                  </>
                ) : (
                  <>
                    <button className={solidButton} disabled={saving} onClick={() => saveChanges(offer)} type="button">{saving ? 'Saving…' : 'Save changes'}</button>
                    <Link className={outlineButton} to={`/offers/${offer.slug}`}>Edit form fields</Link>
                  </>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </AdminLayout>
  )
}
