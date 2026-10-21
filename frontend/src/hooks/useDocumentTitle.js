import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const BRAND = 'Al-Tayeb'

const TITLES = {
  '/': `${BRAND} | Factory jobs with housing included`,
  '/offers': `${BRAND} | Open factory jobs`,
  '/about': `${BRAND} | How it works`,
  '/faq': `${BRAND} | Frequently asked questions`,
  '/contact': `${BRAND} | Contact`,
  '/thank-you': `${BRAND} | Application received`,
  '/privacy': `${BRAND} | Privacy policy`,
  '/terms': `${BRAND} | Terms of use`,
  '/admin/login': `${BRAND} | Dashboard sign in`,
  '/admin': `${BRAND} | Dashboard`,
  '/admin/dashboard': `${BRAND} | Dashboard`,
  '/admin/registrations': `${BRAND} | Registrations`,
  '/admin/offers': `${BRAND} | Manage jobs`,
  '/admin/messages': `${BRAND} | Messages`,
}

// Keeps document.title in sync with the current route.
export function useDocumentTitle() {
  const { pathname } = useLocation()

  useEffect(() => {
    document.title =
      TITLES[pathname] ??
      (pathname.endsWith('/waitlist')
        ? `${BRAND} | Join the waitlist`
        : pathname.startsWith('/offers/')
          ? `${BRAND} | Apply for a job`
          : `${BRAND} | Page not found`)
  }, [pathname])
}
