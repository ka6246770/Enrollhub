# Deploying EnrollHub

Three moving parts:

| Piece | What it is | Where it can live |
| --- | --- | --- |
| `frontend/` | Static React build (`dist/`) | Vercel, Netlify, Cloudflare Pages, any static host |
| `backend/` | Node/Express API + voice uploads | Render, Railway, Fly.io, a VPS |
| Database | PostgreSQL | Neon, Supabase, Render Postgres, your own |

Voice notes are written to disk, so the API needs a **persistent volume**. If
your host has none, point `UPLOAD_DIR` at a mounted disk or swap
`backend/src/services/telegram.js` + the upload middleware for S3.

---

## 0. Before you start

- [ ] Generate a session secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] Decide the two public URLs, e.g. `https://enrollhub.example.com` (frontend) and `https://api.enrollhub.example.com` (API).
- [ ] Have the Telegram bot token + chat id ready (see `backend/.env.example`).

---

## 1. Database

Any managed PostgreSQL works. Create it, then run the migrations against it
from your machine:

```bash
cd backend
DATABASE_URL='postgresql://user:pass@host:5432/dbname' npm run db:migrate
DATABASE_URL='...' npm run db:seed         # three starter offers
DATABASE_URL='...' npm run admin:set -- you@example.com 'a-strong-password'
```

`db:migrate` is idempotent and also creates the `message_templates` table, so run
it on every deploy. `db:seed` inserts the three demo offers **and** the eight
message texts: the texts use `ON CONFLICT DO NOTHING`, so re-running never
overwrites an edit made in the dashboard, but the offers use `DO UPDATE`, so
**do not run `db:seed` against a live database** — it would reset `seats_taken`
and `status`. Skip it once you have created your own offers.

---

## 2. Backend (example: Render)

1. New **Web Service** → repo → root directory `backend`.
2. Build command `npm install`, start command `npm start`.
3. Health check path `/api/health`.
4. Add a **persistent disk** mounted at `/var/data` and set
   `UPLOAD_DIR=/var/data/uploads` (the folder is created on first upload).
5. Environment variables:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | your Postgres URL |
| `PORT` | usually provided by the host |
| `FRONTEND_URL` | `https://enrollhub.example.com` (comma-separate several) |
| `SESSION_SECRET` | the random string from step 0 |
| `COOKIE_SAMESITE` | `none` when the frontend is on a different site (see §4) |
| `UPLOAD_DIR` | `/var/data/uploads` |
| `TELEGRAM_BOT_TOKEN` | from @BotFather |
| `TELEGRAM_CHAT_ID` | your chat id |
| `TELEGRAM_SECOND_CHAT_ID` | optional second recipient |
| `TELEGRAM_WEBHOOK_SECRET` | any random string |
| `RESEND_API_KEY` | from resend.com |
| `MAIL_FROM` | `EnrollHub <hello@yourdomain>` (verify the domain in Resend first) |
| `OWNER_EMAIL` | where the owner's copy of each registration goes; empty turns it off |
| `VOICE_RETENTION_DAYS` | `180` |

The boot log prints which integrations are configured, so check it first if
notifications do not arrive.

### Email designs

The rendered email HTML lives in `backend/src/emails/` and is **committed**, so a
deploy needs no extra build step and the API reads it at start-up. After changing
a design, run `npm run export` in `emails/` (it renders the components, checks the
placeholders survived, and copies the files in), then restart the API.
`GET /api/health` reports `emailDesigns` — a missing file is not fatal, that email
is then sent as plain text.

`MAIL_FROM` is `EnrollHub <onboarding@resend.dev>` until you change it. That is
Resend's shared testing address: with it, mail is only delivered to the address
the Resend account belongs to. Verify your domain in Resend and put it in
`MAIL_FROM` before real customers are emailed.

`OWNER_EMAIL` is the exception: it is the account's own inbox, so it already
receives the owner's copy of every registration (form + recording) through the
sandbox. Leave it empty if you only want the Telegram alert.

---

## 3. Frontend (example: Vercel)

1. New project → repo → root directory `frontend`.
2. Build command `npm run build`, output directory `dist`. `frontend/vercel.json`
   already rewrites every path to `index.html`, which the client-side router
   needs. Netlify users get the same via `frontend/public/_redirects`.
3. Environment variable `VITE_API_URL=https://api.enrollhub.example.com/api`.
   **It is inlined at build time** — change it and redeploy, do not expect a
   runtime toggle.
4. Deploy, then confirm the API accepts the origin: the site must call the API
   from exactly one of the URLs listed in `FRONTEND_URL`.

---

## 4. Cookies and CORS across two domains

If the frontend and API share a registrable domain (`example.com` +
`api.example.com`) keep `COOKIE_SAMESITE=lax` — the admin session cookie will be
sent and CSRF risk stays low.

If they are on completely different sites (`*.vercel.app` + `*.onrender.com`):

- `COOKIE_SAMESITE=none` (works only over HTTPS; the server forces
  `cookie.secure` in that case),
- `NODE_ENV=production`,
- `FRONTEND_URL` set to the exact frontend origin, no trailing slash.

Symptoms: signing in appears to work but every page bounces back to
`/admin/login`, or `GET /api/auth/me` returns 401 — that is the cookie being
dropped, not the password.

---

## 5. Telegram webhook

Telegram must reach the deployed API over HTTPS:

```bash
cd backend
TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... \
  npm run telegram:webhook -- https://api.enrollhub.example.com
npm run telegram:webhook        # prints the current webhook status
```

Then press **Accept** or **Reject** on a real registration: the customer gets an
email, the message buttons are replaced with the decision, and the dashboard
status updates.

---

## 6. Housekeeping

- **Voice retention** — schedule daily:
  `npm run retention:voice` (use `-- --dry-run` first). On Render this is a Cron
  Job; elsewhere it is a crontab entry. `VOICE_RETENTION_DAYS` controls the cutoff.
- **Backups** — enable daily Postgres backups with your provider. Uploads live on
  the disk; snapshot it too, or switch to object storage.
- **Logs** — the API logs a line for every notification it skips or sends; wire
  your host's log drain to an alert if you want to notice failures early.
- **Post-deploy check** — point the smoke test at production:
  ```bash
  cd backend
  API=https://api.enrollhub.example.com/api \
    ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='...' npm run test:api
  ```
  It only creates throwaway records and restores anything it touches.

---

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `Origin ... is not allowed by CORS` (403) | `FRONTEND_URL` does not match the browser origin exactly (scheme, host, port) |
| Signed in, then immediately logged out | Cookie settings — see §4 |
| `401` on `GET /api/registrations/:id/voice` while logged in | Session cookie not sent for the media request; the dashboard fetches it with `fetch`, so this normally means the session expired |
| Uploads vanish after a redeploy | No persistent disk, or `UPLOAD_DIR` not pointing at the mount |
| Emails/Telegram never arrive | The relevant env var is missing — the boot log says which |
| Emails arrive as plain text, with no design | `backend/src/emails/` is empty on that host — commit the rendered files or run `npm run export` in `emails/`, then restart the API (`/api/health` → `emailDesigns`) |
| Resend accepts the send but nothing is delivered | `MAIL_FROM` is still the shared `onboarding@resend.dev` address — verify your own domain |
| `Something went wrong` (500) | Check the server log; the handler logs full errors for 5xx |
