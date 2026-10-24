// Thin API layer for EnrollHub.
//
// Every helper talks to the EnrollHub API, which reads and writes PostgreSQL.
// There is no bundled sample data, so the site never shows records that do not
// exist in the database. The request shapes below are the contract implemented
// in backend/src/routes.

// Production is served from the same origin as the API (vercel.json rewrites
// /api/* to the backend service), so /api is the fallback.
//
// The local API is configured as http://localhost:3001. Opening the site at
// 127.0.0.1 would make that call cross-site and the browser would drop the
// session cookie, so in development the API follows whichever host the page
// itself is using.
function matchPageHostInDev(url) {
  if (!import.meta.env.DEV || !url.startsWith('http://localhost')) return url
  return url.replace('://localhost', `://${window.location.hostname}`)
}

const configuredUrl = matchPageHostInDev((import.meta.env.VITE_API_URL ?? '').replace(/\/$/, ''))
const API_URL = configuredUrl || '/api'

async function request(path, { method = 'GET', body } = {}) {
  const isFormData = body instanceof FormData

  const response = await fetch(`${API_URL}${path}`, {
    method,
    // Cookies carry the admin session, so the API must be called with credentials.
    credentials: 'include',
    headers: body && !isFormData ? { 'Content-Type': 'application/json' } : undefined,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    try {
      const data = await response.json()
      if (data?.message) message = data.message
    } catch {
      // response had no JSON body; keep the generic message
    }
    const error = new Error(message)
    error.status = response.status
    throw error
  }

  return response.status === 204 ? null : response.json()
}

// --- Reads -----------------------------------------------------------------

export async function fetchOffers() {
  return request('/offers')
}

// Admin-only: archived offers stay in this list because registrations still
// point at them. Used by the dashboard so every application can name its job.
export async function fetchAllOffers() {
  return request('/offers/all')
}

export async function fetchRegistrations(params) {
  return request(`/registrations${toQuery(params)}`)
}

export async function fetchWaitlist(params) {
  return request(`/waitlist${toQuery(params)}`)
}

export async function fetchMessages(params) {
  return request(`/messages${toQuery(params)}`)
}

// Which notification channels are configured, plus the message texts. The
// texts live in the `message_templates` table; `sample` holds the values used
// for the preview on the Messages page.
export async function fetchMessageStatus() {
  return request('/messages/status')
}

// Downloads a voice note. The endpoint is admin-only, so the request has to be
// made with fetch (an <audio src> would not send the session cookie reliably).
export async function fetchVoiceClip(registrationId) {
  const response = await fetch(`${API_URL}/registrations/${registrationId}/voice`, { credentials: 'include' })
  if (!response.ok) throw new Error('Could not load the recording.')
  return response.blob()
}

// Public private-link lookup. The token is the whole credential, so these calls
// deliberately send no other identifier.
export async function fetchPublicStatus(token) {
  return request(`/status/${encodeURIComponent(token)}`)
}

// Public reference lookup. It needs both the code and the email; neither one
// alone is enough to open someone's status.
export async function lookupRegistrationStatus(payload) {
  return request('/status/lookup', { method: 'POST', body: payload })
}

export async function resendReference(email) {
  return request('/status/resend-reference', { method: 'POST', body: { email } })
}

export async function respondToStatus(token, decision) {
  return request(`/status/${encodeURIComponent(token)}/respond`, { method: 'POST', body: { decision } })
}

// --- Session ---------------------------------------------------------------

// undefined = not looked up yet, null = signed out, object = signed in.
let sessionCache

export function resetSessionCache() {
  sessionCache = undefined
}

export async function getSession({ force = false } = {}) {
  if (sessionCache !== undefined && !force) return sessionCache
  try {
    sessionCache = await request('/auth/me')
  } catch (error) {
    if (error.status === 401) sessionCache = null
    else throw error
  }
  return sessionCache
}

export async function login(credentials) {
  const result = await request('/auth/login', { method: 'POST', body: credentials })
  sessionCache = result?.admin ?? null
  return result
}

export async function logout() {
  try {
    await request('/auth/logout', { method: 'POST' })
  } finally {
    sessionCache = null
  }
  return null
}

// --- Writes ----------------------------------------------------------------

// Accepts a FormData instance (name, age, language, level, residence, email,
// phone, consent and the `recording` file) so the voice note is uploaded with
// the rest of the form.
export async function submitRegistration(payload) {
  return request('/registrations', { method: 'POST', body: payload })
}

export async function joinWaitlist(payload) {
  return request('/waitlist', { method: 'POST', body: payload })
}

export async function sendContactMessage(payload) {
  return request('/messages', { method: 'POST', body: payload })
}

export async function createOffer(payload) {
  return request('/offers', { method: 'POST', body: payload })
}

export async function deleteOffer(id) {
  return request(`/offers/${id}`, { method: 'DELETE' })
}

export async function updateOffer(id, patch) {
  return request(`/offers/${id}`, { method: 'PATCH', body: patch })
}

export async function updateRegistration(id, patch) {
  return request(`/registrations/${id}`, { method: 'PATCH', body: patch })
}

export async function createRegistrationStatusLink(id) {
  return request(`/registrations/${id}/status-link`, { method: 'POST' })
}

export async function deleteRegistration(id) {
  return request(`/registrations/${id}`, { method: 'DELETE' })
}

// --- Private registration notes (admin only) -------------------------------

export async function fetchRegistrationNotes(registrationId) {
  return request(`/admin/registrations/${registrationId}/notes`)
}

export async function createRegistrationNote(registrationId, body) {
  return request(`/admin/registrations/${registrationId}/notes`, { method: 'POST', body: { body } })
}

export async function updateRegistrationNote(noteId, body) {
  return request(`/admin/notes/${noteId}`, { method: 'PATCH', body: { body } })
}

export async function deleteRegistrationNote(noteId) {
  return request(`/admin/notes/${noteId}`, { method: 'DELETE' })
}

export async function updateWaitlist(id, patch) {
  return request(`/waitlist/${id}`, { method: 'PATCH', body: patch })
}

export async function offerWaitlist(ids, placeOpenedOn) {
  return request('/waitlist/offer', {
    method: 'POST',
    body: { ids, placeOpenedOn: placeOpenedOn || undefined },
  })
}

export async function deleteWaitlistEntry(id) {
  return request(`/waitlist/${id}`, { method: 'DELETE' })
}

export async function retryMessage(id) {
  return request(`/messages/${id}/retry`, { method: 'POST' })
}

// Saves one message text. The next message uses it immediately; the API
// validates it and returns a rendered preview.
export async function saveMessageTemplate(key, body) {
  return request(`/messages/templates/${key}`, { method: 'PATCH', body: { body } })
}

// Turns { status: 'New', q: '' } into '?status=New', dropping empty values.
function toQuery(params = {}) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === 'All') continue
    search.set(key, value)
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}

const api = {
  fetchOffers,
  fetchAllOffers,
  fetchRegistrations,
  fetchWaitlist,
  fetchMessages,
  fetchMessageStatus,
  fetchVoiceClip,
  fetchPublicStatus,
  lookupRegistrationStatus,
  resendReference,
  respondToStatus,
  getSession,
  login,
  logout,
  resetSessionCache,
  submitRegistration,
  joinWaitlist,
  sendContactMessage,
  createOffer,
  updateOffer,
  deleteOffer,
  updateRegistration,
  createRegistrationStatusLink,
  deleteRegistration,
  fetchRegistrationNotes,
  createRegistrationNote,
  updateRegistrationNote,
  deleteRegistrationNote,
  updateWaitlist,
  offerWaitlist,
  deleteWaitlistEntry,
  retryMessage,
  saveMessageTemplate,
}

export default api
