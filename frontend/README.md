# EnrollHub frontend

## Run locally

```sh
npm install
npm run dev
```

Create a `.env` from `.env.example` and set `VITE_API_URL` to the backend API
root (`http://localhost:3001/api`) to run against the real server. Leave it empty
to preview the UI against the sample data in `src/data` (see
`src/services/api.js`).

## Project structure

```text
src/
├── main.jsx                 # React entry: mounts App inside BrowserRouter
├── App.jsx                  # route table; lazy-loads the dashboard screens
├── index.css                # Tailwind theme tokens and base styles
├── config/
│   ├── site.js              # canonical origin, entity facts, sameAs, dates
│   └── route-seo.js         # static-route metadata, schemas, breadcrumbs
├── components/
│   ├── Header.jsx           # public header
│   ├── Footer.jsx           # public footer
│   ├── PageFrame.jsx        # header + footer + skip-link wrapper
│   ├── PageHero.jsx         # page intro (Eyebrow + title)
│   ├── Brand.jsx            # logo mark and wordmark
│   ├── Seo.jsx              # title, canonical, OG/Twitter, JSON-LD writer
│   ├── RouteSeo.jsx         # applies the static route metadata map
│   ├── DirectAnswer.jsx     # 40–60 word GEO answer block
│   ├── OfferCard.jsx
│   ├── FaqList.jsx          # visible H3 questions + answers
│   ├── CtaBand.jsx
│   ├── FormField.jsx        # Field / SelectField / TextareaField
│   ├── RegistrationForm.jsx # offer registration form
│   ├── VoiceUpload.jsx      # voice-recording picker
│   └── admin/
│       ├── AdminLayout.jsx  # sidebar, mobile nav, page heading, stat card
│       ├── DataTable.jsx    # shared dashboard table
│       ├── RequireAdmin.jsx # session guard for /admin/*
│       ├── StatusBadge.jsx  # status label and offer pill
│       └── TemplateEditor.jsx # one editable message text
├── pages/
│   ├── Welcome.jsx          # /
│   ├── Offer.jsx            # /offers/:slug
│   ├── OfferWaitlist.jsx    # /offers/:slug/waitlist
│   ├── Thanks.jsx           # /thank-you
│   ├── AllOffers.jsx  About.jsx  Faq.jsx  Contact.jsx
│   ├── Privacy.jsx  Terms.jsx  NotFound.jsx
│   └── admin/
│       ├── Login.jsx  Dashboard.jsx  Offers.jsx
│       └── Messages.jsx     # editable message texts + the message log
├── data/
│   ├── offers.js            # sample offers (instant first paint + offline fallback)
│   └── sample-data.js       # sample registrations, messages, FAQ, templates
├── hooks/
│   ├── useVoiceRecording.js  # voice-recording state + validation
│   ├── useAsyncResource.js   # load/reload helper for the dashboard screens
│   ├── useOffers.js          # static offers first, then the live ones from the API
│   └── useUnsavedChangesWarning.js  # warns before leaving with unsaved template edits
├── lib/
│   ├── ui.js                # shared class-name strings
│   ├── format.js            # date formatting helpers
│   └── seo.js               # schema.org builders and page JSON-LD graph
└── services/
    └── api.js               # API layer (sample data fallback, REST when configured)
```

## Routes

- `/` — public welcome page and offer list
- `/offers` — all offers
- `/offers/:slug` — offer detail page and registration form
- `/offers/:slug/waitlist` — waitlist form for sold-out or paused offers
- `/status/:token` — private applicant/waitlist status page with accept and decline
- `/about` — how it works, with the voice recording instructions
- `/faq` — frequently asked questions
- `/contact` — contact details and a message form
- `/thank-you` — registration confirmation with the private status link
- `/privacy` and `/terms` — privacy policy and terms, awaiting final owner/legal review
- unmatched URLs — not-found page with links to the offers and admin sign-in
- `/admin/login` — dashboard sign-in screen
- `/admin` and `/admin/dashboard` — dashboard overview and registrations
- `/admin/registrations` — dashboard scrolled to the registrations table
- `/admin/waitlist` — waitlist search, follow-up and bulk offers
- `/admin/offers` — offer management screen
- `/admin/messages` — message templates and message log

Dashboard filter state lives in the URL, so views are shareable and deep-linkable
(for example `/admin?status=Accepted` or `/admin?q=sara`).

## SEO and GEO

Public routes have route-specific titles, descriptions, canonicals, Open Graph
and Twitter tags, and a schema.org JSON-LD graph. The graph always identifies
the `Organization` and `WebSite`, then adds `WebPage`, `CollectionPage`,
`Article`, `FAQPage`, `JobPosting` or `BreadcrumbList` as appropriate. Dynamic
offer pages build their metadata from live pay, location, seat and closing-date
data.

- `VITE_SITE_URL` is the canonical production origin (no trailing slash).
- `VITE_SAME_AS` accepts only comma-separated, exact, verified `https:` profile
  URLs. Leave it empty rather than guessing.
- `VITE_CONTENT_PUBLISHED_AT` / `VITE_CONTENT_UPDATED_AT` feed article dates and
  the visible FAQ review date.
- `npm run seo:sitemap` regenerates `public/sitemap.xml` from the static routes
  and `GET /offers`, and keeps the `Sitemap:` line in `public/robots.txt` on the
  same origin. It fails soft if the API is unreachable.
- `public/robots.txt` allows Googlebot, Bingbot and the major AI/answer-engine
  crawlers, while excluding `/admin`, `/api` and `/uploads`.
- Replace the SVG social card with a 1200×630 PNG/JPG before launch, and replace
  every `[PLACEHOLDER]` in the public copy.

The app is still a client-rendered SPA. The static `index.html` provides a
baseline entity graph, generic metadata and a no-JS fallback, but non-JavaScript
crawlers cannot see per-page metadata or body content until public routes are
prerendered or server-rendered. See [`../docs/SEO-GEO.md`](../docs/SEO-GEO.md)
for the full validation checklist and prerender guidance.

## Accessibility and quality notes

- Every page has a keyboard "Skip to content" link and a visible focus ring.
- Forms use wrapped `<label>`s, correct `type`/`inputMode`, `autoComplete`, and
  `spellCheck={false}` on email fields.
- The registrations and message-log tables use real table semantics (`caption`,
  `scope`), and async status messages use `role="status"`/`role="alert"`.
- Motion respects `prefers-reduced-motion`, and dates are localised with
  `Intl.DateTimeFormat`.
- Admin screens are code-split with `React.lazy`, so they are not part of the
  public bundle.
- The message-text editors label every control, expose the variable chips as
  buttons, announce the save result with `role="status"`/`role="alert"`, and warn
  before closing the tab with unsaved edits.

## Agent skills

Project-scoped agent skills are installed under `.agents/skills/` and pinned in
`skills-lock.json`:

- `agent-browser` — browser automation for verifying screens and interactions
- `find-skills` — discovery/install helper for new skills
- `frontend-design` — visual-design guidance
- `vercel-composition-patterns` — React composition patterns
- `vercel-react-best-practices` — React performance guidance
- `web-design-guidelines` — web interface guidelines review

Add more with `npx skills add <owner/repo> --skill <name>`.

## Sample data and the API

Sample offers live in `src/data/offers.js`; sample registrations, testimonials,
FAQ, message log, and WhatsApp templates live in `src/data/sample-data.js`. The
people and contact details in those files are fictional examples.

All network calls go through `src/services/api.js`:

- With `VITE_API_URL` **empty**, reads resolve against the sample data and writes
  are applied to an in-memory copy — the whole site, dashboard included, works as
  a preview with no backend.
- With `VITE_API_URL` **set** (`http://localhost:3001/api`), every read and write
  calls the REST endpoints in `backend/src/routes`. Admin calls send
  `credentials: 'include'` so the session cookie travels with them.

Admin behaviour that needs the API: sign-in is verified server-side by
`POST /auth/login`, `/admin/*` is guarded by `components/admin/RequireAdmin.jsx`
(`GET /auth/me`), decisions call `PATCH /registrations/:id`, offer edits call
`PATCH /offers/:id`, saving a message text calls `PATCH /messages/templates/:key`,
Message Retry calls `POST /messages/:id/retry`, and voice playback downloads
`GET /registrations/:id/voice` as a blob (the endpoint is admin-only, so an
`<audio src>` would not be authenticated).

**Public pages show live data.** `hooks/useOffers.js` paints `src/data/offers.js`
immediately, then replaces it with `GET /offers` (converting the API's camelCase to
the public shape) — so an offer edited in the dashboard, including one switched to
sold out, reaches visitors, while the page still has content if the API is down.
Because of that, keep `src/data/offers.js` roughly in sync with
`backend/src/db/seed.js`, which seeds the same three offers.

**Message texts** come from `GET /messages/status` and are saved with
`PATCH /messages/templates/:key`. The server rejects a text that dropped a
variable the message needs, and the editor shows that message in place.

Replace all bracketed placeholders before launch — see
`../docs/LAUNCH-CHECKLIST.md`.

