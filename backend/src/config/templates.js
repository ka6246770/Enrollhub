// The message texts the site sends.
//
// This file holds the DEFAULTS. The live values are stored in the
// `message_templates` table and edited from the dashboard's Messages page, so
// the owner can change a text without a developer or a restart:
//
//   services/messageTemplates.js  reads/writes the table, falls back to here
//   db/seed.js                    copies these defaults into the table once
//
// Each definition lists the variables the text may use (`variables`) and the
// ones it must keep (`required`), so an edit cannot silently break a message.
// Source texts live in enrollhub-content.md (sections 5 and 6); the
// [square-bracket] placeholders still need real values before launch.

export const templateDefinitions = [
  {
    key: 'customerConfirmation',
    label: 'Customer confirmation',
    channel: 'email', where: 'Sent as soon as a registration arrives',
    required: ['name', 'offer'],
    variables: ['name', 'offer'],
    body: 'Hi {name}, thanks for applying for {offer}. We will contact you about the next step.',
  },
  {
    key: 'contacted',
    label: 'Application review email',
    channel: 'email', where: 'Sent when you mark an application as contacted or under review',
    required: ['name', 'offer'],
    variables: ['name', 'offer'],
    body: 'Hi {name}, we have started reviewing your application for {offer}. If we need anything else, we will contact you on WhatsApp.',
  },
  {
    key: 'offered',
    label: 'Place offered email',
    channel: 'email', where: 'Sent when you offer a place; the applicant must accept the private link',
    required: ['name', 'offer'],
    variables: ['name', 'offer'],
    body: 'Hi {name}, a place has opened for {offer}. Your place is not confirmed until you open your private link and accept it. If you do not accept, we may offer the place to someone else.',
  },
  {
    key: 'accepted',
    label: 'Acceptance email',
    channel: 'email', where: 'Sent when the applicant accepts a place',
    required: ['name', 'offer'],
    variables: ['name', 'offer'],
    body: 'Hi {name}, good news — your place on {offer} is confirmed. We will send the schedule and joining details shortly.',
  },
  {
    key: 'rejected',
    label: 'Rejection email',
    channel: 'email', where: 'Sent when you mark an application as not selected',
    required: ['name', 'offer'],
    variables: ['name', 'offer'],
    body: 'Hi {name}, thank you for applying for {offer}. We could not offer you a place this time. Reply to this message if you would like to be considered for the next round.',
  },
  {
    key: 'waitlistOffer',
    label: 'Waitlist place offered email',
    channel: 'email', where: 'Sent when a place opens and you offer it to a waitlist contact',
    required: ['name', 'offer'],
    variables: ['name', 'offer'],
    body: 'Hi {name}, a place has opened for {offer}. Open your private link to accept it. We cannot confirm the place until you accept.',
  },
  {
    key: 'waitlist',
    label: 'Waitlist email',
    channel: 'email', where: 'Sent to someone who joins a waitlist and leaves an email address',
    required: ['name', 'offer'],
    variables: ['name', 'offer', 'phone'],
    body: 'Hi {name}, you are on the waitlist for {offer}. We will message you if a place opens up.',
  },
  {
    key: 'ownerRegistration',
    label: 'Owner alert',
    channel: 'telegram', where: 'The registration you review, with Offer place / Not selected buttons',
    required: ['name', 'offer'],
    variables: ['name', 'offer', 'age', 'residence', 'email', 'phone'],
    body: [
      'New application',
      'Offer: {offer}',
      'Name: {name}',
      'Age: {age}',
      'City: {residence}',
      'Email: {email}',
      'Phone: {phone}',
    ].join('\n'),
  },
  {
    key: 'secondPerson',
    label: 'Second person alert',
    channel: 'telegram', where: 'Sent to TELEGRAM_SECOND_CHAT_ID with the voice file attached',
    required: ['name', 'offer'],
    variables: ['name', 'offer', 'age', 'residence', 'email', 'phone'],
    body: [
      'New application: {name}',
      'Offer: {offer}',
      'Age: {age}',
      'City: {residence}',
      'Email: {email} | WhatsApp: {phone}',
      'Voice recording: attached',
      'Please review and contact the applicant as soon as possible.',
    ].join('\n'),
  },
  {
    key: 'ownerWaitlist',
    label: 'Waitlist alert',
    channel: 'telegram', where: 'Sent when someone joins a waitlist',
    required: ['name', 'phone'],
    variables: ['name', 'offer', 'phone'],
    body: ['New waitlist sign-up', 'Offer: {offer}', 'Name: {name}', 'Phone: {phone}'].join('\n'),
  },
  {
    key: 'contactMessage',
    label: 'Contact message alert',
    channel: 'telegram', where: 'Sent from the contact form',
    required: ['name', 'message'],
    variables: ['type', 'name', 'email', 'message', 'pageUrl', 'time'],
    body: [
      'New contact {type} — {name}',
      'Email: {email}',
      'Page: {pageUrl}',
      'Time: {time}',
      '',
      '{message}',
    ].join('\n'),
  },
  {
    key: 'contactReport',
    label: 'Contact report email',
    channel: 'email', where: 'Sent to the owner when a problem, comment or question arrives',
    required: ['type', 'name', 'message'],
    variables: ['type', 'name', 'email', 'message', 'pageUrl', 'time'],
    body: [
      'Type: {type}',
      'Name: {name}',
      'Email: {email}',
      'Page: {pageUrl}',
      'Time: {time}',
      '',
      '{message}',
    ].join('\n'),
  },
]

// Key → default body, kept for callers that only need the texts.
export const templates = Object.fromEntries(
  templateDefinitions.map((definition) => [definition.key, definition.body]),
)

// Replaces {name}-style tokens. Unknown tokens are left untouched so a missing
// value is obvious in the sent message.
export function render(template, vars = {}) {
  return template.replace(/\{(\w+)\}/g, (match, key) => (
    vars[key] === undefined || vars[key] === null || vars[key] === '' ? match : String(vars[key])
  ))
}
