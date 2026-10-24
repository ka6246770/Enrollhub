import { useCallback, useEffect, useRef, useState } from 'react'

const PREFERENCE_KEY = 'enrollhub:live-updates'

// Admins may leave a dashboard open all day, so remember their choice.
function readPreference() {
  try {
    return window.localStorage.getItem(PREFERENCE_KEY) !== 'off'
  } catch {
    return true
  }
}

function savePreference(live) {
  try {
    window.localStorage.setItem(PREFERENCE_KEY, live ? 'on' : 'off')
  } catch {
    // Private mode can block storage; the toggle still works for this visit.
  }
}

// Re-fetches dashboard data on an interval and whenever the tab regains focus,
// so new applications appear without a manual reload. Ticks only run while the
// tab is visible, and `enabled` pauses them during a dialog or a pending write.
export function useAutoRefresh(refresh, { intervalMs, enabled = true } = {}) {
  const [live, setLive] = useState(readPreference)
  const [updatedAt, setUpdatedAt] = useState(null)
  const refreshRef = useRef(refresh)
  const enabledRef = useRef(enabled)
  const liveRef = useRef(live)
  const busyRef = useRef(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    refreshRef.current = refresh
  }, [refresh])

  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  useEffect(() => {
    liveRef.current = live
  }, [live])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const renew = useCallback(async () => {
    if (busyRef.current || !enabledRef.current) return
    busyRef.current = true
    try {
      const succeeded = await refreshRef.current()
      if (succeeded && mountedRef.current) setUpdatedAt(Date.now())
    } finally {
      busyRef.current = false
    }
  }, [])

  const toggleLive = useCallback(() => {
    const next = !liveRef.current
    liveRef.current = next
    savePreference(next)
    setLive(next)
    // Resuming should show fresh data right away, not after a full interval.
    if (next) renew()
  }, [renew])

  useEffect(() => {
    if (!live || !enabled) return undefined

    // Focus and visibilitychange fire together after a tab switch; `renew`
    // ignores the second call while the first request is still in flight.
    const tick = () => {
      if (document.visibilityState === 'visible') renew()
    }

    const timer = window.setInterval(tick, intervalMs)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('focus', tick)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('focus', tick)
    }
  }, [live, enabled, intervalMs, renew])

  return { live, updatedAt, toggleLive }
}
