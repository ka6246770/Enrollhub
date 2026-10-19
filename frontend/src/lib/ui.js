// Shared class-name strings. Keeping them in one module means every button,
// field, and focus ring across the public site and the dashboard stays in sync.

export const container = 'content-width'

export const button =
  'inline-flex min-h-10 items-center justify-center rounded-[9px] border border-brand bg-brand px-4 text-center text-xs font-bold text-white no-underline transition-colors hover:bg-brand-dark hover:border-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none'

export const secondaryButton =
  'inline-flex min-h-10 items-center justify-center rounded-lg border border-brand bg-white px-4 text-xs font-bold text-brand no-underline transition-colors hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none'

export const field =
  'mt-1.5 min-h-11 w-full rounded-lg border border-line bg-white px-3.5 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/15'

export const label = 'block text-xs font-bold text-ink'

export const sectionHeading = 'mb-4 text-xl font-bold tracking-tight'

export const skipLink =
  'sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:border focus:border-brand focus:bg-brand focus:px-4 focus:py-2 focus:text-xs focus:font-bold focus:text-white focus:no-underline'

// Dashboard-only strings.

export const adminContainer =
  'mx-auto w-[min(100%_-_56px,_1140px)] py-8 max-[650px]:w-[min(100%_-_36px,_1140px)] max-[650px]:py-5'

export const outlineButton =
  'inline-flex min-h-9 items-center justify-center rounded-lg border border-line bg-white px-3 text-xs font-bold text-ink no-underline transition-colors hover:border-brand hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

export const solidButton =
  'inline-flex min-h-9 items-center justify-center rounded-lg border border-brand bg-brand px-3 text-xs font-bold text-white no-underline transition-colors hover:border-brand-dark hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

export const inputClass =
  'min-h-10 w-full rounded-lg border border-line bg-white px-3 text-xs outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15'

export const adminSkipLink =
  'sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-xs focus:font-bold focus:text-white focus:no-underline'

// Offer colours are shared by the dashboard table pills and the "by offer"
// chart so an offer keeps the same colour everywhere.
export const OFFER_PILL_STYLES = ['bg-mint text-mint-ink', 'bg-sand text-sand-ink', 'bg-plum-soft text-plum-ink']
export const OFFER_BAR_STYLES = ['bg-brand', 'bg-sand-strong', 'bg-plum']
