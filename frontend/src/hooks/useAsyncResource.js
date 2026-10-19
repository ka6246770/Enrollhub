import { useCallback, useEffect, useState } from 'react'

// Loads data when a dashboard page mounts and exposes `reload` for after a
// write. `loader` must be stable (wrap it in useCallback) so the effect does not
// re-run on every render.
export function useAsyncResource(loader) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    // No synchronous setState here: `loading` already starts true.
    Promise.resolve()
      .then(loader)
      .then((result) => {
        if (!active) return
        setData(result)
        setError('')
      })
      .catch((loadError) => {
        if (active) setError(loadError?.message || 'Something went wrong.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [loader])

  // Used after a write (for example a retry) to fetch the list again.
  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await loader())
    } catch (loadError) {
      setError(loadError?.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }, [loader])

  return { data, setData, loading, error, reload }
}
