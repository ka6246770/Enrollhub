import { field, label } from '../lib/ui.js'

export function Field({ label: fieldLabel, className = '', ...props }) {
  return (
    <label className={`${label} ${className}`}>
      {fieldLabel}
      <input className={field} {...props} />
    </label>
  )
}

export function SelectField({ label: fieldLabel, children, ...props }) {
  return (
    <label className={label}>
      {fieldLabel}
      <select className={field} defaultValue="" {...props}>
        <option disabled value="">Select {fieldLabel.toLowerCase()}</option>
        {children}
      </select>
    </label>
  )
}

export function TextareaField({ label: fieldLabel, className = '', ...props }) {
  return (
    <label className={`${label} ${className}`}>
      {fieldLabel}
      <textarea className={`${field} min-h-28 resize-y py-2.5`} {...props} />
    </label>
  )
}
