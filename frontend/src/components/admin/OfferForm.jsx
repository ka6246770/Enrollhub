import { Link } from 'react-router-dom'
import { inputClass, outlineButton, solidButton } from '../../lib/ui.js'

const STATUS_OPTIONS = [
  ['active', 'Active — taking applications'],
  ['paused', 'Paused — visible, not taking applications'],
  ['soldout', 'Sold out — waitlist open'],
  ['closed', 'Archived — hidden from the public site'],
]

function Field({ label, hint, className = '', ...props }) {
  return (
    <label className={`block text-[10px] font-bold text-muted ${className}`}>
      {label}
      <input className={`${inputClass} mt-1`} {...props} />
      {hint ? <span className="mt-1 block text-[10px] font-normal leading-relaxed text-muted">{hint}</span> : null}
    </label>
  )
}

function AreaField({ label, hint, className = '', ...props }) {
  return (
    <label className={`block text-[10px] font-bold text-muted ${className}`}>
      {label}
      <textarea className={`${inputClass} mt-1 min-h-24 resize-y py-2`} {...props} />
      {hint ? <span className="mt-1 block text-[10px] font-normal leading-relaxed text-muted">{hint}</span> : null}
    </label>
  )
}

// The editable half of the offer editor. It owns no data: the page passes the
// form values down and receives every change back through `onChange`.
export default function OfferForm({ form, isEditing, saving, onChange, onSubmit, submitLabel, minSeats = 0 }) {
  return (
    <form className="motion-panel mt-5 grid gap-5" onSubmit={onSubmit}>
      <section className="rounded-xl border border-line bg-surface p-5">
        <h2 className="text-sm font-bold">Job details</h2>

        <div className="mt-4 grid grid-cols-3 gap-3 max-[850px]:grid-cols-2 max-[540px]:grid-cols-1">
          <Field
            className="col-span-2 max-[540px]:col-span-1"
            label="Title"
            maxLength={200}
            name="title"
            onChange={onChange}
            placeholder="e.g. Packaging & labeling"
            required
            value={form.title}
          />
          <Field
            label="City"
            maxLength={80}
            name="location"
            onChange={onChange}
            placeholder="e.g. Sadat City"
            required
            value={form.location}
          />
          <Field
            label="Pay / month"
            maxLength={60}
            name="price"
            onChange={onChange}
            placeholder="e.g. 9,000 EGP"
            required
            value={form.price}
          />
          <Field
            label="Shift"
            maxLength={60}
            name="duration"
            onChange={onChange}
            placeholder="e.g. 12-hour shifts"
            required
            value={form.duration}
          />
          <Field
            hint={minSeats > 0 ? `At least ${minSeats}: that many places are already taken.` : 'Total places available for this job.'}
            inputMode="numeric"
            label="Place limit"
            min={minSeats}
            name="seatsTotal"
            onChange={onChange}
            required
            type="number"
            value={form.seatsTotal}
          />
          <Field
            hint="Leave empty to keep applications open while places remain."
            label="Closes on"
            name="closesAt"
            onChange={onChange}
            type="date"
            value={form.closesAt}
          />
        </div>

        <AreaField
          className="mt-3"
          label="Short description (shown on job cards)"
          maxLength={500}
          name="shortDescription"
          onChange={onChange}
          placeholder="One or two lines about the job."
          required
          rows={2}
          value={form.shortDescription}
        />
        <AreaField
          className="mt-3"
          label="Full description"
          maxLength={2000}
          name="description"
          onChange={onChange}
          placeholder="What the work is, the pay, the shift and anything else an applicant should know."
          required
          rows={5}
          value={form.description}
        />
        <AreaField
          className="mt-3"
          hint="One item per line. Leave empty if nothing is included."
          label="What is included (optional)"
          maxLength={4020}
          name="included"
          onChange={onChange}
          placeholder={'Housing\nTransport\nMeals'}
          rows={3}
          value={form.included}
        />
      </section>

      {isEditing ? (
        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="text-sm font-bold">Visibility</h2>
          <label className="mt-3 block max-w-[520px] text-[10px] font-bold text-muted">
            Status
            <select className={`${inputClass} mt-1`} name="status" onChange={onChange} value={form.status}>
              {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <p className="mt-2 max-w-[70ch] text-[10px] leading-relaxed text-muted">
            Archived offers stay in this dashboard but disappear from the public site. Choosing Active reopens the offer.
          </p>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button className={solidButton} disabled={saving} type="submit">
          {saving ? 'Saving…' : submitLabel}
        </button>
        <Link className={outlineButton} to="/admin/offers">Cancel</Link>
      </div>
    </form>
  )
}
