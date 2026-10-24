// Shared class-name strings. Keeping them in one module means every button,
// field, and focus ring across the public site and the dashboard stays in sync.

export const container = 'content-width'

// A white ring alone disappears on paper; an ink ring alone disappears on the
// dark header. Two bands cover both: the ink shadow fills the offset gap and
// the white outline sits just outside it.
const focusRingOnSolid = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white focus-visible:shadow-[0_0_0_2px_var(--color-ink)]'

export const button =
  `inline-flex min-h-11 items-center justify-center gap-2 rounded-[4px] border border-action bg-action px-5 text-center text-[13px] font-bold text-white no-underline transition-colors hover:border-action-dark hover:bg-action-dark ${focusRingOnSolid} motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50`

export const secondaryButton =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-[4px] border border-ink/30 bg-transparent px-5 text-center text-[13px] font-bold text-ink no-underline transition-colors hover:border-ink hover:bg-surface/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none'

// The same quiet action on the dark bands.
export const secondaryOnDark =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-[4px] border border-white/30 bg-transparent px-5 text-center text-[13px] font-bold text-white no-underline transition-colors hover:border-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none'

export const field =
  'mt-1.5 min-h-12 w-full rounded-[4px] border border-ink/25 bg-surface px-3.5 text-[15px] text-ink outline-none placeholder:text-muted/60 focus:border-ink focus:ring-2 focus:ring-accent/20'

export const label = 'block text-[13px] font-semibold text-ink'

export const sectionHeading = 'text-[clamp(24px,3vw,32px)] font-extrabold leading-[1.08] tracking-[-0.03em]'

export const skipLink =
  'sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-[4px] focus:border focus:border-action focus:bg-action focus:px-4 focus:py-2 focus:text-xs focus:font-bold focus:text-white focus:no-underline'

// Dashboard-only strings.

export const adminContainer =
  'mx-auto w-[min(100%_-_56px,_1140px)] py-8 max-[650px]:w-[min(100%_-_36px,_1140px)] max-[650px]:py-5'

export const outlineButton =
  'inline-flex min-h-9 items-center justify-center rounded-[4px] border border-line bg-surface px-3 text-xs font-bold text-ink no-underline transition-colors hover:border-brand hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

export const solidButton =
  `inline-flex min-h-9 items-center justify-center rounded-[4px] border border-brand bg-brand px-3 text-xs font-bold text-white no-underline transition-colors hover:border-brand-dark hover:bg-brand-dark ${focusRingOnSolid}`

export const dangerButton =
  'inline-flex min-h-9 items-center justify-center rounded-[4px] border border-danger bg-danger px-3 text-xs font-bold text-danger-ink no-underline transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-strong disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none'

export const inputClass =
  'min-h-10 w-full rounded-[4px] border border-line bg-surface px-3 text-xs outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15'

export const adminSkipLink =
  'sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-[4px] focus:bg-brand focus:px-4 focus:py-2 focus:text-xs focus:font-bold focus:text-white focus:no-underline'

// Offer colours are shared by the dashboard table pills and the "by offer"
// chart so an offer keeps the same colour everywhere.
export const OFFER_PILL_STYLES = ['bg-mint text-mint-ink', 'bg-sand text-sand-ink', 'bg-plum-soft text-plum-ink', 'bg-coral text-coral-ink']
export const OFFER_BAR_STYLES = ['bg-brand', 'bg-sand-strong', 'bg-plum', 'bg-coral-strong']
