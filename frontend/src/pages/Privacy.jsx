import { Link } from 'react-router-dom'
import PageFrame from '../components/PageFrame.jsx'
import { container } from '../lib/ui.js'

const SECTIONS = [
  [
    'Who we are',
    'This recruitment website is operated by Al-Tayeb Company. We use the information described here to review applications and contact people about the jobs advertised on this site.',
  ],
  [
    'What we collect',
    'When you apply, we collect your name, age, language and level, city or governorate, email address, WhatsApp number, the job you applied for, and the voice recording you upload. When you join a waitlist, we collect your name, phone number, optional email address, the job, and your consent. When you send a contact message or problem report, we collect the name, optional email, message, the page you sent it from, and your browser user-agent string.',
  ],
  [
    'Why we use it',
    'We use your information to review your application, contact you about the job, arrange housing where it is offered, manage waitlist places, answer your messages, and keep a record of the hiring process. We rely on your consent for the application, recording and waitlist contact. You can withdraw consent at any time.',
  ],
  [
    'Who can access it',
    'Only the Al-Tayeb Company team that reviews applications can access applicant details. We use service providers for website hosting, database storage, email delivery, and messaging. Recruitment alerts may be sent through Telegram. These providers process information on our instructions.',
  ],
  [
    'How long we keep it',
    'Application details are kept for up to 12 months after the job closes, unless you ask us to delete them sooner. Voice recordings are deleted after 180 days. Waitlist entries are kept for up to 12 months unless they are removed or you ask us to delete them. Contact messages are kept for up to 12 months. When you ask for deletion, we remove the application or waitlist record, the voice recording, and the related message-log entries, except where we must keep something to meet a legal obligation.',
  ],
  [
    'Your rights',
    'You can ask to see, correct or delete your personal data, withdraw your consent, or object to how we use it. Use the contact page and tell us what you need; we may ask you to verify that the request is yours. We will not ask you to send someone else’s personal data.',
  ],
  [
    'Security',
    'We use access controls, private status links, and encrypted connections where they are supported. Only authorised team members can open applicant recordings. No website or message service is completely secure, so please do not share your private status link with anyone else.',
  ],
  [
    'Changes',
    'If we change how we handle personal data, we will update this page and the date below. Material changes will be explained on the site before they take effect.',
  ],
]

export default function Privacy() {
  return (
    <PageFrame>
      <main className={`${container} motion-page max-w-[760px] pb-14 pt-12`} id="main-content">
        <p className="mono-label text-accent">Legal</p>
        <h1 className="mt-3 text-balance text-[clamp(32px,4.5vw,44px)] font-extrabold leading-[1.02] tracking-[-0.035em]">Privacy policy</h1>
        <p className="mt-3 max-w-[56ch] text-[14px] leading-relaxed text-muted">
          How Al-Tayeb Company handles application, waitlist and contact information.
        </p>
        <div className="mt-8 border-t border-ink/15">
          {SECTIONS.map(([title, text]) => (
            <section className="border-b border-ink/15 py-5" key={title}>
              <h2 className="text-[15px] font-bold">{title}</h2>
              <p className="mt-2 max-w-[66ch] text-[14px] leading-[1.75] text-muted">{text}</p>
            </section>
          ))}
        </div>
        <p className="mt-5 text-[13px] leading-relaxed text-muted">
          To exercise any of these rights, use the <Link className="font-bold text-brand underline" to="/contact">contact page</Link>.
          Choose “Question” or “Problem” and include the phone number or email address you used to apply.
        </p>
        <p className="mt-3 text-[11px] text-muted">Last updated: <time dateTime="2026-10-21">21 October 2026</time></p>
      </main>
    </PageFrame>
  )
}
