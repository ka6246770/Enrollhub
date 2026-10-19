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
    body: 'Hi {name}, thanks for registering for {offer}. We will contact you within [X] hours.',
  },
  {
    key: 'accepted',
    label: 'Acceptance email',
    channel: 'email', where: 'Sent when you accept a registration',
    required: ['name', 'offer'],
    variables: ['name', 'offer'],
    body: 'Hi {name}, good news — your seat for {offer} is confirmed. We will send the schedule and joining details shortly.',
  },
  {
    key: 'rejected',
    label: 'Rejection email',
    channel: 'email', where: 'Sent when you reject a registration',
    required: ['name', 'offer'],
    variables: ['name', 'offer'],
    body: 'Hi {name}, thank you for registering for {offer}. We could not offer you a seat this time. Reply to this message if you would like to be considered for the next round.',
  },
  {
    key: 'waitlist',
    label: 'Waitlist email',
    channel: 'email', where: 'Sent to someone who joins a waitlist and leaves an email address',
    required: ['name', 'offer'],
    variables: ['name', 'offer', 'phone'],
    body: 'Hi {name}, you are on the waitlist for {offer}. We will message you if a seat opens up.',
  },
  {
    key: 'ownerRegistration',
    label: 'Owner alert',
    channel: 'telegram', where: 'The registration you review, with Accept / Reject buttons',
    required: ['name', 'offer'],
    variables: ['name', 'offer', 'age', 'language', 'level', 'residence', 'email', 'phone'],
    body: [
      'New registration',
      'Offer: {offer}',
      'Name: {name}',
      'Age: {age}',
      'Language: {language}',
      'Level: {level}',
      'Residence: {residence}',
      'Email: {email}',
      'Phone: {phone}',
    ].join('\n'),
  },
  {
    key: 'secondPerson',
    label: 'Second person alert',
    channel: 'telegram', where: 'Sent to TELEGRAM_SECOND_CHAT_ID with the voice file attached',
    required: ['name', 'offer'],
    variables: ['name', 'offer', 'age', 'language', 'level', 'residence', 'email', 'phone'],
    body: [
      'New registration: {name}',
      'Offer: {offer}',
      'Age: {age} | Language: {language} | Level: {level}',
      'Residence: {residence}',
      'Email: {email} | WhatsApp: {phone}',
      'Voice recording: attached',
      'Please review and reply to the customer within [X] hours.',
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
    variables: ['name', 'email', 'message'],
    body: 'New contact message\nFrom: {name} <{email}>\n\n{message}',
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
