// Thin API layer for EnrollHub.
//
// With no VITE_API_URL set (see .env.example) every helper resolves against the
// local sample data and keeps its own in-memory copy, so the whole site —
// including the dashboard — can be previewed without a backend. Once
// VITE_API_URL points at the EnrollHub API (for example
// http://localhost:3001/api) all calls go to the real server.
//
// The request shapes below are the contract implemented in backend/src/routes.

import { offers } from '../data/offers.js'
import { messages as sampleMessages, users as sampleUsers } from '../data/sample-data.js'

const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
const hasBackend = Boolean(API_URL)

export const isBackendEnabled = hasBackend

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

// --- Offline demo state ----------------------------------------------------
// Mutated by the write helpers so the dashboard behaves normally without a
// backend. Replaced entirely as soon as VITE_API_URL is set.

let demoOffers = offers.map((offer) => ({
  id: offer.id,
  slug: offer.slug,
  title: offer.title,
  location: offer.location,
  description: offer.description,
  shortDescription: offer.shortDescription,
  price: offer.price,
  duration: offer.duration,
  included: offer.included,
  seatsTotal: offer.seats_total,
  seatsTaken: offer.seats_taken,
  closesAt: offer.closes_at,
  status: offer.status,
  waitlistCount: 0,
}))

let demoRegistrations = sampleUsers.map((person) => ({
  id: person.id,
  offerId: person.offerId,
  offerSlug: offers.find((offer) => offer.id === person.offerId)?.slug ?? `offer-${person.offerId}`,
  name: person.name,
  age: person.age,
  residence: person.residence,
  email: person.email,
  phone: person.phone,
  voiceUrl: null,
  status: person.status,
  notes: null,
  whatsappConfirmed: person.whatsappConfirmed,
  createdAt: person.createdAt,
}))

let demoMessages = sampleMessages.map((message) => ({
  id: message.id,
  registrationId: null,
  registrationName: message.recipient,
  channel: 'whatsapp',
  type: message.message,
  recipient: message.recipient,
  status: message.status.toLowerCase(),
  error: null,
  createdAt: null,
  time: message.time,
}))

// --- Reads -----------------------------------------------------------------

export async function fetchOffers() {
  return hasBackend ? request('/offers') : demoOffers
}

export async function fetchRegistrations(params) {
  return hasBackend ? request(`/registrations${toQuery(params)}`) : demoRegistrations
}

export async function fetchMessages(params) {
  return hasBackend ? request(`/messages${toQuery(params)}`) : demoMessages
}

// Which notification channels are configured, plus the message texts.
//
// The live texts come from the API. The offline preview mirrors
// backend/src/config/templates.js — with VITE_API_URL set, that file and the
// `message_templates` table are the source of truth.
const demoTemplateSeed = [
  {
    key: 'customerConfirmation',
    label: 'Customer confirmation',
    channel: 'email', where: 'Sent as soon as a registration arrives',
    body: 'Hi {name}, thanks for applying for {offer}. We will contact you within [X] hours.',
    variables: ['name', 'offer'],
    required: ['name', 'offer'],
  },
  {
    key: 'accepted',
    label: 'Acceptance email',
    channel: 'email', where: 'Sent when you accept a registration',
    body: 'Hi {name}, good news — your place on {offer} is confirmed. We will send the schedule and joining details shortly.',
    variables: ['name', 'offer'],
    required: ['name', 'offer'],
  },
  {
    key: 'rejected',
    label: 'Rejection email',
    channel: 'email', where: 'Sent when you reject a registration',
    body: 'Hi {name}, thank you for applying for {offer}. We could not offer you a place this time. Reply to this message if you would like to be considered for the next round.',
    variables: ['name', 'offer'],
    required: ['name', 'offer'],
  },
  {
    key: 'waitlist',
    label: 'Waitlist email',
    channel: 'email', where: 'Sent to someone who joins a waitlist and leaves an email address',
    body: 'Hi {name}, you are on the waitlist for {offer}. We will message you if a place opens up.',
    variables: ['name', 'offer', 'phone'],
    required: ['name', 'offer'],
  },
  {
    key: 'ownerRegistration',
    label: 'Owner alert',
    channel: 'telegram', where: 'The registration you review, with Accept / Reject buttons',
    body: 'New application\nOffer: {offer}\nName: {name}\nAge: {age}\nCity: {residence}\nEmail: {email}\nPhone: {phone}',
    variables: ['name', 'offer', 'age', 'residence', 'email', 'phone'],
    required: ['name', 'offer'],
  },
  {
    key: 'secondPerson',
    label: 'Second person alert',
    channel: 'telegram', where: 'Sent to TELEGRAM_SECOND_CHAT_ID with the voice file attached',
    body: 'New application: {name}\nOffer: {offer}\nAge: {age}\nCity: {residence}\nEmail: {email} | WhatsApp: {phone}\nVoice recording: attached\nPlease review and contact the applicant within [X] hours.',
    variables: ['name', 'offer', 'age', 'residence', 'email', 'phone'],
    required: ['name', 'offer'],
  },
]

const demoSample = {
  name: 'Amina',
  offer: 'Packaging & labeling',
  age: '27',
  residence: 'Tanta',
  email: 'amina@example.com',
  phone: '+20 100 000 0000',
  message: 'I would like to know more about the schedule.',
}

let demoTemplates = demoTemplateSeed.map((template) => ({ ...template, updatedAt: null }))

export async function fetchMessageStatus() {
  if (!hasBackend) {
    return {
      channels: { telegram: false, email: false },
      templates: demoTemplates,
      sample: demoSample,
    }
  }
  return request('/messages/status')
}

// Downloads a voice note. The endpoint is admin-only, so the request has to be
// made with fetch (an <audio src> would not send the session cookie reliably).
export async function fetchVoiceClip(registrationId) {
  const response = await fetch(`${API_URL}/registrations/${registrationId}/voice`, { credentials: 'include' })
  if (!response.ok) throw new Error('Could not load the recording.')
  return response.blob()
}

// --- Session ---------------------------------------------------------------

// undefined = not looked up yet, null = signed out, object = signed in.
let sessionCache

export function resetSessionCache() {
  sessionCache = undefined
}

export async function getSession({ force = false } = {}) {
  if (!hasBackend) return { demo: true }
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
  if (!hasBackend) return { ok: true, admin: { email: credentials.email } }
  const result = await request('/auth/login', { method: 'POST', body: credentials })
  sessionCache = result?.admin ?? null
  return result
}

export async function logout() {
  if (!hasBackend) return null
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
  if (hasBackend) return request('/registrations', { method: 'POST', body: payload })
  const offerSlug = payload instanceof FormData ? payload.get('offerSlug') : payload?.offerSlug
  return { ok: true, offerSlug: offerSlug ?? null }
}

export async function joinWaitlist(payload) {
  if (hasBackend) return request('/waitlist', { method: 'POST', body: payload })
  return { ok: true, offerSlug: payload?.offerSlug ?? null }
}

export async function sendContactMessage(payload) {
  if (hasBackend) return request('/messages', { method: 'POST', body: payload })
  return { ok: true }
}

export async function updateOffer(id, patch) {
  if (hasBackend) return request(`/offers/${id}`, { method: 'PATCH', body: patch })
  demoOffers = demoOffers.map((offer) => (offer.id === id ? { ...offer, ...patch } : offer))
  return demoOffers.find((offer) => offer.id === id)
}

export async function updateRegistration(id, patch) {
  if (hasBackend) return request(`/registrations/${id}`, { method: 'PATCH', body: patch })
  demoRegistrations = demoRegistrations.map((person) => (
    person.id === id
      ? { ...person, ...patch, whatsappConfirmed: ['accepted', 'contacted'].includes(patch.status) }
      : person
  ))
  return demoRegistrations.find((person) => person.id === id)
}

export async function retryMessage(id) {
  if (hasBackend) return request(`/messages/${id}/retry`, { method: 'POST' })
  demoMessages = demoMessages.map((message) => (message.id === id ? { ...message, status: 'delivered', error: null } : message))
  return { ok: true, message: 'Retry sent.' }
}

// Saves one message text. With a backend the next message uses it immediately;
// the API validates it and returns a rendered preview.
export async function saveMessageTemplate(key, body) {
  if (hasBackend) return request(`/messages/templates/${key}`, { method: 'PATCH', body: { body } })
  const value = String(body ?? '').trim()
  if (!value) throw new Error('The message cannot be empty.')
  demoTemplates = demoTemplates.map((template) => (
    template.key === key ? { ...template, body: value, updatedAt: new Date().toISOString() } : template
  ))
  return { key, body: value, updatedAt: new Date().toISOString() }
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
  fetchRegistrations,
  fetchMessages,
  fetchMessageStatus,
  fetchVoiceClip,
  getSession,
  login,
  logout,
  resetSessionCache,
  submitRegistration,
  joinWaitlist,
  sendContactMessage,
  updateOffer,
  updateRegistration,
  retryMessage,
  saveMessageTemplate,
  isBackendEnabled,
}

export default api
