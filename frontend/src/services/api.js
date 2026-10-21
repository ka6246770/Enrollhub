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
  hasRecording: false,
  status: person.status,
  notes: null,
  followUpAt: person.status === 'new' ? '2026-10-20' : null,
  statusToken: `reg_demo_${person.id}`,
  offeredAt: person.status === 'accepted' ? person.createdAt : null,
  respondedAt: person.status === 'accepted' ? person.createdAt : null,
  whatsappConfirmed: person.whatsappConfirmed,
  createdAt: person.createdAt,
  updatedAt: person.createdAt,
}))

let demoWaitlist = [
  {
    id: 1,
    offerId: 1,
    offerSlug: offers[0].slug,
    offerTitle: offers[0].title,
    offerLocation: offers[0].location,
    name: 'Waitlist Sample 1',
    phone: '+20 100 000 0101',
    email: 'waitlist1@example.com',
    status: 'waiting',
    notes: null,
    followUpAt: null,
    placeOpenedOn: null,
    statusToken: null,
    contactedAt: null,
    offeredAt: null,
    respondedAt: null,
    createdAt: '2026-10-18T10:00:00',
    updatedAt: '2026-10-18T10:00:00',
  },
  {
    id: 2,
    offerId: 2,
    offerSlug: offers[1].slug,
    offerTitle: offers[1].title,
    offerLocation: offers[1].location,
    name: 'Waitlist Sample 2',
    phone: '+20 100 000 0102',
    email: null,
    status: 'offered',
    notes: 'Called once; prefers the 12-hour shift.',
    followUpAt: '2026-10-22',
    placeOpenedOn: '2026-10-20',
    statusToken: 'wl_demo_2',
    contactedAt: '2026-10-20T09:00:00',
    offeredAt: '2026-10-20T09:05:00',
    respondedAt: null,
    createdAt: '2026-10-17T11:30:00',
    updatedAt: '2026-10-20T09:05:00',
  },
]

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
  // The public endpoint hides archived (closed) offers, so the offline preview
  // does the same thing.
  return hasBackend ? request('/offers') : demoOffers.filter((offer) => offer.status !== 'closed')
}

export async function fetchRegistrations(params) {
  return hasBackend ? request(`/registrations${toQuery(params)}`) : demoRegistrations
}

export async function fetchWaitlist(params) {
  if (hasBackend) return request(`/waitlist${toQuery(params)}`)
  const query = String(params?.q ?? '').toLowerCase()
  return demoWaitlist.filter((entry) => {
    const matchesSearch = `${entry.name} ${entry.phone} ${entry.email ?? ''}`.toLowerCase().includes(query)
    const matchesOffer = !params?.offer || entry.offerSlug === params.offer
    const matchesStatus = !params?.status || params.status === 'All' || entry.status === params.status.toLowerCase()
    return matchesSearch && matchesOffer && matchesStatus
  })
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
    body: 'Hi {name}, thanks for applying for {offer}. We will contact you about the next step.',
    variables: ['name', 'offer'],
    required: ['name', 'offer'],
  },
  {
    key: 'contacted',
    label: 'Application review email',
    channel: 'email', where: 'Sent when you mark an application as contacted or under review',
    body: 'Hi {name}, we have started reviewing your application for {offer}. If we need anything else, we will contact you on WhatsApp.',
    variables: ['name', 'offer'],
    required: ['name', 'offer'],
  },
  {
    key: 'offered',
    label: 'Place offered email',
    channel: 'email', where: 'Sent when you offer a place; the applicant must accept the private link',
    body: 'Hi {name}, a place has opened for {offer}. Your place is not confirmed until you open your private link and accept it. If you do not accept, we may offer the place to someone else.',
    variables: ['name', 'offer'],
    required: ['name', 'offer'],
  },
  {
    key: 'accepted',
    label: 'Acceptance email',
    channel: 'email', where: 'Sent when the applicant accepts a place',
    body: 'Hi {name}, good news — your place on {offer} is confirmed. We will send the schedule and joining details shortly.',
    variables: ['name', 'offer'],
    required: ['name', 'offer'],
  },
  {
    key: 'rejected',
    label: 'Rejection email',
    channel: 'email', where: 'Sent when you mark an application as not selected',
    body: 'Hi {name}, thank you for applying for {offer}. We could not offer you a place this time. Reply to this message if you would like to be considered for the next round.',
    variables: ['name', 'offer'],
    required: ['name', 'offer'],
  },
  {
    key: 'waitlistOffer',
    label: 'Waitlist place offered email',
    channel: 'email', where: 'Sent when a place opens and you offer it to a waitlist contact',
    body: 'Hi {name}, a place has opened for {offer}. Open your private link to accept it. We cannot confirm the place until you accept.',
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
    channel: 'telegram', where: 'The registration you review, with Offer place / Not selected buttons',
    body: 'New application\nOffer: {offer}\nName: {name}\nAge: {age}\nCity: {residence}\nEmail: {email}\nPhone: {phone}',
    variables: ['name', 'offer', 'age', 'residence', 'email', 'phone'],
    required: ['name', 'offer'],
  },
  {
    key: 'secondPerson',
    label: 'Second person alert',
    channel: 'telegram', where: 'Sent to TELEGRAM_SECOND_CHAT_ID with the voice file attached',
    body: 'New application: {name}\nOffer: {offer}\nAge: {age}\nCity: {residence}\nEmail: {email} | WhatsApp: {phone}\nVoice recording: attached\nPlease review and contact the applicant as soon as possible.',
    variables: ['name', 'offer', 'age', 'residence', 'email', 'phone'],
    required: ['name', 'offer'],
  },
  {
    key: 'contactMessage',
    label: 'Contact message alert',
    channel: 'telegram', where: 'Sent from the contact form',
    body: 'New contact {type} — {name}\nEmail: {email}\nPage: {pageUrl}\nTime: {time}\n\n{message}',
    variables: ['type', 'name', 'email', 'message', 'pageUrl', 'time'],
    required: ['name', 'message'],
  },
  {
    key: 'contactReport',
    label: 'Contact report email',
    channel: 'email', where: 'Sent to the owner when a problem, comment or question arrives',
    body: 'Type: {type}\nName: {name}\nEmail: {email}\nPage: {pageUrl}\nTime: {time}\n\n{message}',
    variables: ['type', 'name', 'email', 'message', 'pageUrl', 'time'],
    required: ['type', 'name', 'message'],
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
  type: 'Problem',
  pageUrl: 'https://example.com/offers/sadat-packaging-labeling',
  time: '21 Oct 2026, 14:30 (Cairo)',
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

// Public private-link lookup. The token is the whole credential, so these calls
// deliberately send no other identifier.
export async function fetchPublicStatus(token) {
  if (hasBackend) return request(`/status/${encodeURIComponent(token)}`)
  if (token === 'reg_demo_1') {
    return {
      kind: 'registration', name: 'Sample Name 1', offerTitle: offers[0].title, offerSlug: offers[0].slug,
      offerLocation: offers[0].location, status: 'new', statusLabel: 'Received', canRespond: false,
      offeredAt: null, respondedAt: null, createdAt: '2026-10-10T23:40:00',
    }
  }
  if (token === 'wl_demo_2') {
    return {
      kind: 'waitlist', name: 'Waitlist Sample 2', offerTitle: offers[1].title, offerSlug: offers[1].slug,
      offerLocation: offers[1].location, status: 'offered', statusLabel: 'Place offered', canRespond: true,
      offeredAt: '2026-10-20T09:05:00', respondedAt: null, createdAt: '2026-10-17T11:30:00',
    }
  }
  throw Object.assign(new Error('This private link is not valid.'), { status: 404 })
}

export async function respondToStatus(token, decision) {
  if (hasBackend) return request(`/status/${encodeURIComponent(token)}/respond`, { method: 'POST', body: { decision } })
  return {
    kind: token.startsWith('wl_') ? 'waitlist' : 'registration',
    name: 'Sample applicant',
    offerTitle: offers[1].title,
    offerSlug: offers[1].slug,
    offerLocation: offers[1].location,
    status: decision === 'accept' ? 'accepted' : 'declined',
    statusLabel: decision === 'accept' ? 'Place confirmed' : 'Offer declined',
    canRespond: false,
    message: decision === 'accept'
      ? 'Your place is confirmed. We will send the schedule and joining details shortly.'
      : 'You declined the place. Thank you for letting us know.',
  }
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

function demoSlug(title) {
  const base = String(title)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'offer'

  let slug = base
  let suffix = 1
  while (demoOffers.some((offer) => offer.slug === slug)) {
    suffix += 1
    slug = `${base}-${suffix}`
  }
  return slug
}

export async function createOffer(payload) {
  if (hasBackend) return request('/offers', { method: 'POST', body: payload })
  const created = {
    id: Math.max(0, ...demoOffers.map((offer) => offer.id)) + 1,
    slug: demoSlug(payload.title),
    title: payload.title,
    description: payload.description ?? '',
    shortDescription: payload.shortDescription ?? '',
    location: payload.location ?? '',
    price: payload.price,
    duration: payload.duration,
    included: Array.isArray(payload.included) ? payload.included : [],
    seatsTotal: Number(payload.seatsTotal ?? 0),
    seatsTaken: 0,
    closesAt: payload.closesAt || null,
    status: 'active',
    waitlistCount: 0,
  }
  demoOffers = [...demoOffers, created]
  return created
}

export async function deleteOffer(id) {
  if (hasBackend) return request(`/offers/${id}`, { method: 'DELETE' })

  const offer = demoOffers.find((item) => item.id === id)
  if (!offer) throw new Error('Offer not found.')
  const hasRegistrations = demoRegistrations.some((person) => person.offerId === id)
  const hasWaitlist = (offer.waitlistCount ?? 0) > 0
  if (hasRegistrations || hasWaitlist) {
    demoOffers = demoOffers.map((item) => (item.id === id ? { ...item, status: 'closed' } : item))
    const reason = hasRegistrations ? 'it has registrations' : 'it has waitlist entries'
    return {
      id,
      deleted: false,
      archived: true,
      message: `This offer was archived instead of deleted because ${reason}. No applicant data was removed.`,
    }
  }
  demoOffers = demoOffers.filter((item) => item.id !== id)
  return { id, deleted: true, archived: false, message: 'Offer deleted.' }
}

export async function updateOffer(id, patch) {
  if (hasBackend) return request(`/offers/${id}`, { method: 'PATCH', body: patch })
  demoOffers = demoOffers.map((offer) => (offer.id === id ? { ...offer, ...patch } : offer))
  return demoOffers.find((offer) => offer.id === id)
}

export async function updateRegistration(id, patch) {
  if (hasBackend) return request(`/registrations/${id}`, { method: 'PATCH', body: patch })
  if (['accepted', 'declined'].includes(patch.status)) {
    throw new Error('A place is confirmed only after the applicant accepts their private link.')
  }

  const current = demoRegistrations.find((person) => person.id === id)
  if (!current) throw new Error('Registration not found.')

  const changed = patch.status && patch.status !== current.status
  const updated = {
    ...current,
    ...patch,
    whatsappConfirmed: ['contacted', 'offered', 'accepted'].includes(patch.status ?? current.status),
    statusToken: current.statusToken || `reg_demo_${current.id}`,
    offeredAt: patch.status === 'offered' && current.status !== 'offered'
      ? new Date().toISOString()
      : current.offeredAt,
    respondedAt: patch.status && !['accepted', 'declined'].includes(patch.status) ? null : current.respondedAt,
    updatedAt: new Date().toISOString(),
  }

  demoRegistrations = demoRegistrations.map((person) => (person.id === id ? updated : person))
  return {
    ...updated,
    changed,
    statusPath: changed && patch.status === 'offered' ? `/status/${updated.statusToken}` : null,
  }
}

export async function createRegistrationStatusLink(id) {
  if (hasBackend) return request(`/registrations/${id}/status-link`, { method: 'POST' })
  const person = demoRegistrations.find((row) => row.id === id)
  if (!person) throw new Error('Registration not found.')
  const statusToken = person.statusToken || `reg_demo_${person.id}`
  demoRegistrations = demoRegistrations.map((row) => (row.id === id ? { ...row, statusToken } : row))
  return { statusToken, statusPath: `/status/${statusToken}` }
}

export async function deleteRegistration(id) {
  if (hasBackend) return request(`/registrations/${id}`, { method: 'DELETE' })
  const person = demoRegistrations.find((row) => row.id === id)
  if (!person) throw new Error('Registration not found.')
  demoRegistrations = demoRegistrations.filter((row) => row.id !== id)
  demoOffers = demoOffers.map((offer) => (
    offer.id === person.offerId
      ? {
          ...offer,
          seatsTaken: Math.max(offer.seatsTaken - 1, 0),
          status: offer.status === 'soldout' && offer.seatsTaken - 1 < offer.seatsTotal ? 'active' : offer.status,
        }
      : offer
  ))
  return { ok: true, deleted: true, recordingRemoved: Boolean(person.hasRecording) }
}

export async function updateWaitlist(id, patch) {
  if (hasBackend) return request(`/waitlist/${id}`, { method: 'PATCH', body: patch })
  if (patch.status === 'accepted') {
    throw new Error('A waitlist place is confirmed only after the applicant accepts their private link.')
  }
  const current = demoWaitlist.find((entry) => entry.id === id)
  if (!current) throw new Error('Waitlist entry not found.')
  const updated = {
    ...current,
    ...patch,
    contactedAt: patch.status === 'contacted' ? new Date().toISOString() : current.contactedAt,
    respondedAt: patch.status === 'declined' ? new Date().toISOString() : current.respondedAt,
    updatedAt: new Date().toISOString(),
  }
  demoWaitlist = demoWaitlist.map((entry) => (entry.id === id ? updated : entry))
  return updated
}

export async function offerWaitlist(ids, placeOpenedOn) {
  if (hasBackend) return request('/waitlist/offer', { method: 'POST', body: { ids, placeOpenedOn: placeOpenedOn || undefined } })
  const results = []
  demoWaitlist = demoWaitlist.map((entry) => {
    if (!ids.includes(entry.id)) return entry
    if (['accepted', 'declined'].includes(entry.status)) {
      results.push({ id: entry.id, name: entry.name, skipped: true, reason: `Already ${entry.status}.` })
      return entry
    }
    const statusToken = entry.statusToken || `wl_demo_${entry.id}`
    results.push({
      id: entry.id,
      name: entry.name,
      email: entry.email,
      skipped: false,
      statusToken,
      statusPath: `/status/${statusToken}`,
      statusUrl: `${typeof window === 'undefined' ? '' : window.location.origin}/status/${statusToken}`,
      emailAttempted: Boolean(entry.email),
    })
    return {
      ...entry,
      status: 'offered',
      statusToken,
      offeredAt: new Date().toISOString(),
      respondedAt: null,
      placeOpenedOn: placeOpenedOn || new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString(),
    }
  })
  return { results }
}

export async function deleteWaitlistEntry(id) {
  if (hasBackend) return request(`/waitlist/${id}`, { method: 'DELETE' })
  demoWaitlist = demoWaitlist.filter((entry) => entry.id !== id)
  return { ok: true, deleted: true }
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
  fetchWaitlist,
  fetchMessages,
  fetchMessageStatus,
  fetchVoiceClip,
  fetchPublicStatus,
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
  updateWaitlist,
  offerWaitlist,
  deleteWaitlistEntry,
  retryMessage,
  saveMessageTemplate,
  isBackendEnabled,
}

export default api
