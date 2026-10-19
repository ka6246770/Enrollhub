import { OFFER_PILL_STYLES } from '../../lib/ui.js'

const TONES = {
  neutral: 'bg-mint text-mint-ink',
  warning: 'bg-sand text-sand-ink',
  danger: 'bg-coral text-coral-ink',
  brand: 'bg-brand text-white',
  plum: 'bg-plum-soft text-plum-ink',
}

// Small rounded status label used in the dashboard tables.
export function StatusBadge({ children, tone = 'neutral', className = '' }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${TONES[tone] ?? TONES.neutral} ${className}`}>
      {children}
    </span>
  )
}

export function OfferPill({ id }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${OFFER_PILL_STYLES[(id - 1) % OFFER_PILL_STYLES.length]}`}>Offer {id}</span>
}

export default StatusBadge
