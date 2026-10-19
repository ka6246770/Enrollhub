import { useEffect } from 'react'

// Asks the browser to confirm before the page is closed or reloaded while there
// are unsaved changes.
//
// This covers closing the tab and reloading. It does not cover moving between
// pages inside the app: that needs a router-level blocker, and this app uses
// BrowserRouter (declarative mode), where React Router's `useBlocker` is not
// available. The Messages page mitigates that by saving explicitly and saying so.
export function useUnsavedChangesWarning(when) {
  useEffect(() => {
    if (!when) return undefined

    function warn(event) {
      event.preventDefault()
      // Some browsers still need returnValue set to show their own dialog.
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [when])
}

export default useUnsavedChangesWarning
