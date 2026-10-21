import PageFrame from '../components/PageFrame.jsx'
import { container } from '../lib/ui.js'

const SECTIONS = [
  ['What we collect', 'We collect your name, age, city or governorate, email address, WhatsApp number, the voice recording you upload, and the job you applied for.'],
  ['Why we collect it', 'We use your information to review your application, contact you about the job, arrange housing where it is offered, and keep a record of the hiring process.'],
  ['Who can access it', 'Only the Al-Tayeb Company team that reviews applications, and the service providers we use to run the website, email and messaging.'],
  ['How long we keep it', '[RETENTION PERIOD, e.g., 12 months] after the job closes, unless you ask us to delete it sooner.'],
  ['Your rights', 'You can ask to see, correct or delete your personal data at any time by contacting [SUPPORT EMAIL]. You can also withdraw your consent at any time.'],
  ['Security and contact', 'We use [SECURITY MEASURES, e.g., encrypted connections and access controls] to protect your information. Contact [SUPPORT EMAIL] | [WHATSAPP NUMBER] | [BUSINESS ADDRESS].'],
]

export default function Privacy() {
  return (
    <PageFrame>
      <main className={`${container} max-w-[760px] pb-14 pt-12`} id="main-content">
        <p className="mono-label text-accent">Legal</p>
        <h1 className="mt-3 text-balance text-[clamp(32px,4.5vw,44px)] font-extrabold leading-[1.02] tracking-[-0.035em]">Privacy policy</h1>
        <p className="mt-3 max-w-[56ch] text-[14px] leading-relaxed text-muted">
          Draft — this policy must be reviewed by a lawyer before publishing.
        </p>
        <div className="mt-8 border-t border-ink/15">
          {SECTIONS.map(([title, text]) => (
            <section className="border-b border-ink/15 py-5" key={title}>
              <h2 className="text-[15px] font-bold">{title}</h2>
              <p className="mt-2 max-w-[66ch] text-[14px] leading-[1.75] text-muted">{text}</p>
            </section>
          ))}
        </div>
        <p className="mt-5 text-[11px] text-muted">Last updated: [DATE]</p>
      </main>
    </PageFrame>
  )
}
