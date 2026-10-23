import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminLayout, PageHeading } from '../../components/admin/AdminLayout.jsx'
import { StatusBadge } from '../../components/admin/StatusBadge.jsx'
import { useAsyncResource } from '../../hooks/useAsyncResource.js'
import { inputClass, outlineButton, solidButton } from '../../lib/ui.js'
import { createOffer, deleteOffer, fetchOffers, updateOffer } from '../../services/api.js'

const dangerButton =
  'inline-flex min-h-9 items-center justify-center rounded-[4px] border border-danger bg-danger px-3 text-xs font-bold text-danger-ink no-underline transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-strong disabled:cursor-not-allowed disabled:opacity-50'

function statusCopy(status) {
  if (status === 'paused') return { label: 'Paused', tone: 'warning' }
  if (status === 'soldout') return { label: 'Sold out', tone: 'danger' }
  if (status === 'closed') return { label: 'Archived', tone: 'warning' }
  return { label: 'Active', tone: 'neutral' }
}

// The editable basics are sent together with every status change, so an owner
// who edits a title and then presses Hold does not lose the unsaved edit.
function offerPatch(offer, extra = {}) {
  const patch = {
    title: offer.title,
    location: offer.location,
    price: offer.price,
    seatsTotal: Number(offer.seatsTotal),
    closesAt: offer.closesAt,
    status: offer.status,
    ...extra,
  }

  for (const key of Object.keys(patch)) {
    if (patch[key] === '' || patch[key] === undefined || patch[key] === null || Number.isNaN(patch[key])) {
      delete patch[key]
    }
  }
  return patch
}

export default function Offers() {
  const { data, setData, loading, error } = useAsyncResource(useCallback(() => fetchOffers(), []))
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const [savingId, setSavingId] = useState(0)
  const [showAdd, setShowAdd] = useState(false)
  const [creating, setCreating] = useState(false)
  const [removing, setRemoving] = useState(null)
  const [removeBusy, setRemoveBusy] = useState(false)
  const [removeError, setRemoveError] = useState('')

  const addButtonRef = useRef(null)
  const titleRef = useRef(null)
  const removeDialogRef = useRef(null)
  const cancelRemoveRef = useRef(null)

  const offers = data ?? []

  useEffect(() => {
    if (showAdd) titleRef.current?.focus()
  }, [showAdd])

  useEffect(() => {
    const dialog = removeDialogRef.current
    if (!dialog) return
    if (removing && !dialog.open) {
      dialog.showModal()
      cancelRemoveRef.current?.focus()
    } else if (!removing && dialog.open) {
      dialog.close()
    }
  }, [removing])

  function updateLocal(id, key, value) {
    setData((current) => (current ?? []).map((offer) => (offer.id === id ? { ...offer, [key]: value } : offer)))
  }

  async function persist(id, patch, successMessage) {
    setSavingId(id)
    setNotice('')
    setActionError('')
    try {
      const updated = await updateOffer(id, patch)
      setData((current) => (current ?? []).map((offer) => (offer.id === id ? { ...offer, ...updated } : offer)))
      setNotice(successMessage ?? `Offer ${id} saved.`)
    } catch (saveError) {
      setActionError(saveError.message || 'Could not save the offer.')
    } finally {
      setSavingId(0)
    }
  }

  function saveChanges(offer) {
    return persist(offer.id, offerPatch(offer), `Offer “${offer.title}” saved.`)
  }

  function holdOffer(offer) {
    return persist(offer.id, offerPatch(offer, { status: 'paused' }), `Offer “${offer.title}” is on hold.`)
  }

  function resumeOffer(offer) {
    const nextStatus = offer.seatsTaken >= offer.seatsTotal ? 'soldout' : 'active'
    return persist(offer.id, offerPatch(offer, { status: nextStatus }), `Offer “${offer.title}” is accepting applications again.`)
  }

  function raiseSeatLimit(offer) {
    return persist(
      offer.id,
      offerPatch(offer, { seatsTotal: offer.seatsTotal + 1, status: 'active' }),
      `Seat limit raised. Offer “${offer.title}” is accepting applications again.`,
    )
  }

  function closeAdd() {
    setShowAdd(false)
    requestAnimationFrame(() => addButtonRef.current?.focus())
  }

  function toggleAdd() {
    if (showAdd) {
      closeAdd()
      return
    }
    setNotice('')
    setActionError('')
    setShowAdd(true)
  }

  async function handleCreate(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const closesAt = String(formData.get('closesAt') ?? '')
    const payload = {
      title: String(formData.get('title') ?? '').trim(),
      location: String(formData.get('location') ?? '').trim(),
      price: String(formData.get('price') ?? '').trim(),
      duration: String(formData.get('duration') ?? '').trim(),
      seatsTotal: Number(formData.get('seatsTotal')),
      shortDescription: String(formData.get('shortDescription') ?? '').trim(),
      description: String(formData.get('description') ?? '').trim(),
      included: String(formData.get('included') ?? '')
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
      ...(closesAt ? { closesAt } : {}),
    }

    setCreating(true)
    setNotice('')
    setActionError('')
    try {
      const created = await createOffer(payload)
      setData((current) => [...(current ?? []), created])
      setNotice(`Offer “${created.title}” added. It is live on the public site.`)
      closeAdd()
    } catch (createError) {
      setActionError(createError.message || 'Could not add the offer.')
    } finally {
      setCreating(false)
    }
  }

  function askRemove(offer) {
    setRemoveError('')
    setRemoving(offer)
  }

  function cancelRemove() {
    if (!removeBusy) setRemoving(null)
  }

  async function handleRemove() {
    if (!removing || removeBusy) return
    const offer = removing
    setRemoveBusy(true)
    setRemoveError('')
    setNotice('')
    setActionError('')

    try {
      const result = await deleteOffer(offer.id)
      // Close first so the browser's own focus return targets the Remove
      // button before that card is filtered out of the list.
      removeDialogRef.current?.close()
      setData((current) => (current ?? []).filter((item) => item.id !== offer.id))
      setNotice(
        result.archived
          ? `Offer “${offer.title}” was archived and hidden because it has applicant data. No registrations or recordings were deleted.`
          : `Offer “${offer.title}” was deleted.`,
      )
      setRemoving(null)
      requestAnimationFrame(() => addButtonRef.current?.focus())
    } catch (removeFailure) {
      setRemoveError(removeFailure.message || 'Could not remove the offer.')
    } finally {
      setRemoveBusy(false)
    }
  }

  return (
    <AdminLayout active="Offers">
      <PageHeading
        eyebrow="Dashboard"
        title="Offers"
        subtitle="Changes are saved to the database and used by the public pages."
      >
        <button
          aria-controls="add-offer-form"
          aria-expanded={showAdd}
          className={solidButton}
          onClick={toggleAdd}
          ref={addButtonRef}
          type="button"
        >
          {showAdd ? 'Close add form' : 'Add offer'}
        </button>
      </PageHeading>

      {loading ? <p className="mt-4 text-xs font-bold text-muted" role="status">Loading offers…</p> : null}
      {error ? <p className="mt-4 rounded-lg bg-coral p-3 text-xs font-semibold text-coral-ink" role="alert">{error}</p> : null}
      {notice ? <p className="motion-notice mt-4 rounded-lg bg-soft p-3 text-xs font-semibold text-brand-text" role="status">{notice}</p> : null}
      {actionError ? <p className="motion-notice mt-4 rounded-lg bg-coral p-3 text-xs font-semibold text-coral-ink" role="alert">{actionError}</p> : null}

      {showAdd ? (
        <section
          aria-labelledby="add-offer-heading"
          className="motion-panel mt-5 rounded-xl border border-line bg-surface p-5"
          id="add-offer-form"
        >
          <h2 className="text-sm font-bold" id="add-offer-heading">New offer</h2>
          <p className="mt-1 text-[10px] text-muted">
            The offer is published immediately. Add it now, then use Hold offer if you are not ready for applications.
          </p>

          <form className="mt-4" onSubmit={handleCreate}>
            <div className="grid grid-cols-3 gap-3 max-[850px]:grid-cols-2 max-[540px]:grid-cols-1">
              <label className="text-[10px] font-bold text-muted">
                Title
                <input
                  autoComplete="off"
                  className={`${inputClass} mt-1`}
                  maxLength={200}
                  name="title"
                  placeholder="e.g. Packaging & labeling"
                  ref={titleRef}
                  required
                  type="text"
                />
              </label>
              <label className="text-[10px] font-bold text-muted">
                City
                <input
                  autoComplete="off"
                  className={`${inputClass} mt-1`}
                  maxLength={80}
                  name="location"
                  placeholder="e.g. Sadat City"
                  required
                  type="text"
                />
              </label>
              <label className="text-[10px] font-bold text-muted">
                Pay / month
                <input
                  autoComplete="off"
                  className={`${inputClass} mt-1`}
                  maxLength={60}
                  name="price"
                  placeholder="e.g. 9,000 EGP"
                  required
                  type="text"
                />
              </label>
              <label className="text-[10px] font-bold text-muted">
                Shift
                <input
                  autoComplete="off"
                  className={`${inputClass} mt-1`}
                  maxLength={60}
                  name="duration"
                  placeholder="e.g. 12-hour shifts"
                  required
                  type="text"
                />
              </label>
              <label className="text-[10px] font-bold text-muted">
                Place limit
                <input
                  className={`${inputClass} mt-1`}
                  inputMode="numeric"
                  min="1"
                  name="seatsTotal"
                  required
                  type="number"
                />
              </label>
              <label className="text-[10px] font-bold text-muted">
                Closes on
                <input
                  className={`${inputClass} mt-1`}
                  name="closesAt"
                  required
                  type="date"
                />
              </label>
            </div>

            <label className="mt-3 block text-[10px] font-bold text-muted">
              Short description (shown on job cards)
              <textarea
                className={`${inputClass} mt-1 min-h-20 resize-y py-2`}
                maxLength={500}
                name="shortDescription"
                placeholder="One or two lines about the job."
                required
                rows={2}
              />
            </label>
            <label className="mt-3 block text-[10px] font-bold text-muted">
              Full description
              <textarea
                className={`${inputClass} mt-1 min-h-28 resize-y py-2`}
                maxLength={2000}
                name="description"
                placeholder="What the work is, the pay, the shift and anything else an applicant should know."
                required
                rows={4}
              />
            </label>
            <label className="mt-3 block text-[10px] font-bold text-muted">
              What is included (optional)
              <textarea
                aria-describedby="included-help"
                className={`${inputClass} mt-1 min-h-24 resize-y py-2`}
                maxLength={4020}
                name="included"
                placeholder={'Housing\nTransport\nMeals'}
                rows={3}
              />
            </label>
            <span className="mt-1 block text-[10px] font-normal text-muted" id="included-help">
              One item per line. Leave empty if nothing is included.
            </span>

            <div className="mt-4 flex flex-wrap gap-2">
              <button className={solidButton} disabled={creating} type="submit">
                {creating ? 'Adding…' : 'Add offer'}
              </button>
              <button className={outlineButton} onClick={closeAdd} type="button">Cancel</button>
            </div>
          </form>
        </section>
      ) : null}

      <div className="motion-stagger mt-5 grid gap-4">
        {!loading && offers.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-surface p-5 text-xs text-muted">
            No offers yet. Use Add offer to create the first one.
          </p>
        ) : null}

        {offers.map((offer) => {
          const status = statusCopy(offer.status)
          const saving = savingId === offer.id
          const paused = offer.status === 'paused'
          const soldOut = offer.status === 'soldout'
          const barColor = paused
            ? 'bg-sand-strong'
            : soldOut || offer.seatsTaken >= offer.seatsTotal
              ? 'bg-coral-strong'
              : 'bg-brand'

          return (
            <article className="rounded-xl border border-line bg-surface p-5" key={offer.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="font-bold">Offer {offer.id}</h2>
                  <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                  <span className="text-[10px] text-muted">{offer.slug}</span>
                </div>
                <p className="text-[10px] text-muted">
                  {paused
                    ? 'Registration is paused on the public site.'
                    : soldOut
                      ? 'All places are taken; the waitlist is open.'
                      : 'Registration is open.'}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-5 gap-3 max-[900px]:grid-cols-2 max-[450px]:grid-cols-1">
                <label className="text-[10px] font-bold text-muted">
                  Title
                  <input
                    autoComplete="off"
                    className={`${inputClass} mt-1`}
                    name={`title-${offer.id}`}
                    onChange={(event) => updateLocal(offer.id, 'title', event.target.value)}
                    value={offer.title}
                  />
                </label>
                <label className="text-[10px] font-bold text-muted">
                  City
                  <input
                    autoComplete="off"
                    className={`${inputClass} mt-1`}
                    name={`location-${offer.id}`}
                    onChange={(event) => updateLocal(offer.id, 'location', event.target.value)}
                    value={offer.location ?? ''}
                  />
                </label>
                <label className="text-[10px] font-bold text-muted">
                  Pay / month
                  <input
                    autoComplete="off"
                    className={`${inputClass} mt-1`}
                    name={`price-${offer.id}`}
                    onChange={(event) => updateLocal(offer.id, 'price', event.target.value)}
                    value={offer.price}
                  />
                </label>
                <label className="text-[10px] font-bold text-muted">
                  Place limit
                  <input
                    className={`${inputClass} mt-1`}
                    inputMode="numeric"
                    min={offer.seatsTaken}
                    name={`seats-${offer.id}`}
                    onChange={(event) => updateLocal(offer.id, 'seatsTotal', Number(event.target.value))}
                    type="number"
                    value={offer.seatsTotal}
                  />
                </label>
                <label className="text-[10px] font-bold text-muted">
                  Closes on
                  <input
                    className={`${inputClass} mt-1`}
                    name={`closes-${offer.id}`}
                    onChange={(event) => updateLocal(offer.id, 'closesAt', event.target.value)}
                    type="date"
                    value={offer.closesAt ?? ''}
                  />
                </label>
              </div>

              <p className="mt-4 text-xs font-bold tabular-nums">Places taken: {offer.seatsTaken} of {offer.seatsTotal}</p>
              <div className="mt-2 h-2.5 rounded-full bg-soft">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${barColor}`}
                  style={{ width: `${offer.seatsTotal ? Math.min((offer.seatsTaken / offer.seatsTotal) * 100, 100) : 0}%` }}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {paused ? (
                  <>
                    <button className={solidButton} disabled={saving} onClick={() => resumeOffer(offer)} type="button">
                      {saving ? 'Saving…' : 'Resume offer'}
                    </button>
                    <button className={outlineButton} disabled={saving} onClick={() => saveChanges(offer)} type="button">
                      Save changes
                    </button>
                  </>
                ) : soldOut ? (
                  <>
                    <button className={solidButton} disabled={saving} onClick={() => raiseSeatLimit(offer)} type="button">
                      {saving ? 'Saving…' : 'Raise seat limit'}
                    </button>
                    <button className={outlineButton} disabled={saving} onClick={() => holdOffer(offer)} type="button">
                      Hold offer
                    </button>
                    <Link className={outlineButton} to={`/offers/${offer.slug}/waitlist`}>
                      View waitlist ({offer.waitlistCount ?? 0})
                    </Link>
                  </>
                ) : (
                  <>
                    <button className={solidButton} disabled={saving} onClick={() => saveChanges(offer)} type="button">
                      {saving ? 'Saving…' : 'Save changes'}
                    </button>
                    <button className={outlineButton} disabled={saving} onClick={() => holdOffer(offer)} type="button">
                      Hold offer
                    </button>
                  </>
                )}
                <Link className={outlineButton} to={`/offers/${offer.slug}`}>View offer</Link>
                <button className={dangerButton} disabled={saving} onClick={() => askRemove(offer)} type="button">
                  Remove
                </button>
              </div>
            </article>
          )
        })}
      </div>

      <dialog
        aria-describedby="remove-offer-description"
        aria-labelledby="remove-offer-title"
        className="m-auto max-h-[calc(100vh-2rem)] w-[min(92vw,440px)] overflow-y-auto rounded-xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-night/60"
        onCancel={(event) => {
          if (removeBusy) {
            event.preventDefault()
            return
          }
          setRemoving(null)
        }}
        onClose={() => {
          if (!removeBusy) setRemoving(null)
        }}
        ref={removeDialogRef}
      >
        {removing ? (
          <div className="p-5">
            <h2 className="text-base font-bold" id="remove-offer-title">Remove “{removing.title}”?</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted" id="remove-offer-description">
              If this offer has registrations it will be hidden instead of deleted. Waitlist entries are protected the same way, so no applicant data or recordings are lost.
            </p>
            {removeError ? (
              <p className="motion-notice mt-3 rounded-lg bg-coral p-3 text-xs font-semibold text-coral-ink" role="alert">
                {removeError}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button className={outlineButton} disabled={removeBusy} onClick={cancelRemove} ref={cancelRemoveRef} type="button">
                Cancel
              </button>
              <button className={dangerButton} disabled={removeBusy} onClick={handleRemove} type="button">
                {removeBusy ? 'Removing…' : 'Remove offer'}
              </button>
            </div>
          </div>
        ) : null}
      </dialog>
    </AdminLayout>
  )
}
