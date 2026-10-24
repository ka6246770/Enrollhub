import { useCallback, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import AdminDialog from '../../components/admin/AdminDialog.jsx'
import { AdminLayout, PageHeading } from '../../components/admin/AdminLayout.jsx'
import OfferForm from '../../components/admin/OfferForm.jsx'
import { useAsyncResource } from '../../hooks/useAsyncResource.js'
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning.js'
import { dangerButton, outlineButton } from '../../lib/ui.js'
import { createOffer, deleteOffer, fetchAllOffers, updateOffer } from '../../services/api.js'

const EMPTY_FORM = {
  title: '',
  location: '',
  price: '',
  duration: '',
  seatsTotal: '',
  closesAt: '',
  shortDescription: '',
  description: '',
  included: '',
  status: 'active',
}

const CONTENT_FIELDS = [
  'title',
  'location',
  'price',
  'duration',
  'seatsTotal',
  'closesAt',
  'shortDescription',
  'description',
  'included',
]

function toDateInput(value) {
  if (!value) return ''
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function toForm(offer) {
  return {
    title: offer.title ?? '',
    location: offer.location ?? '',
    price: offer.price ?? '',
    duration: offer.duration ?? '',
    seatsTotal: String(offer.seatsTotal ?? ''),
    closesAt: toDateInput(offer.closesAt),
    shortDescription: offer.shortDescription ?? '',
    description: offer.description ?? '',
    included: Array.isArray(offer.included) ? offer.included.join('\n') : '',
    status: offer.status ?? 'active',
  }
}

function toPayload(form, isEditing) {
  return {
    title: form.title.trim(),
    location: form.location.trim(),
    price: form.price.trim(),
    duration: form.duration.trim(),
    seatsTotal: Number(form.seatsTotal),
    closesAt: form.closesAt || null,
    shortDescription: form.shortDescription.trim(),
    description: form.description.trim(),
    included: form.included.split('\n').map((item) => item.trim()).filter(Boolean),
    ...(isEditing ? { status: form.status } : {}),
  }
}

// Kept separate from the loader so the form state is created exactly once for
// the offer on screen; the `key` on this component resets it if the id changes.
function OfferEditorBody({ offer, isEditing }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [initialForm, setInitialForm] = useState(() => (offer ? toForm(offer) : null))
  const [form, setForm] = useState(initialForm ?? EMPTY_FORM)
  const [notice, setNotice] = useState(location.state?.notice ?? '')
  const [actionError, setActionError] = useState('')
  const [saving, setSaving] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [removeError, setRemoveError] = useState('')

  const dirty = isEditing
    ? Boolean(initialForm) && JSON.stringify(form) !== JSON.stringify(initialForm)
    : CONTENT_FIELDS.some((field) => form[field].trim() !== '')
  useUnsavedChangesWarning(dirty)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    if (notice) setNotice('')
    if (actionError) setActionError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (saving || (isEditing && !offer)) return

    setSaving(true)
    setNotice('')
    setActionError('')
    const payload = toPayload(form, isEditing)

    try {
      if (isEditing) {
        const updated = await updateOffer(offer.id, payload)
        const values = toForm(updated)
        setForm(values)
        setInitialForm(values)
        setNotice(`Offer “${updated.title}” saved. The public page uses the new details.`)
      } else {
        const created = await createOffer(payload)
        navigate('/admin/offers', {
          replace: true,
          state: { notice: `Offer “${created.title}” created. It is live on the public site.` },
        })
      }
    } catch (saveError) {
      setActionError(saveError.message || 'Could not save the offer.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    if (!offer || removing) return

    setRemoving(true)
    setRemoveError('')
    try {
      const result = await deleteOffer(offer.id)
      navigate('/admin/offers', {
        replace: true,
        state: { notice: result.message || `Offer “${offer.title}” removed.` },
      })
    } catch (removeFailure) {
      setRemoveError(removeFailure.message || 'Could not remove the offer.')
      setRemoving(false)
    }
  }

  return (
    <AdminLayout active="Offers">
      <Link className="inline-flex min-h-6 items-center text-xs font-bold text-brand-text no-underline hover:underline" to="/admin/offers">
        ← All offers
      </Link>

      <div className="mt-3">
        <PageHeading
          eyebrow="Dashboard"
          subtitle={isEditing ? `${offer.title} · ${offer.slug}` : 'The offer is published immediately. You can pause it after creating it.'}
          title={isEditing ? 'Edit offer' : 'New offer'}
        />
      </div>

      {notice ? (
        <p className="motion-notice mt-4 rounded-lg bg-soft p-3 text-xs font-semibold text-brand-text" role="status">{notice}</p>
      ) : null}
      {actionError ? (
        <p className="motion-notice mt-4 rounded-lg bg-coral p-3 text-xs font-semibold text-coral-ink" role="alert">{actionError}</p>
      ) : null}

      <OfferForm
        form={form}
        isEditing={isEditing}
        minSeats={offer?.seatsTaken ?? 0}
        onChange={handleChange}
        onSubmit={handleSubmit}
        saving={saving}
        submitLabel={isEditing ? 'Save changes' : 'Create offer'}
      />

      {isEditing ? (
        <section className="motion-panel mt-6 rounded-xl border border-danger/40 bg-surface p-5">
          <h2 className="text-sm font-bold text-danger">Remove this offer</h2>
          <p className="mt-1 max-w-[70ch] text-xs leading-relaxed text-muted">
            If the offer has applications or waitlist entries it is archived instead of deleted, so no applicant data or recordings are lost.
          </p>
          <button
            className={`${dangerButton} mt-4`}
            onClick={() => {
              setRemoveError('')
              setRemoveOpen(true)
            }}
            type="button"
          >
            Remove offer
          </button>
        </section>
      ) : null}

      {isEditing ? (
        <AdminDialog
          description="No applicant data or recordings are deleted."
          onClose={() => {
            if (!removing) setRemoveOpen(false)
          }}
          open={removeOpen}
          title={`Remove “${offer.title}”?`}
        >
          <p className="text-xs leading-relaxed text-muted">
            An offer with applications or waitlist entries is archived and hidden from the public site. An empty offer is deleted.
          </p>
          {removeError ? (
            <p className="motion-notice mt-3 rounded-lg bg-coral p-3 text-xs font-semibold text-coral-ink" role="alert">{removeError}</p>
          ) : null}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button className={outlineButton} disabled={removing} onClick={() => setRemoveOpen(false)} type="button">
              Keep offer
            </button>
            <button className={dangerButton} disabled={removing} onClick={handleRemove} type="button">
              {removing ? 'Removing…' : 'Remove offer'}
            </button>
          </div>
        </AdminDialog>
      ) : null}
    </AdminLayout>
  )
}

export default function OfferEditor() {
  const { id } = useParams()
  const isEditing = Boolean(id)
  const offerId = Number(id)

  // Archived offers are editable too, so the editor reads the admin list.
  const loadOffers = useCallback(
    () => (isEditing ? fetchAllOffers() : Promise.resolve([])),
    [isEditing],
  )
  const { data, loading, error } = useAsyncResource(loadOffers)
  const offer = useMemo(
    () => (data ?? []).find((item) => item.id === offerId),
    [data, offerId],
  )

  if (isEditing && loading) {
    return (
      <AdminLayout active="Offers">
        <p className="text-xs font-bold text-muted" role="status">Loading offer…</p>
      </AdminLayout>
    )
  }

  if (isEditing && (error || !offer)) {
    return (
      <AdminLayout active="Offers">
        <PageHeading eyebrow="Dashboard" title="Offer not available" subtitle="It may have been removed while this page was open." />
        <p className="mt-4 rounded-lg bg-coral p-3 text-xs font-semibold text-coral-ink" role="alert">
          {error || 'This offer was not found.'}
        </p>
        <Link className={`${outlineButton} mt-4`} to="/admin/offers">Back to all offers</Link>
      </AdminLayout>
    )
  }

  return <OfferEditorBody isEditing={isEditing} key={offer?.id ?? 'new'} offer={offer} />
}
