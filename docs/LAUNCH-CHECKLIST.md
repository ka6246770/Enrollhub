# Launch checklist

Everything below is content or an external account, so none of it can be filled
in from inside the codebase. Work top to bottom; each section ends with a
verifiable result.

---

## 1. Brand and copy

All visible text lives in the frontend. Replace every `[PLACEHOLDER]` (find them
all with `grep -roE '\[[A-Z][A-Z0-9 /&.-]{2,}\]' frontend/src | sort -u`).

| Placeholder | Files |
| --- | --- |
| `[YOUR BRAND]`, `[BRAND NAME]` | `components/Brand.jsx`, `components/Footer.jsx`, `components/admin/AdminLayout.jsx`, `pages/admin/Login.jsx`, `hooks/useDocumentTitle.js` |
| `[WELCOME HEADLINE]` | `pages/Welcome.jsx` |
| `[OFFER 1..3 TITLE]`, `[PRICE]`, `[DURATION]` | `data/offers.js` **and** the `offers` table (see §2) |
| `[START DATE]`, `[DATE]`, `[YEAR]` | `pages/Welcome.jsx`, `pages/Terms.jsx`, `pages/Privacy.jsx` |
| `[SUPPORT EMAIL]`, `[PHONE]`, `[WHATSAPP NUMBER]`, `[BUSINESS ADDRESS]`, `[NAME]` | `pages/Contact.jsx`, `pages/Terms.jsx`, `pages/Privacy.jsx`, `pages/admin/Login.jsx` |

- [ ] Every placeholder replaced.
- [ ] Favicon and social preview image swapped (`frontend/public/favicon.svg`, `frontend/index.html`).
- [ ] Page titles/descriptions read correctly on each route.
- [ ] Copy proof-read in the languages you actually offer.
- [ ] "Forgot password?" on the login screen points somewhere real, or is removed.

**The message texts are copy too.** They live in the database and are edited under
**Dashboard → Messages** — the confirmation, acceptance, rejection, and waitlist
emails, the alert you receive, the alert the second person receives, and so on.
Each editor shows a preview with sample values.

- [ ] `[X] hours` in the confirmation and second-person texts is the real response time.
- [ ] Every text still contains its `{name}` / `{offer}` variables (the editor refuses a save that drops one).
- [ ] The second-person text reads correctly if that person is a colleague or a group.
- [ ] The waitlist text reads well for someone who left an email address (with a phone number only, nothing is sent — the owner is still alerted).
- [ ] Send yourself one real registration and read the four messages that result.

The **frame** around those texts is separate: the headline, button label and small
print are in `emails/emails/boxed-email.tsx`, which also carries `[YOUR BRAND]`,
`[BUSINESS ADDRESS]` and `[SUPPORT EMAIL]` in its footer. Editing a design means
running `npm run export` in `emails/` and restarting the API — see
`emails/README.md`.

- [ ] Those three placeholders are replaced in the email frame and re-exported.

## 2. Offers in the database

The public offer pages paint `frontend/src/data/offers.js` first and then replace
it with `GET /offers`, so the `offers` table is the source of truth and
`data/offers.js` is the instant first paint and the offline fallback. Keep the two
roughly in agreement so a visitor on a slow connection does not see the counters
jump. The dashboard and the registration API read the same table.

- [ ] `offers` table holds the three real offers (title, description, price, duration, `included`, seats, closing date).
- [ ] `data/offers.js` matches (`backend/src/db/seed.js` seeds the same three offers).
- [ ] Do **not** run `npm run db:seed` against the live database: it overwrites `seats_taken` and `status` (see `DEPLOYMENT.md`).
- [ ] Seat limits are the real numbers.
- [ ] Offer 2 (or whichever is full) is `soldout` and shows the waitlist path.

Quick check with the API running:

```bash
curl -s http://localhost:3001/api/offers | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.table(JSON.parse(d).map(o=>({slug:o.slug,price:o.price,seats:o.seatsTaken+'/'+o.seatsTotal,status:o.status}))))"
```

## 3. Legal and consent

- [ ] Privacy policy names the data collected (name, age, language, level, residence, email, phone, **voice recording**), why, where it is stored, and how long it is kept (`VOICE_RETENTION_DAYS`, default 180 days).
- [ ] Privacy policy names every processor: Telegram, your mail provider (Resend), your host, your database host.
- [ ] Terms state that a registration is a request for a seat, not a confirmation.
- [ ] The registration form's consent checkbox links to the privacy policy, and the wording matches what is stored (`registrations.consent_at`).
- [ ] A deletion route exists for users who ask: delete the row and the file in `uploads/`.
- [ ] Cookie note: the only cookie is the admin session cookie (`enrollhub.sid`), `httpOnly`.
- [ ] Business identity (name, address, contact) present where the law requires it.

## 4. Integrations

- [ ] Telegram bot created; `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` set; boot log says `telegram : configured`.
- [ ] Webhook registered: `npm run telegram:webhook -- https://api.example.com`.
- [ ] Accept/Reject buttons work on a real registration, the customer email lands, and the buttons disappear.
- [ ] `TELEGRAM_BOT_TOKEN` is the **complete** token from BotFather — check `curl https://api.telegram.org/bot<TOKEN>/getMe` returns `"ok":true`. A truncated token returns `404 Not Found`, and every alert fails silently (logged, never shown to visitors); the boot log and `GET /api/health` now warn about it.
- [ ] `TELEGRAM_SECOND_CHAT_ID` set if a second person should see every lead, and that chat has received a test registration **with the voice note attached**.
- [ ] Resend domain verified; `MAIL_FROM` uses that domain; `RESEND_API_KEY` set; boot log says `email : configured`.
- [ ] A real confirmation email arrives (not in spam) and is readable on a phone.
- [ ] That email arrives as the **designed** message — wordmark, heading, button, small print — not as plain text (`GET /api/health` → `emailDesigns.missing` is empty; see `emails/README.md`).

## 5. Security and operations

- [ ] `SESSION_SECRET` is a long random value; `NODE_ENV=production`; `COOKIE_SAMESITE` matches the deployment (see `docs/DEPLOYMENT.md` §4).
- [ ] Admin account uses a strong password (`npm run admin:set -- email 'password'`); the dev `admin@enrollhub.local` account is deleted.
  ```sql
  DELETE FROM admins WHERE email = 'admin@enrollhub.local';
  ```
- [ ] `DATABASE_URL`, `SESSION_SECRET`, bot token, and Resend key exist only in the host's env settings — never in the repo.
- [ ] Persistent volume mounted and `UPLOAD_DIR` pointing at it; uploads survive a redeploy.
- [ ] Daily Postgres backups enabled; the volume is snapshotted.
- [ ] `npm run retention:voice` scheduled daily.
- [ ] `npm run test:api` passes against production (`API=... ADMIN_EMAIL=... ADMIN_PASSWORD=...`).

## 6. Accessibility and performance

- [ ] Lighthouse (mobile) ≥ 95 for accessibility and best practices on `/`, `/offers/offer-1`, and the registration form.
- [ ] Full keyboard pass: Tab reaches every control, focus is always visible, the skip link works, the mobile menu opens and closes with Escape.
- [ ] Screen reader pass on the registration form — labels, error announcements (`role="alert"`), and the consent checkbox.
- [ ] `prefers-reduced-motion` respected (animations off).
- [ ] Records are ≥ 60 s and ≤ 120 s, ≤ 10 MB, and the recorder works on iOS Safari and Android Chrome.
- [ ] Sold-out and duplicate paths show the friendly messages, not raw errors.

## 7. Final end-to-end run

On a phone, against production:

- [ ] Register on offer 1 with a voice note → thank-you page → email arrives → Telegram alert with audio and two buttons.
- [ ] Press **Accept** → customer receives the acceptance email → dashboard shows `accepted`.
- [ ] Press **Reject** on another registration → rejection email → dashboard shows `rejected`.
- [ ] Register the same email again → "You have already registered for this offer."
- [ ] Open the full offer → sold-out state → waitlist form **with an email address** → owner gets the waitlist alert **and** the joiner gets the waitlist confirmation email.
- [ ] Join the waitlist again **without** an email address → still accepted, owner alert only.
- [ ] Contact form → owner gets the alert; the message appears on the Messages page.
- [ ] Admin: sign in, search, filter, export CSV, change a seat limit, sign out.
- [ ] Everything above again on a 360 px-wide screen.

## 8. After launch

- [ ] Watch the Messages page daily for `failed` entries for the first week.
- [ ] Keep an eye on the API logs for 5xx responses.
- [ ] Re-run `npm run test:api` after any deploy.
- [ ] WhatsApp confirmations remain the last open item (plan Phase 6) — add it only if the volume justifies it.
