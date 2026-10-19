# EnrollHub — Completion Plan

A concrete, file-level plan to take EnrollHub from "finished UI + placeholder backend"
to a working, deployed product. It follows `enrollhub-project-steps.md` but is
reconciled with what has actually been built, so the folder structure and API match
the real frontend.

**Target v1 (the first working version):** a visitor registers for an offer with a
voice recording → the row is saved in the database → the owner gets the details and
the voice file on Telegram. Everything else (admin dashboard data, accept/reject
emails, WhatsApp, deployment) is layered on after that.

**Revision — 18 Oct 2026 (Phases H–J complete).** v1 is built and verified end to end
(44-case API suite, browser passes, live Telegram credentials now in `.env`). This
revision re-audited the code against **every step** in `enrollhub-project-steps.md`
and closed the two gaps that audit found — **editable message templates and the
separate second-person message** (Step 5.5/4.6, Phase H) — then ran the skill-driven
quality passes (**Phase I**) and the data-hygiene and documentation pass
(**Phase J**). Everything that can be done without accounts, content, or hosting is
now done; what is left needs the owner (see §7).

**Revision — 19 Oct 2026 (Phase K complete).** The customer emails were plain
paragraphs; they are now React Email designs adapted from React Email's own
"Barebones boxed" demo — a branded frame with the owner's editable text inside it.
The new `emails/` project renders them into `backend/src/emails/`, which the API
sends through Resend. See the folder structure in §2, decisions 13–16, and the
progress log.

---

## 1. Where the project stands

| Steps-doc phase | Status | Notes |
| --- | --- | --- |
| Phase 0 — content & accounts | **Partly done** | `enrollhub-content.md` still has every `[placeholder]`. A Resend key is in `.env` but the sending domain is not verified (`MAIL_FROM` is still Resend's shared testing address). Blocks launch, not development. |
| Phase 1 — design | **Done** | PDF design + all screens built and approved visually. |
| Phase 2 — frontend | **Done** | All pages, router, Tailwind theme, admin UI, accessibility, code-splitting, agent skills. Registration/waitlist/contact forms post to the API, and the dashboard screens read and write live data. Public offer pages now **hydrate from `GET /api/offers`** via `hooks/useOffers.js` (the static file is the instant first paint and the offline fallback), so a dashboard edit reaches visitors; a sold-out offer shows the waitlist CTA instead of the form. |
| Phase 3 — backend + Telegram | **Done** | API, schema, uploads, the Telegram notification (with Accept/Reject buttons) and the verified webhook are built and tested. A bot token is all that is missing to go live. |
| Phase 4 — accept/reject + email | **Done** | `POST /telegram/webhook` (secret-checked, idempotent, edits the message), `services/decisions.js` shared by the webhook and the dashboard, and customer confirmation/acceptance/rejection emails via Resend — now **designed HTML** (Phase K) with the editable text inside it. Logs instead of sending without a key, and Retry re-sends afterwards. |
| Phase 5 — admin dashboard | **Done** | Real login, session guard, live registrations (search, filters, CSV, Accept/Reject, voice playback), offer editing, message log with Retry, sign-out, and the message texts are now **editable** with variable chips (Phase H) so an edit is used for the next message. |
| Phase 6 — WhatsApp | **Optional / later** | Module stubbed; out of scope for v1. |
| Phase 7 — testing | **Smoke suite, 44 assertions** | `backend/test/api-smoke.sh` (`npm run test:api`) plus browser passes with `agent-browser`. No unit-test framework yet. |
| Phase 8 — deployment | **Configs ready, not hosted** | `frontend/vercel.json`, `frontend/public/_redirects`, and full steps in `docs/DEPLOYMENT.md`. Needs hosting accounts. |
| Phase 9 — launch | **Checklist ready, not launched** | `docs/LAUNCH-CHECKLIST.md` covers content, legal, integrations, security, accessibility, and the final end-to-end run. |

### Progress log

- **Phase A — done.** `backend/src/` created (ESM): `config/{env,templates}.js`,
  `db/{database,schema.sql,migrate.js,seed.js}`, `middleware/{requireAdmin,rateLimit,upload}.js`,
  `routes/{offers,registrations,messages,auth}.js`,
  `services/{telegram,email,whatsapp}.js`, `scripts/set-admin.js`.
  Six tables created and the three offers seeded. The old `server.js` / `pool.js`
  prototype and its `users` / scratch `offers` tables were removed.
- **Phase B — done.** `POST /api/registrations` accepts `multipart/form-data` with
  the `recording` file (memory storage, 10 MB, audio-only), validates every field,
  rejects duplicates within `DUPLICATE_WINDOW_HOURS`, saves the voice note to
  `uploads/`, increments `seats_taken` (flipping to `soldout` when full), and sends
  the owner the details + audio with **Accept** / **Reject** inline buttons.
  `GET /api/offers`, `POST /api/waitlist`, and `POST /api/messages` are live too.
- **Pulled forward from Phase C:** admin login (`POST /api/auth/login`,
  bcrypt + httpOnly session cookie), `requireAdmin`, and the admin read/update
  endpoints (`GET|PATCH /api/registrations`, `GET /api/registrations/:id/voice`
  behind auth, `PATCH /api/offers/:id`, `GET /api/messages`).
- **Frontend wiring (Phase B half of 2.13):** `src/services/api.js` now sends
  `FormData`, cookies, and real error messages; the registration, waitlist, and
  contact forms `await` the API, show server errors, and disable their buttons
  while sending.
- **Verified:** 20 curl cases (validation, duplicates, sold-out, auth, voice
  access control, CORS) and browser tests for registration, the duplicate error,
  the waitlist, and the contact form — all pass with no console errors.
- **Phase C (frontend) — done.** `src/services/api.js` gained session helpers
  (`login`/`logout`/`getSession` with a module cache), admin reads and writes,
  `fetchVoiceClip`, and an in-memory sample-data fallback so the dashboard still
  works with no backend. Added `hooks/useAsyncResource.js` and
  `components/admin/RequireAdmin.jsx`. `Login.jsx` posts to `/auth/login` and
  shows server errors; `AdminLayout.jsx` shows the signed-in email and a sign-out
  button; `Dashboard.jsx` renders live registrations with working
  Accept/Reject, search, filters, CSV export, real per-day/per-offer charts and
  voice playback; `Offers.jsx` reads and PATCHes offers; `Messages.jsx` reads the
  log, the channel/template status and retries. Verified with lint, build, and a
  browser pass (guard redirect → wrong password error → live dashboard → offers →
  messages → Retry → sign out).
- **Phase D (webhook + email) — done.** `POST /api/telegram/webhook` verifies
  `X-Telegram-Bot-Api-Secret-Token`, is idempotent, emails the customer, answers
  the callback, and replaces the buttons with the decision.
  `services/decisions.js` holds the accept/reject logic, used by the webhook *and*
  `PATCH /api/registrations/:id`. `scripts/set-webhook.js`
  (`npm run telegram:webhook`) registers the URL.
- **Phase E (hardening) — done.** Real Retry via `services/notifications.js`
  (rebuilds and re-sends email/Telegram entries), audio signature checks in
  `verifyAudioSignature` (MP3/WAV/M4A; a renamed text file is rejected),
  `scripts/cleanup-voice.js` + `npm run retention:voice` for personal-data
  retention, and `GET /api/messages/status` for the dashboard's channel strip.
  Session cookies are now `COOKIE_SAMESITE`-driven so cross-site deploys work.
- **Verified (D/E):** webhook accept/reject/idempotency/unknown-action and
  secret rejection (401 without the header, 200 with), retry of an email and a
  Telegram entry (202) vs an unlinked contact message (400), bogus vs real audio
  uploads, the retention job (deleted 5 files, cleared the rows), and a 33-case
  smoke suite (`npm run test:api`) that passes 33/33.
- **Phase F (deployment) — configs ready.** `frontend/vercel.json`,
  `frontend/public/_redirects`, and `docs/DEPLOYMENT.md` (database, hosting,
  persistent uploads, env table, cross-site cookie rules, webhook, cron,
  troubleshooting).
- **Phase G — checklist ready.** `docs/LAUNCH-CHECKLIST.md` lists every
  placeholder with its file, legal/consent items, integration checks, security
  tasks, accessibility passes, and the final end-to-end run.
- **Public pages wired to live offers — done.** `hooks/useOffers.js` renders the
  static offers first, then replaces them with `GET /api/offers`, converting the
  API's camelCase to the public shape in one place. Verified end to end: a real
  registration moved the public counter (6 → 5 seats left) on the offer page,
  `/offers` and the welcome page, and toggling an offer off in the dashboard made
  the public page show **Sold out** with a waitlist CTA.
- **Smoke suite hardened — done.** It now discovers an open offer instead of
  hardcoding `offer-1` (which was genuinely full → the API correctly returned
  "This offer is sold out"), treats a rate-limit 429 as an explicit skip, reports
  skips in the summary, and skips registration-dependent checks when the setup
  registration could not run. 33/33 on a fresh API; re-runs degrade to skips
  rather than false failures.
- **Webhook robustness — fixed.** `answerCallback` and `markOwnerMessageDecided`
  now never throw (matching `notifyNewRegistration`'s contract): with the real
  token in `.env` a Telegram error turned a valid button press into a 500. The
  decision is saved and acked either way; the restore-the-button cosmetics only
  log a failure.
- **Phase H (editable templates + second person) — done.** The texts moved into a
  `message_templates` table seeded from `config/templates.js` and edited from the
  dashboard; `services/messageTemplates.js` validates, caches, and falls back to
  the config file. Send paths (`email.js`, `telegram.js`, `decisions.js`,
  `notifications.js`) render at send time, so an edit applies to the next message
  without a restart — proven by logging `EDITED-MARKER` from a real accept.
  `secondPerson` (content §6) now goes to `TELEGRAM_SECOND_CHAT_ID` **with the
  voice file**, and the owner/audio/second-person sends are now independent: a
  Telegram failure for the owner no longer swallows the second person's copy.
  `GET /messages/status` returns `{key,label,channel,where,body,variables,required,
  updatedAt}` plus `sample`; `PATCH /messages/templates/:key` returns a `preview`
  rendered through the same lookup a send uses. New `README` note + 11 smoke cases
  (44 total).
- **Config warnings added.** `config/env.js` now checks that
  `TELEGRAM_BOT_TOKEN` has the shape of a BotFather token (`<bot_id>:<secret>`) and
  prints a warning at boot and from `GET /api/health` when it does not — this is
  exactly the mistake in `backend/.env` that was silently failing every alert.
- **Phase I (skill passes) — done.** `web-design-guidelines`: audited public +
  admin; fixed a dead duplicate nav item ("Settings" pointed at `/admin/messages`
  and could never highlight), added `useUnsavedChangesWarning` (beforeunload) for
  unsaved template edits, hoisted the token regexp, switched to functional
  `setState`, enlarged the variable chips to a real touch target, fixed the heading
  hierarchy (h2 → h3 channel → h4 card), and corrected the page subtitle now that
  the page has two jobs. `vercel-react-best-practices`: derived the footer note
  during render, no waterfalls (both resources load in parallel), ternaries instead
  of `&&`, and capped the unbounded registrations list at 1000 rows.
  `frontend-design`: grouped the eight texts by channel so the grid reads as two
  sets rather than a card wall; `vercel-composition-patterns`: the editor takes
  `{template, sample, onSave}` with no boolean props. Verified in the browser with
  a clean console.
- **Phase J (data + docs) — done.** Every registration in the dev database was test
  data (`smoke.*`, `tpl.*`, `live.loop.*`, `public.retest.*`, `demo1/2.*`,
  `sig.check@`, `browser.tester@`, `test.candidate@`), so the table, the message
  log, and the 15 voice files were cleared and `db:seed` restored the documented
  sample offer state (which `data/offers.js` already matched, so no drift). Final
  lint, build, 44/44 smoke suite, browser pass, and `retention:voice --dry-run`.
- **Phase K (designed emails) — done.** The customer emails were plain paragraphs;
  they are now React Email components adapted from the "Barebones boxed" demo
  (`apps/demo/emails`), wearing the site's own palette and type: a white frame, the
  message on the page colour, the `[YOUR BRAND]` wordmark, a "which message is
  this" label, a heading, one button and small print. The new `emails/` project
  renders them (`npm run export`) into `backend/src/emails/*.html`, which the API
  reads once and caches; the publish step **refuses to copy a file that lost one of
  its four placeholders**, so sample copy can never be mailed out by accident.
  `services/email.js` fills `{{body}}` (HTML-escaped, line breaks → `<br />`),
  `{{offer}}`, `{{ctaUrl}}` and `{{privacyUrl}}` — so the owner's text from the
  dashboard lands inside the design, and the two can change independently. Plain
  text still goes with every email. A missing design is not fatal: that email is
  sent as plain text and reported at boot and by `/api/health` → `emailDesigns`.
  A rejection gets a quiet, outlined button instead of a promotional filled one.
  Proven end to end by running the API with the `resend` package replaced by a
  capture harness: a real registration and a real accept each produced a payload
  with `text` **and** a 12 kB `html`, no leftover placeholders, the registrant's
  name escaped, the offer URL in the button and the privacy link in the footer.
  44/44 smoke suite still green.

### Known problems, now fixed

- `server.js` registered its route as `app.post("localhost:3001/admin/login", …)`
  (never matched) and stored the admin **password in plain text**. Both gone,
  replaced by `src/routes/auth.js` with bcrypt hashes and `scripts/set-admin.js`.
- `backend/.env` held real credentials with no ignore rule. Added `backend/.gitignore`
  and a repo-root `.gitignore`.
- `app.use(cors())` allowed every origin. CORS now allows only the origins listed
  in `FRONTEND_URL` and sends credentials for the admin session.


---

## 2. Target folder structure

### Frontend — already in place

```text
frontend/
├── public/
├── src/
│   ├── main.jsx  App.jsx  index.css
│   ├── components/{Header,OfferCard,RegistrationForm,VoiceUpload,…}.jsx
│   │   └── admin/{StatusBadge,DataTable,AdminLayout}.jsx
│   ├── pages/{Welcome,Offer,OfferWaitlist,Thanks,…}.jsx
│   │   └── admin/{Login,Dashboard,Offers,Messages}.jsx
│   ├── data/offers.js
│   ├── services/api.js
│   ├── hooks/{useDocumentTitle,useVoiceRecording}.js
│   └── lib/{ui,format}.js
├── .env.example
├── package.json
└── vite.config.js
```

### Backend — to be created

```text
backend/
├── src/
│   ├── index.js                 # express app, CORS, /api routers, error handler
│   ├── routes/
│   │   ├── registrations.js      # POST register, GET/PATCH for admin
│   │   ├── offers.js             # GET public offers, PATCH for admin
│   │   ├── messages.js           # contact message + message log
│   │   └── auth.js               # login, logout, me
│   ├── services/
│   │   ├── telegram.js           # sendMessage, sendAudio, inline buttons
│   │   ├── email.js              # Resend: confirmation, accepted, rejected
│   │   └── whatsapp.js           # (later) Cloud API
│   ├── db/
│   │   ├── database.js           # pg pool + query() helper
│   │   ├── schema.sql            # tables
│   │   └── seed.js               # 3 sample offers
│   ├── middleware/
│   │   ├── requireAdmin.js       # 401 unless a valid admin session
│   │   └── rateLimit.js          # per-IP limits
│   └── config/
│       ├── templates.js          # message/email texts with {name}/{offer}
│       └── env.js                # read + validate process.env
├── src/emails/                   # rendered email HTML, read at send time
├── uploads/                      # voice files (gitignored) — or Supabase Storage
├── .env.example
├── .env                          # never commit
└── package.json
```

### Emails — designed with React Email (added after Phase J)

```text
emails/
├── emails/
│   ├── boxed-email.tsx            # the shared frame: wordmark, card, button, small print
│   ├── theme.ts                   # colours and type, mirroring frontend/src/index.css
│   ├── theme-fonts.tsx            # the Manrope / Sora @import
│   ├── static/mic-mark.svg        # the logo, for when the site has a public URL
│   └── registration-{confirmation,accepted,rejected}.tsx, waitlist-joined.tsx
├── scripts/publish.mjs            # renders → checks tokens → copies into backend/src/emails
└── package.json                   # npm run dev | npm run export
```

Convert the backend to **ESM** (`"type": "module"`) so it matches the `import`
style used throughout the steps doc. Keep `pg` — Postgres is already wired in
`backend/.env`, so v1 continues with it rather than switching to SQLite.

---

## 3. API contract (single source of truth)

`src/services/api.js` already assumes this shape. `VITE_API_URL` points at the API
root (for example `http://localhost:3001/api`); every path below is relative to it
and the backend mounts all routers under `/api`.

### Public

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| `GET` | `/offers` | — | `Offer[]` (each with `waitlistCount`) |
| `GET` | `/offers/:slug` | — | `Offer` |
| `POST` | `/registrations` | `multipart/form-data`: `name, age, language, level, residence, email, phone, consent, offerSlug, recording` | `201 {ok:true, id}` · `400` validation/bad audio · `409` duplicate · `429` rate-limited |
| `POST` | `/waitlist` | `{name, phone, offerSlug}` | `201 {ok:true}` |
| `POST` | `/messages` | `{name, email, message}` | `201 {ok:true}` |

### Admin (requireAdmin)

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| `POST` | `/auth/login` | `{email, password}` | `200 {ok:true, admin:{email}}` + httpOnly session cookie |
| `POST` | `/auth/logout` | — | `204` |
| `GET` | `/auth/me` | — | `200 {email}` · `401` |
| `GET` | `/registrations?status=&offer=&q=` | — | `Registration[]`, newest first, capped at 1000 rows (includes `voiceUrl`, never the password) |
| `PATCH` | `/registrations/:id` | `{status, notes?}` | `200 Registration`; accept/reject also emails the customer |
| `GET` | `/registrations/:id/voice` | — | audio stream (`401` without a session) |
| `GET` | `/offers` (admin view) | — | `Offer[]` |
| `PATCH` | `/offers/:id` | `{title, price, seatsTotal, status, closesAt}` | `200 Offer` |
| `GET` | `/messages?status=` | — | `MessageLogEntry[]` |
| `GET` | `/messages/status` | — | `{channels:{telegram,email}, templates:[{key,label,channel,where,body,variables,required,updatedAt}], sample}` — `updatedAt` is null until the owner edits the text |
| `PATCH` | `/messages/templates/:key` | `{body}` | `200 {key,body,preview,updatedAt}` (preview rendered through the send path) · `400` empty/over 4000/unknown variable/missing required · `404` unknown key · `401` no session |
| `POST` | `/messages/:id/retry` | — | `202` (re-sends email/Telegram; `400` when not retryable) |

### Telegram

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/telegram/webhook` | Receives Accept/Reject button presses; verifies the secret token |

`Offer` shape: `{id, slug, title, description, shortDescription, price, duration,
included[], seatsTotal, seatsTaken, closesAt, status}`.
`Registration` shape: `{id, offerSlug, name, age, language, level, residence, email,
phone, voiceUrl, status, whatsappConfirmed, createdAt}`.

### Database tables

`offers`, `registrations`, `waitlist`, `contact_messages`, `messages_log`, `admins`,
`message_templates` (Phase H). Full columns are in Phase A.

---

## 4. Phased plan

### Step-by-step audit (every step in `enrollhub-project-steps.md`)

Legend: **done** · **done, hardened** · **gap → phase** · **owner's job** (needs accounts/content/hosting).

| Step | What the guide asks | State |
| --- | --- | --- |
| 0.1–0.2 | Tools installed; Telegram/Resend accounts | tools done · **owner's job** (accounts) |
| 0.3–0.4 | Real content in `enrollhub-content.md` | **owner's job** (placeholders remain) |
| 0.5 | Lawyer reviews privacy + consent | **owner's job** |
| 1.1–1.2 | Design screens; decide what is interactive | done |
| 2.1–2.4 | Vite + Router + Tailwind + fonts + routes | done |
| 2.5 | Offers data file | done (now the offline fallback) |
| 2.6–2.12 | Header, Welcome, Thanks, Login, Offer, sold-out waitlist, routes | done (sold-out offer links to the waitlist page) |
| 2.13 | Connect the form to the backend | done |
| 3.1 | Backend project | done (ESM `src/`) |
| 3.2–3.4 | Telegram bot, chat id, `.env` | code done · token now present · **owner's job** to verify |
| 3.5–3.6 | Registration endpoint + test | done |
| 3.7 | Database | done (PostgreSQL, 7 tables) |
| 3.8 | Duplicate registrations | done (6-hour window, per offer) |
| 3.9 | Spam protection | rate limits done · Turnstile **optional**, documented |
| 4.1 | Resend | code done + logs `skipped` · **owner's job** (key + domain) |
| 4.2–4.3 | Accept/Reject buttons + webhook | done (secret-checked, idempotent, message edited) |
| 4.4 | Email templates from §5 | done, and **editable** from the dashboard (Phase H) |
| 4.5 | Customer confirmation | done |
| 4.6 | Message to the second person **with the voice file** | done: its own §6 text plus the audio, sent independently of the owner's copy (Phase H) |
| 5.1–5.2 | Admin API + protection | done (401 without a session) |
| 5.3 | Dashboard page | done |
| 5.4 | Manage offers ("updates the offer on the website") | done (public pages hydrate) |
| 5.5 | Messages page: **editable** templates + variable chips + log/Retry | done: editors with variable chips, sample preview, inline validation, log + Retry (Phases H/I) |
| 5.6 | Real login + attempt limit | done |
| 5.7 | Dashboard on real data | done |
| 6.1–6.5 | WhatsApp | out of scope for v1 (stubbed) |
| 7.1–7.3 | Test customer flow, admin flow, browsers/devices | API suite + Chromium browser passes done · cross-device **owner's job** |
| 8.1–8.6 | Deploy, domain, webhook, backups | configs + `docs/DEPLOYMENT.md` ready · **owner's job** |
| 9.1–9.4 | Launch checklist, launch, watch, maintain | `docs/LAUNCH-CHECKLIST.md` ready · **owner's job** |

**The audit found exactly two code gaps** — both in Step 5.5/4.6, and both closed in
Phase H. Everything else is either already done or needs something only the owner
can supply.

### Phase A — Backend foundation  *(no credentials needed — can start now)*

1. Create `backend/src/` with the structure above; set `"type": "module"`, add
   scripts: `dev` (nodemon), `start`, `db:migrate`, `db:seed`.
2. Add deps: `multer`, `bcryptjs`, `express-session` (or `cookie-parser`),
   `express-rate-limit`, `resend`, `zod` (validation).
3. `src/db/database.js`: export a `pg.Pool` + a small `query()` wrapper.
4. `src/db/schema.sql` + migrate runner — create the six tables and indexes
   (`registrations(offer_id)`, `registrations(email, phone, created_at)`).
5. `src/db/seed.js`: insert the three offers from `frontend/src/data/offers.js`.
6. `src/config/env.js`: read and validate required variables at boot.
7. `src/config/templates.js`: move the texts from `enrollhub-content.md` §5–6 here
   with `{name}` / `{offer}` placeholders.
8. `src/index.js`: CORS locked to `FRONTEND_URL`, `express.json()`, mount routers
   under `/api`, `GET /api/health`, central error handler.
9. Delete `server.js`/`pool.js` (superseded); add `.gitignore` (backend + root) and
   `backend/.env.example`.

**Done when:** `npm run dev` boots, `GET /api/health` returns 200, `npm run
db:migrate && npm run db:seed` creates the tables and 3 offers.

### Phase B — Registration flow + Telegram  *(the first working version)*

1. `services/telegram.js`: `sendMessage`, `sendAudio`, and
   `sendRegistration(reg)` that sends the details plus the voice file with
   **Accept**/**Reject** inline buttons carrying only the registration id.
2. `routes/registrations.js`:
   - `multer` memory storage, 10 MB limit, audio MIME filter.
   - Validate required fields, consent, and the voice file (Zod).
   - Duplicate guard: same email or phone for the same offer within N hours → 409.
   - Insert the row, write the voice file to `uploads/`, push to Telegram, log to
     `messages_log`, return `201`.
3. `routes/offers.js`: public `GET /offers`, `GET /offers/:slug` from the DB.
4. `routes/messages.js`: `POST /messages` (contact) → notify owner.
5. `POST /waitlist` and the sold-out seat logic (status flips when
   `seats_taken >= seats_total`).
6. Frontend: set `VITE_API_URL`; make `RegistrationForm` send the **full**
   `FormData` including the `recording` file; surface API errors in the UI.

**Done when:** a submission from the running site writes a row, stores the file, and
delivers the details + audio to Telegram.

### Phase C — Admin API + real login

1. `routes/auth.js`: `POST /login` (bcrypt hash compare), session cookie,
   `POST /logout`, `GET /me`; log attempts and rate-limit to slow guessing.
2. `middleware/requireAdmin.js` guards every admin route; unauthenticated → 401.
3. Admin endpoints for registrations, offers, and the message log (table in §3).
4. Frontend: point the dashboard at the API, add logout, and guard `/admin/*`
   routes so a signed-out visitor is redirected to `/admin/login`.

**Done when:** the dashboard shows real rows, and `/api/registrations` without a
session returns 401.

### Phase D — Accept / Reject + email

1. `POST /telegram/webhook`: verify the secret token, handle `callback_query`.
2. Handler: look up the registration, if `status === 'new'` set accepted/rejected,
   send the matching email, edit the Telegram message to show the final status, and
   answer the callback. A second press is a no-op (idempotent).
3. `services/email.js` (Resend): confirmation-on-registration, accepted, rejected,
   and waitlist emails using `config/templates.js`.
4. Forward every new registration to the second person (extra chat id or a group).

**Done when:** pressing **Accept** updates the row, emails the customer, and edits
the message; pressing it twice changes nothing.

### Phase E — Hardening

- `rateLimit.js`: per-IP limits on register/waitlist/contact/login.
- Stronger upload checks (magic-byte sniffing), body-size limits, security headers.
- Data retention job for voice files and personal data (see privacy policy).
- Optional Cloudflare Turnstile on the forms if spam appears.
- Backend tests (supertest) for validation, duplicates, auth, and the webhook.

### Phase F — Deployment

1. Frontend → Vercel/Netlify with SPA rewrites
   (`vercel.json` or `public/_redirects`).
2. Backend → Render/Railway with env vars and a persistent disk (or Supabase
   Storage) for `uploads/`.
3. Point `VITE_API_URL` at the backend URL; set `FRONTEND_URL` to the live site.
4. Register the Telegram webhook against the live backend URL; verify HTTPS.

### Phase G — Content, legal, launch

1. Replace every `[placeholder]` in `enrollhub-content.md` and in the app.
2. Lawyer reviews the privacy policy + consent text (Phase 0).
3. Work the launch checklist (`enrollhub-project-steps.md` §9.1), then launch to a
   small group and watch the message log for a week.

### Phase H — Editable templates + the second-person message  *(done)*

**Done when:** editing a template in the dashboard changes the **next** message
(email or Telegram), and the second person receives the §6 message **with the voice
file**. ✅ Both hold — an accept email logged the edited marker text, and the
second-person send is logged separately from the owner's.

1. **Table.** `message_templates(key text primary key, body text not null,
   updated_at timestamptz)`. `updated_at` is deliberately nullable: a seeded row
   means "not edited yet" in the dashboard, instead of claiming a save that never
   happened. `schema.sql` carries the `CREATE` plus idempotent `ALTER`s for existing
   databases; `db/seed.js` inserts all eight texts from `config/templates.js` with
   `ON CONFLICT (key) DO NOTHING`, so re-seeding never wipes an edit.
2. **A real second-person template.** `secondPerson` (content §6) goes to
   `TELEGRAM_SECOND_CHAT_ID` **and** the audio goes to that chat too. The owner
   text, the owner audio, and the second-person message are now attempted
   independently, so a Telegram failure for the owner no longer swallows the second
   person's copy; every send is logged on its own (`second_person`,
   `second_person_voice`).
3. **Service.** `src/services/messageTemplates.js`: `listTemplates()`,
   `getTemplateBody(key)`, `renderTemplate(key, vars)`, `saveTemplate(key, body)`,
   `seedTemplates()`. Reads the DB, falls back to `config/templates.js` when the row
   or the table is missing, and caches rows for the process lifetime;
   `saveTemplate` clears the cache so the next send picks the edit up.
   `validateTemplateBody` rejects an empty or over-4000-character body, a
   `{variable}` the template may not use, and a body that dropped a required
   variable — each with the reason the owner can act on.
4. **Render at send time.** `services/email.js`, `services/telegram.js`,
   `services/decisions.js` and `services/notifications.js` look the text up per
   send. The email helpers became async for that reason.
5. **Routes.** `GET /api/messages/status` returns
   `{channels, templates:[{key,label,channel,where,body,variables,required,updatedAt}], sample}`.
   `PATCH /api/messages/templates/:key` (admin) stores the edit and returns
   `{key,body,preview,updatedAt}`, where `preview` is rendered through the same
   lookup a real send uses — so a green response proves the edit is live rather than
   merely stored.
6. **Frontend.** `components/admin/TemplateEditor.jsx` (new): one editor per text
   with variable chips that insert at the caret, a sample-value preview, a labelled
   textarea, dirty tracking, Save → "Saved. The next message will use this text.",
   the server's validation message shown in place, and a `beforeunload` warning for
   unsaved edits. `Messages.jsx` groups the eight editors by channel ("Email to
   customers" / "Telegram alerts to you") so the grid reads as two sets. The log,
   Retry, and channel strip stay.
7. **Tests.** Eleven smoke cases: the list has eight texts; `PATCH` without a
   session → 401; unknown key → 404; a disallowed variable, a lost required
   variable, and an empty body → 400; a valid edit → 200 with the stored body and a
   rendered preview; then the default is restored so the dev database is unchanged.

### Phase I — Skill-driven quality passes  *(done)*

Review passes with the project's installed skills; fix what they find. No new
features. Findings and fixes:

1. **`web-design-guidelines`** — public and admin pages audited. Fixed: the shared
   nav had a duplicate "Settings" item pointing at `/admin/messages` that could
   never highlight (removed, along with its now-unused icon path); unsaved template
   edits now warn on unload; the variable chips were below the 24 px target
   minimum; the editor's heading level contradicted the new group heading
   (`h2` page → `h3` group → `h4` card); and the page subtitle only described the
   log, not the editors. Already compliant and left alone: labels on every control,
   `autocomplete` coverage, focus-visible rings, reduced-motion guards,
   `aria-live`/`role="alert"` on async results, and no `transition-all`.
2. **`vercel-react-best-practices`** — the footer note is derived during render, not
   stored; `insertVariable` uses a functional `setState`; the token regexp is
   hoisted; conditionals are ternaries; both of the page's resources load in
   parallel; admin routes stay lazily chunked; and the previously unbounded
   `GET /registrations` is capped at 1000 rows (the dashboard shows, filters and
   exports in one pass, so paging is the next step if it is ever reached).
3. **`frontend-design`** — critiqued both new screens with screenshots. The sold-out
   block was kept: it replaces the form rather than leaving a dead one, says what
   happened and what to do ("Join the waitlist and we will message you if a seat
   opens up"), and the button keeps the destination's name. The eight-text grid was
   the "card wall" tell, so the texts are grouped by channel. Nothing else was
   restyled: the design language was approved in Phase 1 and consistency wins.
4. **`vercel-composition-patterns`** — `TemplateEditor` takes
   `{template, sample, onSave}` and adds no boolean props; a channel group is
   rendered by mapping, not by a `variant` flag.
5. **`agent-browser`** — proven in the browser: 8 editors / 31 chips / 8 previews;
   a chip inserts at the caret; a disallowed variable and a lost `{name}` are refused
   with the server's message; a valid edit saves, survives a reload, and reads
   "Last saved…"; reverting clears the stale note; public offer pages show the
   sold-out CTA in place of the form. Console clean throughout.

**Done:** lint and build pass, every finding is fixed or recorded, and the browser
runs are clean.

### Phase J — Data hygiene, docs, finish  *(done)*

1. **Dev database** — every registration present was test data (`smoke.*`, `tpl.*`,
   `live.loop.*`, `public.retest.*`, `demo1/2.*`, `sig.check@`, `browser.tester@`,
   `test.candidate@`), so all rows and the 111 message-log entries were deleted, the
   15 voice files removed from `uploads/`, and `db:seed` restored the documented
   sample offer state (18/20/9 taken; offer 2 sold out). The seed header now warns
   that re-running it **overwrites** `seats_taken` and `status`, so it must not be
   run against a live database.
2. **`frontend/src/data/offers.js`** already matched the seed exactly, so the offline
   fallback and the database agree with no re-sync needed.
3. **Docs** — root `README.md`, `frontend/README.md`, `docs/DEPLOYMENT.md`,
   `docs/LAUNCH-CHECKLIST.md`: the template editor, the second-person message +
   audio, the hydrating public pages, and the changed scripts and env.
4. **Final run** — lint, build, `npm run test:api` (44/44), a browser pass over the
   public and admin pages, and `retention:voice --dry-run`.

**Done when:** a fresh clone can follow the READMEs and reach the same verified
state. ✅

### Phase K — Designed emails  *(done)*

1. **Project** — `npx create-email@latest` scaffolds `emails/` (React Email 6.11 with
   its own `node_modules`, so the frontend and backend bundles are untouched).
2. **The frame** — `emails/emails/boxed-email.tsx`, adapted from React Email's
   "Barebones boxed" demo: a white frame, the message on the site's page colour, the
   `[YOUR BRAND]` wordmark, a "which message is this" label, a heading, one button,
   and small print carrying the privacy link and the business address. `theme.ts`
   mirrors `frontend/src/index.css` (brand `#08715F`, ink `#15231F`, page `#F4F7F5`)
   and adds only the sizes and the single `mobile` variant the emails use.
3. **Four designs** — `registration-confirmation`, `registration-accepted`,
   `registration-rejected`, `waitlist-joined`. Each takes `body`/`offer`/`ctaUrl`
   defaulted to the API's placeholders, and carries `PreviewProps` so `email dev`
   shows realistic copy. The rejection uses a **quiet, outlined button**: a filled
   promotional button on a "no" reads wrong.
4. **Export** — `npm run export` renders to `out/`, then `scripts/publish.mjs`
   copies the HTML into `backend/src/emails/` and **refuses any file that lost a
   placeholder** — sample copy reaching a customer's inbox is the failure worth
   guarding against.
5. **Sending** — `services/email.js` reads the layouts once, escapes and fills
   `{{body}}` / `{{offer}}` / `{{ctaUrl}}` / `{{privacyUrl}}` / `{{siteUrl}}`, and
   sends `html` alongside the plain `text`. `offerSlug` flows through from the
   registration, the decision, and the Retry path. A missing file is not fatal: the
   email goes as plain text, with a boot warning and `/api/health` → `emailDesigns`
   saying so.
6. **Proven** — the API was run with the `resend` package swapped for a capture
   harness (no production code touched): a real registration produced `text` plus a
   12 kB `html` with no leftover placeholders and the registrant's name escaped, and
   a real accept produced the acceptance design with the offer URL in its button.
   `npm run test:api` still 44/44.

**Done when:** a registration and a decision both go out as designed HTML that
contains the owner's current text, and nothing breaks when the design files are
missing. ✅

### Later — WhatsApp (Phase 6)

Only after launch, if desired: Meta Business verification, template approval, and
`services/whatsapp.js` calling the Cloud API. Paid per message.

---

## 5. Milestones

| # | Deliverable | Phases | Status |
| --- | --- | --- | --- |
| **M1** | Registration arrives in Telegram (backend works) | A + B | **Done** (needs a bot token to go live) |
| **M2** | Real dashboard + real login | C | **Done** |
| **M3** | Accept/Reject with customer emails | D | **Done** (emails need a Resend key) |
| **M4** | Hardened, deployed, launched | E + F + G | E done · F/G ready, need accounts + content |
| **M5** | Templates editable, second person gets §6 text + audio | H | **Done** |
| **M6** | Skill-reviewed, data cleaned, docs current, final suite green | I + J | **Done** (44/44, clean console) |
| **M7** | Customer emails are designed HTML carrying the owner's text | K | **Done** |

Order taken: **A → B → C → D → E → F → G** (code complete), then **H → I → J**, then
**K** (done). WhatsApp (Phase 6) can follow launch if the owner wants it.

---

## 6. Decisions taken

1. **Database** — PostgreSQL, already wired in `backend/.env`. ✅
2. **Admin auth** — bcrypt hash + httpOnly session cookie. ✅
3. **Voice file storage** — local disk under `UPLOAD_DIR` (persistent volume on the
   host). ✅
4. **v1 notifications** — Telegram first, email layered on in Phase D. ✅
5. **Route names** — keep the built `/offers/:slug` and `/thank-you`; the backend
   matches them. ✅
6. **Message templates** — stored in the database and edited from the dashboard
   (Phase H), instead of living in code. ✅
7. **WhatsApp** — out of scope for v1. ✅
8. **A seeded text is not an edited text** — `message_templates.updated_at` stays
   null until the owner saves a change, so the dashboard never claims a save that
   did not happen. ✅
9. **Notification sends are independent** — the owner message, the owner audio, and
   the second-person copy are attempted separately, so one failure cannot silently
   drop the others. ✅
10. **Unsaved template edits** — the warning covers closing or reloading the tab.
    Blocking in-app navigation needs a router-level blocker, and this app uses
    `BrowserRouter` (declarative mode), where React Router's `useBlocker` is not
    available. Recorded rather than half-implemented. ✅
11. **Admin lists are capped** — `GET /registrations` returns the newest 1000 rows;
    the dashboard consumes the list in one pass (table, filters, CSV export), so
    paging is the honest next step if a season ever reaches that. ✅
12. **Templates are grouped by channel** in the dashboard (email to customers vs
    Telegram alerts to you) because that is how the owner thinks about them, and
    eight identical cards read as a wall. ✅
13. **Designs and copy stay separate** — the email frame (the words you cannot
    phrase differently without a developer: heading, button label, small print) is
    a React Email component; the message itself stays in the database. Editing a
    text needs no export, editing a design does (`npm run export` in `emails/`). ✅
14. **The rendered email HTML is committed** to `backend/src/emails/`, so the API
    host needs no build step and no React Email toolchain. The publish script fails
    the export if a placeholder disappears — the one failure that would otherwise
    mail the sample text to everybody. ✅
15. **No webfonts are embedded**, just one Google Fonts `@import` (the same two
    families the site loads) plus an Arial fallback. Gmail and Outlook strip
    `@import`, and the alternative — hosted font files — is a stale URL that fails
    silently. ✅
16. **The email logo stays text** until the site has a public address: an `<Img>`
    needs an absolute URL, and a broken image is worse than a wordmark. The mark is
    prepared in `emails/emails/static/` with instructions for switching. ✅

---

## 7. What is left, and who can do it

**Locally, by the agent:** nothing. Phases A–K are complete — editable templates
and the second-person message with audio, the skill-driven quality passes, the
dev-data cleanup, the designed emails, the docs, and a final green run (44/44 API
suite, a captured-email end-to-end check, browser checks of all four designs).

**Only the owner can do (blocks launch, not development):**

| Needed | Unblocks | Where |
| --- | --- | --- |
| **Fix the Telegram bot token in `backend/.env`** — the value there is truncated (no `<bot_id>:` prefix), so `getMe` returns 404 and every alert fails (logged gracefully). Paste the full token from BotFather. Then add `TELEGRAM_SECOND_CHAT_ID` for the second person | live registration alerts, Accept/Reject, the second-person message + audio | `docs/DEPLOYMENT.md`, `docs/LAUNCH-CHECKLIST.md` |
| Resend API key + a **verified domain** in `MAIL_FROM` — the current shared `onboarding@resend.dev` address only delivers to the Resend account's own inbox | confirmation / accepted / rejected emails, designed and in colour | same |
| A decision on the waitlist email: the form collects a name and phone number only, so the `waitlist` text — and its finished design — has nowhere to go. Add an optional email field (and a `waitlist.email` column) or delete that template | the waitlist confirmation email | `emails/README.md` |
| Hosting accounts + a persistent upload volume | deployment (`vercel.json`, `_redirects` are ready) | `docs/DEPLOYMENT.md` |
| Real content for every `[placeholder]` | the launch checklist | `docs/LAUNCH-CHECKLIST.md` |
| A lawyer's review of the privacy policy + consent text | legal sign-off | `docs/LAUNCH-CHECKLIST.md` |
