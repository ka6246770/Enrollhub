import { STATUS_FILTERS } from '../../lib/dashboard.js'
import { inputClass, outlineButton } from '../../lib/ui.js'

// Status pills plus the three advanced filters. Labels are visible here (not
// just screen-reader text) because a beginner should not have to guess what an
// empty date box does.
export function DashboardFilters({
  activeCount,
  attention,
  attentionCount,
  date,
  offer,
  offers,
  recording,
  shown,
  status,
  total,
  onChange,
  onClear,
}) {
  return (
    <section id="registrations">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Applications</h2>
          <p className="mt-0.5 text-[11px] text-muted">
            {shown} shown · {total} total
            {activeCount > 0 ? ` · ${activeCount} filter${activeCount === 1 ? '' : 's'} active` : ''}
          </p>
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-line bg-surface">
        <div className="flex gap-1.5 overflow-x-auto border-b border-line px-3 py-2.5">
          {STATUS_FILTERS.map((filter) => {
            const isActive = status === filter
            return (
              <button
                aria-pressed={isActive}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none ${isActive ? 'bg-brand text-white' : 'bg-surface-2 text-muted hover:bg-soft hover:text-ink'}`}
                key={filter}
                onClick={() => onChange('status', filter === 'All' ? '' : filter)}
                type="button"
              >
                {filter}
              </button>
            )
          })}
        </div>

        <div className="grid items-end gap-2 p-3 min-[900px]:grid-cols-[minmax(160px,1fr)_minmax(140px,180px)_minmax(150px,190px)_auto_auto]">
          <label className="grid gap-1">
            <span className="mono-label text-muted">Job</span>
            <select className={inputClass} value={offer} onChange={(event) => onChange('offer', event.target.value)}>
              <option value="">All jobs</option>
              {offers.map((offerRow) => <option key={offerRow.id} value={offerRow.slug}>{offerRow.title}</option>)}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="mono-label text-muted">Applied on</span>
            <input className={inputClass} type="date" value={date} onChange={(event) => onChange('date', event.target.value)} />
          </label>

          <label className="grid gap-1">
            <span className="mono-label text-muted">Voice note</span>
            <select className={inputClass} value={recording} onChange={(event) => onChange('recording', event.target.value)}>
              <option value="">Any recording</option>
              <option value="yes">Recording available</option>
              <option value="no">No recording</option>
            </select>
          </label>

          <button
            aria-pressed={attention}
            className={`${outlineButton} whitespace-nowrap ${attention ? 'border-brand bg-brand text-white hover:bg-brand-dark hover:text-white' : ''}`}
            onClick={() => onChange('attention', attention ? '' : '1')}
            type="button"
          >
            Needs attention ({attentionCount})
          </button>
          <button className={`${outlineButton} whitespace-nowrap`} disabled={activeCount === 0} onClick={onClear} type="button">
            Clear filters
          </button>
        </div>
      </div>
    </section>
  )
}

export default DashboardFilters
