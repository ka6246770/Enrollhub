import PageFrame from '../components/PageFrame.jsx'
import { container } from '../lib/ui.js'

const SECTIONS = [
  ['What we collect', 'We collect your name, age, language, level, residence, email address, WhatsApp number, and the voice recording you upload with your registration.'],
  ['Why we collect it', 'We use your information to review your registration for [OFFER NAME], contact you about the offer, and manage your seat.'],
  ['Who can access it', 'Only the [BRAND NAME] team and the service providers we use to run the website, email, and messaging can access your information.'],
  ['How long we keep it', '[RETENTION PERIOD, e.g., 12 months] after the offer closes, unless you ask us to delete it sooner.'],
  ['Your rights', 'You can ask to see, correct, or delete your personal data at any time by contacting [SUPPORT EMAIL]. You can also withdraw your consent at any time.'],
  ['Security and contact', 'We use [SECURITY MEASURES, e.g., encrypted connections and access controls] to protect your information. Contact [SUPPORT EMAIL] | [WHATSAPP NUMBER] | [BUSINESS ADDRESS].'],
]

export default function Privacy() {
  return (
    <PageFrame>
      <main className={`${container} max-w-[760px] py-12`} id="main-content">
        <span className="text-[10px] font-bold uppercase tracking-widest text-mint-ink">Legal</span>
        <h1 className="mt-2 text-balance text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-3 text-sm text-muted">Draft — this policy must be reviewed by a lawyer before publishing.</p>
        <div className="mt-7 grid gap-5">
          {SECTIONS.map(([title, text]) => (
            <section className="rounded-xl border border-line bg-white p-5" key={title}>
              <h2 className="font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
            </section>
          ))}
        </div>
        <p className="mt-5 text-xs text-muted">Last updated: [DATE]</p>
      </main>
    </PageFrame>
  )
}
