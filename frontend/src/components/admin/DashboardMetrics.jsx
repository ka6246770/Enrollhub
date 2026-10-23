import { dateOnly, PIPELINE } from '../../lib/dashboard.js'
import { outlineButton, OFFER_BAR_STYLES } from '../../lib/ui.js'

const ICONS = {
  users: 'M15.5 20v-1.5a3.5 3.5 0 0 0-3.5-3.5H6.5A3.5 3.5 0 0 0 3 18.5V20m14-9.5a3.5 3.5 0 1 0-7 0 3.5 3.5 0 0 0 7 0Zm4.5 9.5v-1.5a3.5 3.5 0 0 0-2.6-3.36M16 4.14a3.5 3.5 0 0 1 0 6.72',
  inbox: 'M4 13h4l1.5 2.5h5L16 13h4M4 13 6.2 5.4A2 2 0 0 1 8.1 4h7.8a2 2 0 0 1 1.9 1.4L20 13v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4Z',
  alert: 'M12 9v4m0 4h.01M10.3 4.3 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z',
  check: 'm5 12.5 4.5 4.5L19 7',
}

function StatIcon({ name }) {
  return (
    <svg aria-hidden="true" className="size-4 stroke-current stroke-[1.7] [stroke-linecap:round] [stroke-linejoin:round]" viewBox="0 0 24 24" fill="none">
      <path d={ICONS[name]} />
    </svg>
  )
}

const STATS = [
  { key: 'total', title: 'Total applications', hint: 'All time', icon: 'users', strip: 'bg-plum', iconClass: 'bg-plum-soft text-plum-ink' },
  { key: 'new', title: 'New this week', hint: 'Rolling 7 days', icon: 'inbox', strip: 'bg-accent', iconClass: 'bg-coral text-coral-ink' },
  { key: 'attention', title: 'Needs attention', hint: 'New or follow-up due', icon: 'alert', strip: 'bg-sand-strong', iconClass: 'bg-sand text-sand-ink' },
  { key: 'accepted', title: 'Confirmed places', hint: 'Applicant accepted', icon: 'check', strip: 'bg-brand', iconClass: 'bg-mint text-mint-ink' },
]

export function StatGrid({ values }) {
  return (
    <section aria-label="Registration metrics" className="mt-5 grid grid-cols-4 gap-3 max-[850px]:grid-cols-2">
      {STATS.map((stat) => (
        <article className="relative overflow-hidden rounded-xl border border-line bg-surface p-4" key={stat.key}>
          <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-[3px] ${stat.strip}`} />
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-muted">{stat.title}</p>
            <span className={`grid size-7 shrink-0 place-items-center rounded-lg ${stat.iconClass}`}>
              <StatIcon name={stat.icon} />
            </span>
          </div>
          <p className="mt-2 text-[30px] font-bold leading-none tracking-tight tabular-nums">{values[stat.key] ?? 0}</p>
          <p className="mt-1.5 text-[10px] text-muted">{stat.hint}</p>
        </article>
      ))}
    </section>
  )
}

function PanelHeading({ title, hint, children }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-sm font-bold">{title}</h2>
        {hint ? <p className="mt-0.5 text-[10px] text-muted">{hint}</p> : null}
      </div>
      {children}
    </div>
  )
}

export function ActivityPanel({ days }) {
  const peak = Math.max(...days.map((day) => day.count), 1)
  const weekTotal = days.reduce((sum, day) => sum + day.count, 0)
  const summary = days.map((day) => `${day.label}: ${day.count}`).join(', ')

  return (
    <article className="rounded-xl border border-line bg-surface p-5">
      <PanelHeading hint="Applications per local calendar day" title="Last 7 days">
        <span className="mono-label text-muted">{weekTotal} total</span>
      </PanelHeading>
      <div aria-label={`Applications in the last seven days. ${summary}.`} className="mt-6 flex h-36 items-end gap-2" role="img">
        {days.map((day) => (
          <div aria-hidden="true" className="flex h-full flex-1 flex-col items-center justify-end gap-2" key={day.key}>
            <span className={`text-[10px] font-bold tabular-nums ${day.count ? 'text-ink' : 'text-muted/60'}`}>
              {day.count || '0'}
            </span>
            <span
              className={`w-full rounded-t-[3px] ${day.count === 0 ? 'bg-soft' : day.isToday ? 'bg-accent' : 'bg-brand'}`}
              style={{ height: `${day.count === 0 ? 4 : Math.max(10, Math.round((day.count / peak) * 100))}%` }}
              title={`${day.label}: ${day.count}`}
            />
            <span className={`text-[9px] ${day.isToday ? 'font-bold text-accent-text' : 'text-muted'}`}>{day.label}</span>
          </div>
        ))}
      </div>
    </article>
  )
}

export function PipelinePanel({ counts, total }) {
  return (
    <article className="rounded-xl border border-line bg-surface p-5">
      <PanelHeading hint="Where every application stands" title="Pipeline" />
      <div aria-hidden="true" className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-soft">
        {PIPELINE.map((status) => (
          counts[status.key] > 0 ? (
            <span
              className={`${status.bar} h-full`}
              key={status.key}
              style={{ width: `${total ? (counts[status.key] / total) * 100 : 0}%` }}
            />
          ) : null
        ))}
      </div>
      <ul className="mt-4 grid gap-2">
        {PIPELINE.map((status) => (
          <li className="flex items-center justify-between gap-2 text-[11px]" key={status.key}>
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className={`size-2 rounded-full ${status.bar}`} />
              {status.label}
            </span>
            <span className="font-bold tabular-nums">{counts[status.key] ?? 0}</span>
          </li>
        ))}
      </ul>
    </article>
  )
}

export function OfferPanel({ offers, rows }) {
  const counts = new Map()
  for (const person of rows) counts.set(person.offerId, (counts.get(person.offerId) ?? 0) + 1)

  const ranked = [...offers]
    .map((offer) => ({ offer, count: counts.get(offer.id) ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return (
    <article className="rounded-xl border border-line bg-surface p-5">
      <PanelHeading hint="Top jobs by number of applications" title="By offer">
        <span className="mono-label text-muted">{offers.length} {offers.length === 1 ? 'job' : 'jobs'}</span>
      </PanelHeading>
      {ranked.length === 0 ? (
        <p className="mt-5 text-xs text-muted">No jobs yet.</p>
      ) : (
        <div className="mt-5 grid gap-4">
          {ranked.map(({ offer, count }) => (
            <div key={offer.id}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[11px] tabular-nums">
                <span className="truncate">{offer.title}</span>
                <span className="shrink-0 font-bold">{count}</span>
              </div>
              <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-soft">
                <div
                  className={`h-full rounded-full ${OFFER_BAR_STYLES[(offer.id - 1) % OFFER_BAR_STYLES.length]}`}
                  style={{ width: `${rows.length ? (count / rows.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

function statusChip(status) {
  const match = PIPELINE.find((item) => item.key === String(status).toLowerCase())
  return match?.chip ?? 'bg-soft text-muted'
}

export function AttentionPanel({ people, offers, onManage, onViewAll }) {
  function offerTitle(person) {
    return offers.find((offer) => offer.id === person.offerId || offer.slug === person.offerSlug)?.title ?? `Offer ${person.offerId}`
  }

  return (
    <article className="rounded-xl border border-line bg-surface p-5">
      <PanelHeading hint="New applications and follow-ups due" title="Needs attention">
        <button className="text-[10px] font-bold text-brand-text underline underline-offset-4 hover:no-underline" onClick={onViewAll} type="button">
          View all
        </button>
      </PanelHeading>
      {people.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-line bg-surface-2 p-4">
          <p className="text-xs font-bold">Nothing is waiting.</p>
          <p className="mt-1 text-[11px] text-muted">New applications and due follow-ups appear here.</p>
        </div>
      ) : (
        <ul className="mt-4 grid gap-2">
          {people.map((person) => (
            <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2" key={person.id}>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-bold">{person.name}</p>
                <p className="truncate text-[10px] text-muted">{offerTitle(person)} · {dateOnly(person.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold capitalize ${statusChip(person.status)}`}>{person.status}</span>
                <button className={`${outlineButton} min-h-7 px-2 text-[10px]`} onClick={() => onManage(person)} type="button">
                  Open
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
