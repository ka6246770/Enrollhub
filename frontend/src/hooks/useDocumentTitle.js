import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const BRAND = '[YOUR BRAND]'

const TITLES = {
  '/': `${BRAND} | Offers`,
  '/offers': `${BRAND} | All offers`,
  '/about': `${BRAND} | How it works`,
  '/faq': `${BRAND} | Frequently asked questions`,
  '/contact': `${BRAND} | Contact`,
  '/thank-you': `${BRAND} | Registration received`,
  '/privacy': `${BRAND} | Privacy Policy`,
  '/terms': `${BRAND} | Terms of Use`,
  '/admin/login': `${BRAND} | Dashboard sign in`,
  '/admin': `${BRAND} | Dashboard`,
  '/admin/dashboard': `${BRAND} | Dashboard`,
  '/admin/registrations': `${BRAND} | Registrations`,
  '/admin/offers': `${BRAND} | Manage offers`,
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
          ? `${BRAND} | Register for an offer`
          : `${BRAND} | Page not found`)
  }, [pathname])
}
