import { formatDate, isDateDue, todayIso } from './format.js'

// Shared dashboard vocabulary. Keeping the order and colours here means the
// stat cards, pipeline chart and table badges never disagree.
export const STATUS_FILTERS = ['All', 'New', 'Contacted', 'Offered', 'Accepted', 'Rejected', 'Declined']

export const PIPELINE = [
  { key: 'new', label: 'New', bar: 'bg-accent', chip: 'bg-mint text-mint-ink' },
  { key: 'contacted', label: 'Contacted', bar: 'bg-plum', chip: 'bg-plum-soft text-plum-ink' },
  { key: 'offered', label: 'Offered', bar: 'bg-sand-strong', chip: 'bg-sand text-sand-ink' },
  { key: 'accepted', label: 'Accepted', bar: 'bg-brand', chip: 'bg-brand text-white' },
  { key: 'rejected', label: 'Rejected', bar: 'bg-coral-strong', chip: 'bg-coral text-coral-ink' },
  { key: 'declined', label: 'Declined', bar: 'bg-muted', chip: 'bg-soft text-muted' },
]

const CLOSED_STATUSES = ['accepted', 'rejected', 'declined']

// A person is waiting on the team when they are new or their follow-up date is
// due and the case is not closed yet.
export function needsAttention(person, today = todayIso()) {
  if (person.status === 'new') return true
  return Boolean(person.followUpAt)
    && isDateDue(person.followUpAt, today)
    && !CLOSED_STATUSES.includes(person.status)
}

function localDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

// The last seven local calendar days, oldest first. Built by hand because
// toISOString() would shift the day for visitors east or west of UTC.
export function lastSevenDays(rows, now = new Date()) {
  const days = []
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset)
    days.push({
      key: localDateKey(date),
      label: new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date),
      count: 0,
      isToday: offset === 0,
    })
  }

  const byKey = new Map(days.map((day) => [day.key, day]))
  for (const row of rows) {
    if (!row.createdAt) continue
    const date = new Date(row.createdAt)
    if (Number.isNaN(date.getTime())) continue
    const day = byKey.get(localDateKey(date))
    if (day) day.count += 1
  }
  return days
}

export function statusCounts(rows) {
  const counts = Object.fromEntries(PIPELINE.map((status) => [status.key, 0]))
  for (const row of rows) {
    const status = String(row.status ?? '').toLowerCase()
    if (status in counts) counts[status] += 1
  }
  return counts
}

export function dateOnly(value) {
  if (!value) return '—'
  const date = String(value).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? formatDate(date) : '—'
}
