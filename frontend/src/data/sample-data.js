// Sample records used only by the dashboard and a few public sections.
// Nothing here talks to a server; it exists so every screen renders with data.

export const users = [
  {
    id: 1,
    name: 'Sample Name 1',
    offerId: 1,
    age: 24,
    language: 'Arabic',
    level: 'Beginner',
    residence: 'Cairo, Egypt',
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
    language: 'English',
    level: 'Advanced',
    residence: 'Dubai, UAE',
    email: 'sample2@example.com',
    phone: '+971 50 000 0002',
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
    language: 'French',
    level: 'Intermediate',
    residence: 'Alexandria, Egypt',
    email: 'sample3@example.com',
    phone: '+20 100 000 0003',
    voiceRecording: null,
    whatsappConfirmed: false,
    status: 'accepted',
    createdAt: '2026-10-10T23:40:00',
  },
]

export const testimonials = [
  { quote: '[Testimonial placeholder. Replace with a real quote and permission to publish it.]', author: '[Name, city]' },
  { quote: '[Testimonial placeholder. Replace with a real quote and permission to publish it.]', author: '[Name, city]' },
  { quote: '[Testimonial placeholder. Replace with a real quote and permission to publish it.]', author: '[Name, city]' },
]

export const faq = [
  {
    question: 'How do I register?',
    answer:
      'Pick an offer, fill in the form, upload your voice recording, and accept the consent checkbox. You will see a confirmation page straight away.',
  },
  {
    question: 'What should I say in my voice recording?',
    answer:
      'Say your full name, why you are interested in the offer, your current level and what you hope to achieve, and anything else you would like us to know. Record for 1 to 2 minutes in a quiet place.',
  },
  {
    question: 'When will I hear back?',
    answer: 'We review every registration and reply within [X] hours on WhatsApp or by email.',
  },
  {
    question: 'Is my personal information safe?',
    answer:
      'We only use your details to review your registration and contact you about the offer. Read our Privacy Policy for more details.',
  },
  {
    question: 'What if the offer is sold out?',
    answer: 'You can join the waitlist. If a seat opens up, we will contact you on WhatsApp.',
  },
]

export const messages = [
  { id: 1, recipient: 'Sample Name 1', message: 'Customer confirmation', time: 'Oct 10, 23:40', status: 'Delivered' },
  { id: 2, recipient: 'Owner (you)', message: 'Lead forward with voice file', time: 'Oct 10, 23:40', status: 'Delivered' },
  { id: 3, recipient: 'Sample Name 3', message: 'Customer confirmation', time: 'Oct 10, 22:15', status: 'Failed' },
]

export const templates = {
  customer: 'Hi {name}, thanks for registering for {offer}. We will contact you within [X] hours.',
  forward: '[FIXED TEXT: to be written by you]',
}

export const HOW_IT_WORKS_STEPS = [
  ['Pick an offer', 'Compare the details and choose what fits you.'],
  ['Register and record', 'Fill in the form and upload a 1 to 2 minute voice note.'],
  ['Get a WhatsApp reply', 'We confirm your seat on WhatsApp within [X] hours.'],
]
