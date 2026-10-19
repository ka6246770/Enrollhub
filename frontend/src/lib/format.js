const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

// Formats an ISO date (YYYY-MM-DD) using the visitor's locale. Falls back to
// the raw value if it cannot be parsed.
export function formatDate(value) {
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
}

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

// Formats a full timestamp (message log entries). Returns '—' for missing values.
export function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date)
}

// True when a timestamp is within the last `days` days. Keeps clock reads out
// of component render bodies.
export function isWithinLastDays(value, days = 7) {
  if (!value) return false
  const time = new Date(value).getTime()
  if (Number.isNaN(time)) return false
  return Date.now() - time < days * 24 * 60 * 60 * 1000
}
