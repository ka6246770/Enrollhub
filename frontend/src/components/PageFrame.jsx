import { skipLink } from '../lib/ui.js'
import Footer from './Footer.jsx'
import Header from './Header.jsx'

// Wraps every public page with the shared header, footer, and skip link.
export function PageFrame({ children }) {
  return (
    <>
      <a className={skipLink} href="#main-content">Skip to content</a>
      <Header />
      {children}
      <Footer />
    </>
  )
}

export default PageFrame
