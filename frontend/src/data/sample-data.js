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

// GEO: the questions below use the wording people actually type into search
// and AI assistants. Every answer contains a verifiable fact: a pay range, a
// location, an age limit, a document, a shift length or a process step. Avoid
// "great opportunity" style copy here; it gives answer engines nothing to cite.
export const faq = [
  {
    question: 'How do I apply for an Al-Tayeb factory job?',
    answer:
      'Choose a job on the offers page, enter your name, age, city, phone and email, then record a voice note of one to two minutes. The form takes about three minutes. You will see a confirmation receipt immediately, and Al-Tayeb will reply on WhatsApp to the number you provided.',
  },
  {
    question: 'Who is eligible for Al-Tayeb factory jobs?',
    answer:
      'The current roles are for Egyptian men aged 18 to 50. A National ID card is the only document required, and no previous factory experience is needed. Each job page lists any additional requirement, such as a haircut and neatly trimmed beard before the first shift.',
  },
  {
    question: 'What should I say in the voice note?',
    answer:
      'Give your full name and age, the city or governorate you live in, any factory, warehouse or packaging work you have done, when you can start, and whether you need housing. Speak clearly in a quiet place. One to two minutes is enough; the file can be MP3, M4A or WAV up to 10 MB.',
  },
  {
    question: 'How much do Al-Tayeb factory jobs pay in Egypt?',
    answer:
      'Advertised monthly pay ranges from 6,600 to 11,400 EGP before bonuses or incentives. Packaging and labeling in Sadat City pays 9,000 EGP plus a 2,000 EGP bonus after 30 days. Packaging and wrapping roles pay 9,600 to 11,400 EGP depending on the factory. The El-Obour steward role pays 11,000 EGP, and the 10th of Ramadan packaging role pays 6,600 to 8,400 EGP.',
  },
  {
    question: 'Where are the Al-Tayeb jobs located?',
    answer:
      'The current factory jobs are in Sadat City in Menoufia, El-Obour in Qalyubia, and 10th of Ramadan City in Sharqia. Each job page names the city and the shift. Housing is available for workers relocating from another area.',
  },
  {
    question: 'What shifts are available at Al-Tayeb factories?',
    answer:
      'Most roles use 12-hour factory shifts. Some include a one-hour break. The 10th of Ramadan packaging job offers a choice of an 8-hour shift at 6,600 EGP or a 12-hour shift at 8,400 EGP per month. The exact shift and break are listed on each job page.',
  },
  {
    question: 'Is housing really included with Al-Tayeb jobs?',
    answer:
      'Yes. Housing is included for workers who relocate. Depending on the factory, the room includes mattresses, water heaters, bathtubs and security cameras, and transport may run between the accommodation and the factory. Each job page lists the exact housing and transport package.',
  },
  {
    question: 'What documents do I need to apply?',
    answer:
      'A valid Egyptian National ID card is the only document required. You do not need a CV or previous factory experience. The application form asks for your name, age, city, phone number, email and a short voice note.',
  },
  {
    question: 'What if the Al-Tayeb job I want is full?',
    answer:
      'Join the waitlist on the job page. If a place opens, Al-Tayeb will contact you on WhatsApp at the number you provide. You can apply for another open job at the same time.',
  },
  {
    question: 'When will Al-Tayeb reply to my application?',
    answer:
      'Al-Tayeb reviews applications in the order they arrive and replies on WhatsApp to the number provided. Response time depends on the number of applications and the hiring factory. Keep your phone switched on and make sure the WhatsApp number you entered is correct.',
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
  ['We call you on WhatsApp', 'We review every application and reply on WhatsApp to the number you gave us.'],
]
