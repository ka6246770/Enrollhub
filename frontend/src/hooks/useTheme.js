import { useCallback, useEffect, useState } from 'react'

// The inline script in index.html has already applied the saved/system theme
// before first paint. This hook only reads that decision, lets a button flip it,
// and keeps every toggle on the page in sync.
const STORAGE_KEY = 'enrollhub-theme'
const THEME_EVENT = 'enrollhub:theme'

function currentTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

function applyTheme(theme) {
  const root = document.documentElement
  root.dataset.theme = theme
  root.style.colorScheme = theme

  const themeColor = document.querySelector('meta[name="theme-color"]')
  if (themeColor) themeColor.setAttribute('content', theme === 'dark' ? '#0d1411' : '#f1efe8')

  window.dispatchEvent(new Event(THEME_EVENT))
}

export function useTheme() {
  const [theme, setTheme] = useState(currentTheme)

  useEffect(() => {
    const sync = () => setTheme(currentTheme())
    window.addEventListener(THEME_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(THEME_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const toggleTheme = useCallback(() => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark'
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Private mode can refuse storage; the theme still applies for this visit.
    }
    applyTheme(next)
  }, [])

  return { theme, toggleTheme }
}

export default useTheme
