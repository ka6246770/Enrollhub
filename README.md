# EnrollHub

A website with three offers. A visitor registers for an offer and uploads a 1–2
minute voice recording; the owner gets the details and the audio on Telegram with
Accept/Reject buttons, and the customer is emailed automatically.

- **Frontend** — React 19 + Vite + Tailwind CSS 4 (`frontend/`)
- **Backend** — Node.js + Express 5 + PostgreSQL (`backend/`)
- **Emails** — React Email designs, rendered to HTML the API sends (`emails/`)
- **Notifications** — Telegram bot + Resend email

See `enrollhub-plan.md` for the full plan and `enrollhub-project-steps.md` for the
original step-by-step guide. Copy texts live in `enrollhub-content.md`.

## What works today

- Public site: welcome, all offers, offer detail + registration form with voice
  upload, sold-out waitlist, thank-you, about, FAQ, contact, privacy, terms, 404.
- Admin dashboard wired to the API: session sign-in with a real password, live
  registrations with search/status filters/CSV export and in-page Accept/Reject,
  voice-note playback, offer editing (seats, price, status), **editable message
  texts with variable chips and a live sample preview**, the message log with
  working Retry, and sign-out.
- Backend API: offers, registrations (with voice upload), waitlist, contact
  messages, admin session auth, admin list/update endpoints, and the message log.
- Telegram notifications with Accept/Reject buttons and a verified webhook, plus
  customer confirmation/acceptance/rejection emails. A second person can receive
  every registration with its own text and the voice note attached
  (`TELEGRAM_SECOND_CHAT_ID`).
- Emails are designed messages, not plain text: a branded frame with the wordmark,
  a heading, one button and small print, with the message itself coming from the
  editable texts. Four of them: confirmation, accepted, rejected, and the waitlist
  confirmation, which goes out when a joiner leaves the optional email address.
  See `emails/README.md`.
- Hardening: duplicate guard, per-IP rate limits, audio signature checks,
  admin-only voice downloads, and a voice-retention job.
- Every outbound notification is recorded. When Telegram or email are not
  configured, the payload is logged and the entry is stored as `skipped`, and
  Retry resends it once the keys are in place.
- Message texts live in the database and are edited from **Dashboard → Messages**;
  a saved text is used by the very next message, with no restart. Re-running
  `db:seed` never overwrites an edit.

Not built yet: WhatsApp confirmations (plan Phase 6), and the deployment itself
(configs and steps are ready in `docs/DEPLOYMENT.md`).

## Run it

### 1. Backend

```sh
cd backend
npm install
cp .env.example .env          # then fill in DATABASE_URL and SESSION_SECRET
npm run db:setup              # create the tables and seed the three offers
npm run admin:set -- you@example.com "a strong password"
npm run dev                   # http://localhost:3001
npm run test:api              # 46-case smoke test against the running API
```

Check it with `curl http://localhost:3001/api/health` — the response lists which
integrations are configured, any `warnings` (for example a Telegram token that is
present but does not look like a BotFather token), and `emailDesigns`, the email
layouts that were found. The warnings are printed at boot too.

### 2. Frontend

```sh
cd frontend
npm install
cp .env.example .env          # VITE_API_URL=http://localhost:3001/api
npm run dev                   # http://localhost:5173
```

With `VITE_API_URL` empty the frontend runs on its own sample data instead.

### 3. Emails (only when changing a design)

```sh
cd emails
npm install                   # first time only
npm run dev                   # preview the four designs at http://localhost:3000
npm run export                # render them into backend/src/emails/, then restart the API
```

The rendered HTML is committed, so this is only needed after editing a design.
The wording is not in this project — it is edited from **Dashboard → Messages**.

## Environment

Backend (`backend/.env`, never commit):

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | API port (default 3001) |
| `FRONTEND_URL` | Allowed CORS origin(s), comma-separated |
| `SESSION_SECRET` | Signs the admin session cookie |
| `COOKIE_SAMESITE` | `lax` (same domain) or `none` (cross-site, needs HTTPS) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_SECOND_CHAT_ID` | Owner notifications |
| `TELEGRAM_WEBHOOK_SECRET` | Verifies webhook calls |
| `RESEND_API_KEY`, `MAIL_FROM`, `OWNER_EMAIL` | Customer emails, and the owner's copy of each registration (with the recording) |
| `UPLOAD_DIR`, `MAX_UPLOAD_BYTES`, `DUPLICATE_WINDOW_HOURS` | Uploads and anti-duplicate rules |
| `VOICE_RETENTION_DAYS` | Age at which recordings are deleted (default 180) |

Frontend (`frontend/.env`): `VITE_API_URL`. It is baked in at build time, so set
the production URL before you build.

## API

All routes are under `/api`.

Public: `GET /offers`, `GET /offers/:slug`, `POST /registrations` (multipart,
includes the `recording` file), `POST /waitlist`, `POST /messages`.

Admin (session cookie): `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`,
`GET|PATCH /registrations`, `GET /registrations/:id/voice`, `PATCH /offers/:id`,
`GET /messages`, `GET /messages/status`, `PATCH /messages/templates/:key`,
`POST /messages/:id/retry`.

Telegram: `POST /telegram/webhook` (secret header checked).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `start` | Run the API (nodemon / plain node) |
| `npm run db:setup` | `db:migrate` + `db:seed` |
| `npm run admin:set -- <email> <password>` | Create or update an admin |
| `npm run telegram:webhook [-- <base-url>]` | Register or inspect the Telegram webhook |
| `npm run retention:voice [-- --dry-run]` | Delete voice notes older than the cutoff |
| `npm run test:api` | End-to-end smoke test against a running API |

## Before launch

Fill in every `[bracketed]` placeholder and work through
`docs/LAUNCH-CHECKLIST.md`. Deployment steps (hosting, environment variables,
cross-site cookies, webhook, cron) are in `docs/DEPLOYMENT.md`.
