import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import RequireAdmin from './components/admin/RequireAdmin.jsx'
import RouteSeo from './components/RouteSeo.jsx'
import About from './pages/About.jsx'
import AllOffers from './pages/AllOffers.jsx'
import Contact from './pages/Contact.jsx'
import Faq from './pages/Faq.jsx'
import NotFound from './pages/NotFound.jsx'
import Offer from './pages/Offer.jsx'
import OfferWaitlist from './pages/OfferWaitlist.jsx'
import Privacy from './pages/Privacy.jsx'
import Terms from './pages/Terms.jsx'
import Thanks from './pages/Thanks.jsx'
import Welcome from './pages/Welcome.jsx'

// Admin screens are only needed after sign-in, so load each one on demand and
// keep them out of the public bundle.
const Login = lazy(() => import('./pages/admin/Login.jsx'))
const Dashboard = lazy(() => import('./pages/admin/Dashboard.jsx'))
const Offers = lazy(() => import('./pages/admin/Offers.jsx'))
const Waitlist = lazy(() => import('./pages/admin/Waitlist.jsx'))
const Messages = lazy(() => import('./pages/admin/Messages.jsx'))
const Status = lazy(() => import('./pages/Status.jsx'))

function RouteFallback() {
  return (
    <div aria-live="polite" className="grid min-h-screen place-items-center bg-page" role="status">
      <p className="text-xs font-bold text-muted">Loading…</p>
    </div>
  )
}

export default function App() {
  return (
    <>
      <RouteSeo />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/offers" element={<AllOffers />} />
          <Route path="/offers/:slug" element={<Offer />} />
          <Route path="/offers/:slug/waitlist" element={<OfferWaitlist />} />
          <Route path="/about" element={<About />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/thank-you" element={<Thanks />} />
          <Route path="/status/:token" element={<Status />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin" element={<RequireAdmin><Dashboard /></RequireAdmin>} />
          <Route path="/admin/dashboard" element={<RequireAdmin><Dashboard /></RequireAdmin>} />
          <Route path="/admin/registrations" element={<RequireAdmin><Dashboard section="Registrations" /></RequireAdmin>} />
          <Route path="/admin/waitlist" element={<RequireAdmin><Waitlist /></RequireAdmin>} />
          <Route path="/admin/offers" element={<RequireAdmin><Offers /></RequireAdmin>} />
          <Route path="/admin/messages" element={<RequireAdmin><Messages /></RequireAdmin>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  )
}
