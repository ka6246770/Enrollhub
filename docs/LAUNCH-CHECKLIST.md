# Launch checklist

This checklist covers the external accounts, content decisions and operational
checks that cannot be completed from the codebase alone. The product and its
tests are in place; work top to bottom and verify each section.

---

## 1. Brand and copy

The Al-Tayeb brand, page copy and email frame are filled in. The remaining inputs
below are external details, not text placeholders:

- [ ] Confirm the legal business name, address and support contact with the owner.
      Set `VITE_SUPPORT_EMAIL`, `VITE_WHATSAPP_NUMBER` and
      `VITE_BUSINESS_ADDRESS`, or leave them blank so the site routes people to
      the contact form. Never invent contact details.
- [ ] Replace the SVG social card with a 1200×630 PNG/JPG.
- [ ] Page titles/descriptions read correctly on every public route.
- [ ] Copy proof-read in the languages actually offered.
- [ ] Decide whether to keep the sign-in help note; password reset is not built.

**The message texts are copy too.** They live in the database and are edited under
**Dashboard → Messages** — confirmation, under-review, offer, acceptance,
rejection, waitlist and the owner alerts. Each editor shows a preview with sample
values.

- [ ] The confirmation text's response-time promise matches what the team can do.
- [ ] Every text still contains its `{name}` / `{offer}` variables (the editor refuses a save that drops one).
- [ ] The second-person text reads correctly if that person is a colleague or a group.
- [ ] The waitlist text reads well for someone who left an email address; with a phone number only, the owner must copy the private WhatsApp link.
- [ ] Send yourself one real registration and read every message that results.

The **frame** around those texts is separate: the headline, button label and small
print are in `emails/emails/boxed-email.tsx`. Editing a design means running
`npm run export` in `emails/` and restarting the API — see `emails/README.md`.

- [ ] Al-Tayeb branding and footer wording are approved, re-exported, and `GET /api/health` reports `emailDesigns.missing: []`.

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

- [ ] **Outstanding:** the owner/lawyer reviews `frontend/src/pages/Privacy.jsx`,
      `frontend/src/pages/Terms.jsx` and the registration/waitlist consent wording
      before launch.
- [ ] The policy matches what is actually collected: name, age, residence, email,
      phone and **voice recording** for applications; name, phone and optional
      email for the waitlist; contact details and message for enquiries.
- [ ] The policy names every processor used in the deployment: Telegram, Resend,
      the application host and the database host.
- [ ] Terms state that an application is a request, not a confirmed place, and
      that only the applicant can accept or decline an offer through their
      private link.
- [ ] Consent checkboxes link to the privacy policy, and the wording matches what
      is stored (`registrations.consent_at` / `waitlist.consent_at`).
- [ ] Privacy deletion works: the admin action removes the application row, its
      recording and message logs, frees the seat, and invalidates its status link.
- [ ] Retention matches the policy: recordings after `VOICE_RETENTION_DAYS`
      (default 180), applications 12 months after the job closes, waitlist and
      contact data after 12 months. Schedule both retention jobs (§5).
- [ ] Cookie note: the only cookie is the admin session cookie (`enrollhub.sid`),
      `httpOnly`.
- [ ] Business identity (name, address, contact) is present where the law
      requires it. If an external value is not confirmed, the site uses the
      contact form rather than inventing details.

## 4. Integrations

- [ ] Telegram bot created; `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` set; boot log says `telegram : configured`.
- [ ] Webhook registered: `npm run telegram:webhook -- https://api.example.com`.
- [ ] Telegram **Offer place** / **Not selected** buttons work on a real registration; the applicant email lands, the applicant can accept/decline only through the private link, and the buttons disappear.
- [ ] A waitlist bulk offer sends the private acceptance link; a phone-only entry still lets the owner copy that link into WhatsApp.
- [ ] An applicant acceptance marks the dashboard `accepted`; an applicant decline marks it `declined`. An admin cannot set either state directly.
- [ ] `TELEGRAM_BOT_TOKEN` is the **complete** token from BotFather — check `curl https://api.telegram.org/bot<TOKEN>/getMe` returns `"ok":true`. A truncated token returns `404 Not Found`, and every alert fails silently (logged, never shown to visitors); the boot log and `GET /api/health` now warn about it.
- [ ] `TELEGRAM_SECOND_CHAT_ID` set if a second person should see every lead, and that chat has received a test registration **with the voice note attached**.
- [ ] Resend domain verified; `MAIL_FROM` uses that domain; `RESEND_API_KEY` set; boot log says `email : configured`.
- [ ] `OWNER_EMAIL` set to the inbox that should receive every registration's details and recording (empty = Telegram only).
- [ ] That owner copy arrives, with the voice recording attached and the "Review and decide" button opening the dashboard.
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
- [ ] `npm run retention:privacy` scheduled monthly (or more often if legal advice requires it).
- [ ] `npm run test:api` passes against production (`API=... ADMIN_EMAIL=... ADMIN_PASSWORD=...`).

## 6. Accessibility and performance

- [ ] Lighthouse (mobile) ≥ 95 for accessibility and best practices on `/`, `/offers`, and the registration form.
- [ ] Full keyboard pass: Tab reaches every control, focus is always visible, the skip link works, the mobile menu opens and closes with Escape.
- [ ] Screen reader pass on the registration form — labels, error announcements (`role="alert"`), and the consent checkbox.
- [ ] `prefers-reduced-motion` respected (animations off).
- [ ] Voice files of 60–120 s and up to 10 MB can be selected and uploaded on iOS Safari and Android Chrome; the fallback contact link is visible when upload fails.
- [ ] Sold-out and duplicate paths show the friendly messages, not raw errors.

## 7. SEO and GEO

See [`SEO-GEO.md`](SEO-GEO.md) for the implementation, content rules and
prerender guidance.

- [ ] `VITE_SITE_URL` is the production origin, with no trailing slash.
- [ ] `VITE_SAME_AS` contains only exact, verified official profiles, or is empty.
- [ ] `VITE_SUPPORT_EMAIL`, `VITE_WHATSAPP_NUMBER` and `VITE_BUSINESS_ADDRESS` are set, or intentionally omitted.
- [ ] The example origin `https://enrollhub.example.com` is gone from `frontend/index.html`, `frontend/public/robots.txt` and `frontend/public/sitemap.xml` (or the sitemap was regenerated).
- [ ] `public/og-image.svg` is replaced with a 1200×630 PNG/JPG, and `site.socialImage` points to it.
- [ ] `npm run seo:sitemap` ran after the final offers were published; `dist/sitemap.xml` and `dist/robots.txt` are present.
- [ ] `/`, `/offers`, `/about`, `/faq`, `/contact` and each live `/offers/:slug` have one H1, a direct answer, and a clean H1 → H2 → H3 outline.
- [ ] Rich Results Test passes `FAQPage` and `JobPosting`; Schema Markup Validator passes `Organization`, `WebSite`, `BreadcrumbList` and `Article`.
- [ ] `curl -s -A GPTBot https://your-domain.example/faq` and a JavaScript-disabled browser show useful page content, not an empty `#root`.
- [ ] A prerender/SSR decision is recorded. Until public routes are prerendered, non-JS AI crawlers see only the static baseline and no-JS summary.

## 8. Final end-to-end run

On a phone, against production:

- [ ] Apply on offer 1 with a voice note → thank-you page shows a private status link → confirmation email arrives → Telegram alert includes audio and offer/not-selected buttons.
- [ ] From the dashboard (or Telegram), record **Offer place** → applicant receives the offer email → dashboard shows `offered`.
- [ ] Open the applicant's private link, accept the place → acceptance email arrives → dashboard shows `accepted`.
- [ ] Record **Offer place** for another applicant, then decline from their private link → dashboard shows `declined` and no place is confirmed.
- [ ] The admin status editor never offers `accepted` or `declined` as choices.
- [ ] Apply with the same email again → "You have already registered for this offer."
- [ ] Open a full offer → waitlist form **with an email address** → owner gets the waitlist alert **and** the joiner gets the waitlist confirmation email.
- [ ] Join the waitlist again **without** an email address → still accepted, owner alert only; the dashboard offers a copyable private WhatsApp link.
- [ ] Select the waitlist entries, send a bulk place offer, and accept or decline through the returned private link.
- [ ] Delete an application from the dashboard → its row, recording, logs and seat are gone, and its private status link returns 404.
- [ ] Contact form → owner gets the alert; the message appears on the Messages page.
- [ ] Admin: sign in, search, filter by status/job/date/recording, set a follow-up date, export CSV, change a seat limit, sign out.
- [ ] Everything above again on a 390 px-wide screen with no horizontal page overflow and all admin navigation visible.

## 9. After launch

- [ ] Watch the Messages page daily for `failed` entries for the first week.
- [ ] Keep an eye on the API logs for 5xx responses.
- [ ] Re-run `npm run test:api` after any deploy.
- [ ] Automated WhatsApp Business messaging remains optional — the dashboard
      already provides copy and `wa.me` links. Add the API only if message volume
      justifies it.
