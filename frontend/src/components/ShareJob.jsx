import { useState } from 'react'
import { SITE_URL } from '../config/site.js'
import { copyText } from '../lib/clipboard.js'
import { outlineButton, secondaryButton } from '../lib/ui.js'

// Share controls sit beside the job ticket so a worker can send the listing to
// a friend without copying the address bar. Web Share is used when the browser
// offers it; WhatsApp and copy are always available.
export default function ShareJob({ offer }) {
  const [copied, setCopied] = useState(false)
  const url = `${SITE_URL}/offers/${offer.slug}`
  const text = `${offer.title} job in ${offer.location} — ${offer.price} per month. Apply with Al-Tayeb:`
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  async function copy() {
    const success = await copyText(url)
    setCopied(success)
  }

  async function share() {
    try {
      await navigator.share({ title: `${offer.title} — Al-Tayeb`, text, url })
    } catch {
      // The user cancelled the native sheet; no state change is needed.
    }
  }

  return (
    <section aria-label="Share this job" className="mt-4 border border-ink/15 bg-white/60 p-4">
      <p className="mono-label text-muted">Share this job</p>
      <div className="mt-3 grid gap-2 min-[420px]:grid-cols-2">
        <a className={`${secondaryButton} min-h-9 px-3 text-[11px]`} href={whatsapp} rel="noreferrer" target="_blank">
          WhatsApp
        </a>
        <button className={`${secondaryButton} min-h-9 px-3 text-[11px]`} onClick={copy} type="button">
          {copied ? 'Link copied' : 'Copy link'}
        </button>
        {canShare ? (
          <button className={`${outlineButton} min-h-9 min-[420px]:col-span-2`} onClick={share} type="button">
            Share…
          </button>
        ) : null}
      </div>
      <p aria-live="polite" className="sr-only">{copied ? 'Job link copied to clipboard.' : ''}</p>
    </section>
  )
}
