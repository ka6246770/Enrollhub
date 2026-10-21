import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageFrame from '../components/PageFrame.jsx'
import Seo from '../components/Seo.jsx'
import { button, container, secondaryButton } from '../lib/ui.js'
import { fetchPublicStatus, respondToStatus } from '../services/api.js'

const EXPLANATIONS = {
  new: 'We have received the application. The team reviews applications in the order they arrive.',
  contacted: 'The team has started reviewing the application. Keep your phone nearby in case they need more information.',
  offered: 'A place is available. Accept it below to confirm it. The place is not confirmed until you accept.',
  accepted: 'The place is confirmed. We will send the schedule and joining details shortly.',
  rejected: 'This application was not selected this time. You can contact us or apply for another open job.',
  declined: 'This offer was declined. Thank you for letting us know.',
  waiting: 'You are on the waitlist. We will contact you if a place opens for this job.',
}

function toneFor(status) {
  if (status === 'accepted') return 'border-brand/30 bg-mint text-mint-ink'
  if (status === 'offered') return 'border-plum/30 bg-plum-soft text-plum-ink'
  if (status === 'rejected' || status === 'declined') return 'border-coral-strong/30 bg-coral text-coral-ink'
  return 'border-line bg-soft text-ink'
}

function StatusPage({ token }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState('')
  const [responding, setResponding] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    fetchPublicStatus(token)
      .then((result) => {
        if (active) setData(result)
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || 'This private link is not valid.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [token])

  async function respond(decision) {
    setResponding(true)
    setError('')
    setNotice('')
    try {
      const result = await respondToStatus(token, decision)
      setData(result)
      setConfirming('')
      setNotice(result.message || (decision === 'accept' ? 'Your place is confirmed.' : 'Your response was recorded.'))
    } catch (respondError) {
      setError(respondError.message || 'Could not record your response.')
      setConfirming('')
    } finally {
      setResponding(false)
    }
  }

  return (
    <PageFrame>
      <Seo
        description="Private application or waitlist status page. Do not share this link."
        noindex
        path={`/status/${token}`}
        title="Private status | Al-Tayeb"
      />
      <main className={`${container} motion-page min-h-[70vh] max-w-[760px] pb-16 pt-12`} id="main-content">
        <p className="mono-label text-brand">Private status link</p>
        <h1 className="mt-2 text-balance text-[clamp(28px,5vw,44px)] font-extrabold leading-[1.05] tracking-[-0.035em]">
          {loading ? 'Checking your status…' : data ? 'Your place, in plain words.' : 'We could not open this link.'}
        </h1>

        {loading ? <p className="mt-6 text-sm text-muted" role="status">Loading…</p> : null}

        {!loading && !data ? (
          <div className="mt-6 border border-coral-strong/30 bg-coral/30 p-5">
            <p className="text-sm font-semibold text-coral-ink" role="alert">{error || 'This private link is not valid.'}</p>
            <p className="mt-2 text-xs leading-relaxed text-coral-ink">
              Check that the whole link was copied. If it still does not work, contact us and we will
              send a new one.
            </p>
            <Link className={`${secondaryButton} mt-4`} to="/contact">Contact us</Link>
          </div>
        ) : null}

        {data ? (
          <>
            <div className="mt-6 border border-line bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="mono-label text-muted">{data.kind === 'waitlist' ? 'Waitlist' : 'Application'}</p>
                  <h2 className="mt-1 text-xl font-bold">{data.offerTitle}</h2>
                  <p className="mt-1 text-xs text-muted">{data.offerLocation} · {data.name}</p>
                </div>
                <span className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-bold ${toneFor(data.status)}`}>
                  {data.statusLabel}
                </span>
              </div>

              <p className="mt-5 text-sm leading-[1.7] text-ink/80">
                {EXPLANATIONS[data.status] ?? 'The team is reviewing this record.'}
              </p>

              {notice ? <p className="mt-4 border border-brand/25 bg-mint p-3 text-xs font-semibold text-mint-ink" role="status">{notice}</p> : null}
              {error ? <p className="mt-4 border border-coral-strong/30 bg-coral p-3 text-xs font-semibold text-coral-ink" role="alert">{error}</p> : null}

              {data.canRespond ? (
                <div className="mt-6 border-t border-dashed border-line pt-5">
                  <h3 className="text-sm font-bold">Confirm your choice</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    Accepting confirms the place. Declining releases it, and we may offer it to
                    someone else.
                  </p>

                  {confirming ? (
                    <div className="mt-4 border border-line bg-soft/50 p-4">
                      <p className="text-sm font-semibold">
                        {confirming === 'accept'
                          ? 'Accept this place? This confirms your place.'
                          : 'Decline this place? We may offer it to another person.'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          className={confirming === 'accept' ? button : secondaryButton}
                          disabled={responding}
                          onClick={() => respond(confirming)}
                          type="button"
                        >
                          {responding ? 'Saving…' : confirming === 'accept' ? 'Yes, accept my place' : 'Yes, decline the place'}
                        </button>
                        <button className={secondaryButton} disabled={responding} onClick={() => setConfirming('')} type="button">
                          Go back
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button className={button} onClick={() => setConfirming('accept')} type="button">Accept my place</button>
                      <button className={secondaryButton} onClick={() => setConfirming('decline')} type="button">Decline</button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
              <p>Keep this link private. Anyone with it can open this page.</p>
              <Link className="font-bold text-brand no-underline hover:underline" to="/contact">Need help? Contact us</Link>
            </div>
          </>
        ) : null}
      </main>
    </PageFrame>
  )
}

// Keying the inner page by token resets loading/data when someone opens a
// different private link without a full page reload.
export default function Status() {
  const { token } = useParams()
  return <StatusPage key={token} token={token} />
}
