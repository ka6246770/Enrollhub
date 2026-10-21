// Sample records used only by the dashboard and a few public sections.
// Nothing here talks to a server; it exists so every screen renders with data.

export const users = [
  {
    id: 1,
    name: 'Sample Name 1',
    offerId: 1,
    age: 24,
    residence: 'Sadat City',
    email: 'sample1@example.com',
    phone: '+20 100 000 0001',
    voiceRecording: null,
    whatsappConfirmed: true,
    status: 'new',
    createdAt: '2026-10-10T23:40:00',
  },
  {
    id: 2,
    name: 'Sample Name 2',
    offerId: 2,
    age: 31,
    residence: 'Tanta',
    email: 'sample2@example.com',
    phone: '+20 100 000 0002',
    voiceRecording: null,
    whatsappConfirmed: true,
    status: 'contacted',
    createdAt: '2026-10-10T23:40:00',
  },
  {
    id: 3,
    name: 'Sample Name 3',
    offerId: 3,
    age: 19,
    residence: 'Alexandria',
    email: 'sample3@example.com',
    phone: '+20 100 000 0003',
    voiceRecording: null,
    whatsappConfirmed: false,
    status: 'accepted',
    createdAt: '2026-10-10T23:40:00',
  },
]

export const faq = [
  {
    question: 'How do I apply?',
    answer:
      'Pick a job, fill in your details, and add a voice note of one to two minutes. It takes about three minutes, and you will see a confirmation page straight away.',
  },
  {
    question: 'What should I say in the voice note?',
    answer:
      'Your name and age, the city you live in, any factory or warehouse work you have done, and when you can start. Say whether you need housing. One to two minutes is enough.',
  },
  {
    question: 'Who can apply?',
    answer:
      'These roles are for Egyptian men aged 18 to 50. A National ID card is the only document required.',
  },
  {
    question: 'Do I need factory experience?',
    answer:
      'None of the four jobs asks for previous experience. You need to be able to work a full factory shift.',
  },
  {
    question: 'Is housing really included?',
    answer:
      'Yes, for anyone relocating from another area. Each job lists what comes with the room: mattresses, water heaters, transport, meals and so on. Tell us where you live now and whether you need housing.',
  },
  {
    question: 'When will I hear back?',
    answer: 'We review every application and reply on WhatsApp within [X] hours. Keep your phone on.',
  },
  {
    question: 'What if the job is full?',
    answer:
      'Join the waitlist. If a place opens, we will contact you on WhatsApp — and you can apply for another open job at the same time.',
  },
]

export const messages = [
  { id: 1, recipient: 'Sample Name 1', message: 'Customer confirmation', time: 'Oct 10, 23:40', status: 'Delivered' },
  { id: 2, recipient: 'Owner (you)', message: 'Lead forward with voice file', time: 'Oct 10, 23:40', status: 'Delivered' },
  { id: 3, recipient: 'Sample Name 3', message: 'Customer confirmation', time: 'Oct 10, 22:15', status: 'Failed' },
]

export const HOW_IT_WORKS_STEPS = [
  ['Pick a job', 'Compare the city, shift and monthly pay, then open the job you want.'],
  ['Send a voice note', 'Fill in your details and record one to two minutes about yourself.'],
  ['We call you on WhatsApp', 'We review every application and reply within [X] hours.'],
]
