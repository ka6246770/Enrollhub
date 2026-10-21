# SEO + GEO implementation guide

This project now has a reusable SEO/GEO foundation built on the existing Vite +
React stack. It does not add a metadata dependency and it does not invent a
production domain, social profile, address or contact detail.

The short version:

- **SEO** = crawlable HTML, unique titles/descriptions, canonicals, sitemap,
  robots rules, breadcrumbs and schema.
- **GEO** = direct answers, visible question headings, verifiable facts, stable
  entity IDs and machine-readable JSON-LD that answer engines can quote.
- The current app is still a client-rendered SPA. The static `index.html` now
  carries a useful baseline, but **prerendering or SSR is the remaining step**
  for non-JavaScript AI crawlers. See §8.

---

## 1. Configure before launch

Set these in the frontend environment (Vercel/local `.env`). `VITE_*` values are
inlined at build time, so redeploy after changing one.

| Variable | Purpose | Required |
| --- | --- | --- |
| `VITE_SITE_URL` | Canonical origin, no trailing slash. Used for canonicals, OG URLs, schema `@id`s and the sitemap. | Yes |
| `VITE_SAME_AS` | Comma-separated, exact, verified profile/directory URLs. | Only when verified |
| `VITE_SUPPORT_EMAIL` | Optional `Organization.email` and contact point. | Optional |
| `VITE_WHATSAPP_NUMBER` | Optional `Organization.telephone`. | Optional |
| `VITE_BUSINESS_ADDRESS` | Optional `PostalAddress.streetAddress`. | Optional |
| `VITE_CONTENT_PUBLISHED_AT` | Article/visible review date (`YYYY-MM-DD`). | Yes |
| `VITE_CONTENT_UPDATED_AT` | Date the public facts were last reviewed. | Yes |

Also replace the example origin `https://enrollhub.example.com` in:

- `frontend/index.html` (baseline Open Graph image URLs and JSON-LD)
- `frontend/public/robots.txt` (the `Sitemap:` line)
- `frontend/public/sitemap.xml` (or regenerate it, see §7)

### `sameAs` rules

`sameAs` is not a place for guesses. Add a URL only after opening it and
confirming it is the company's official page. Safe targets are an official
LinkedIn/Facebook page, a Wikipedia article about the company, or an official
industry directory profile. Do not add a search-result URL, a shortened URL, a
profile you have not opened, or a placeholder. An empty list is better than a
wrong entity match.

The runtime schema builder drops anything that is not a valid `https:` URL:

```js
// src/config/site.js
sameAs: httpsUrls(import.meta.env.VITE_SAME_AS)
```

---

## 2. Semantic layout and heading contract

The public pages use `header`, `nav`, `main`, `section`, `article`, `aside` and
`footer`. Keep every new page on this heading contract:

```text
H1  page purpose (one per page, in PageHero or the page header)
  H2  direct answer / major section
    H3  individual job, FAQ question, step or sub-topic
```

- Never skip from H1 to H3.
- FAQ questions are now real `<h3>` elements followed by visible answers. They
  are not hidden in `<details>`/`<summary>`.
- The job list has a real section heading (visually hidden on `/offers` so the
  design does not change) and each desktop job title is an H3.
- The direct answer block supplies the first H2 after the H1 on the home, jobs,
  offer, about and FAQ pages.

Relevant files:

| File | Role |
| --- | --- |
| `src/components/PageFrame.jsx` | Shared header, footer and skip link |
| `src/components/PageHero.jsx` | Single H1 per page |
| `src/components/FaqList.jsx` | Visible H3 questions + answers |
| `src/components/DirectAnswer.jsx` | Answer-first block |
| `src/pages/*.jsx` | Page-level semantic sections |

---

## 3. Direct Answer Block

`src/components/DirectAnswer.jsx` renders a labelled H2 and a 40–60 word
paragraph. In development it warns when the copy drifts outside that range.

Rules for the copy:

1. Answer the page's main question in the first sentence.
2. Include at least two verifiable specifics: a number, a pay range, a date, a
   place, an age limit, a document or a process duration.
3. Keep it self-contained. A reader should not need the next paragraph to
   understand it.
4. Do not use "best", "leading", "amazing", "dream job" or other unsupported
   claims.

Example usage:

```jsx
<DirectAnswer>
  Al-Tayeb Company is hiring packaging, labeling and steward workers in Sadat
  City, El-Obour and 10th of Ramadan City. Monthly pay ranges from 6,600 to
  11,400 EGP. Roles are open to Egyptian men aged 18–50 with a National ID.
  Housing is included for workers who relocate.
</DirectAnswer>
```

This is **GEO-first** because it is the paragraph a model can quote directly. It
is also **SEO** because it is a strong featured-snippet candidate.

The current blocks live on:

- `/` — company and pay summary
- `/offers` — current job count, pay, shifts, eligibility
- `/offers/:slug` — pay, location, seats left, closing date
- `/about` — application time and process
- `/faq` — application, pay, shifts, eligibility and housing summary

---

## 4. JSON-LD graph

`src/lib/seo.js` builds one schema graph per page:

```json
{
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": "https://example.com/#organization" },
    { "@type": "WebSite", "@id": "https://example.com/#website" },
    { "@type": "BreadcrumbList" },
    { "@type": "WebPage" }
  ]
}
```

The page schema is one of:

- `WebPage` / `CollectionPage` / `ContactPage`
- `Article` on `/about`
- `FAQPage` on `/`, `/faq` and each offer page
- `JobPosting` on live offer pages when the API provides `createdAt`
- `BreadcrumbList` on every page below the home page

### Why the graph references IDs

`buildOrganizationSchema()` and `buildWebSiteSchema()` receive stable `@id`
values. Job and article nodes reference those IDs instead of repeating a
partial company object. This makes entity matching clearer for Google and for
AI systems.

### `FAQPage`

Only visible FAQ content is marked up. The FAQ page marks up all ten questions;
the homepage marks up the four visible on that page; offer pages mark up the
three visible there. Do not add hidden FAQ content to the JSON-LD.

### `JobPosting`

The public offers API now includes `createdAt` and `updatedAt`. The frontend
maps them to `created_at` and `updated_at`, and `buildJobPostingSchema()` uses
them for `datePosted`, `validThrough`, salary, location and `directApply`.
If an offer has no creation date (for example the static first-paint fallback),
the builder returns nothing rather than publishing an invalid posting.

### `Article`

`/about` uses `Article` with `datePublished` and `dateModified` from the site
config. Update those dates when the process copy changes.

### Rendering

`src/components/Seo.jsx` writes title, description, canonical, robots,
Open Graph, Twitter Card and the JSON-LD graph into `<head>`. The static
`index.html` already contains an Organization + WebSite baseline so a crawler
that does not execute JavaScript still sees the core entity facts.

---

## 5. Conversational FAQ and GEO copy rules

The FAQ data is in `src/data/sample-data.js`. Questions are phrased the way
people speak to search engines and assistants, for example:

- "How do I apply for an Al-Tayeb factory job?"
- "Who is eligible for Al-Tayeb factory jobs?"
- "How much do Al-Tayeb factory jobs pay in Egypt?"
- "Where are the Al-Tayeb jobs located?"
- "Is housing really included with Al-Tayeb jobs?"

Each answer should contain:

- a number, range, date or duration;
- a named place or document;
- a clear process fact;
- no bracketed placeholders and no vague marketing language.

The FAQ no longer contains `[X] hours`. Response time is now described as a
process ("reviewed in the order received, replied to on WhatsApp") because the
owner has not supplied a verified service-level promise. If a real response
window is agreed, add it consistently to the FAQ, contact page, confirmation
copy and email templates.

---

## 6. robots.txt

`frontend/public/robots.txt`:

- allows Googlebot, Bingbot, GPTBot, OAI-SearchBot, ChatGPT-User,
  PerplexityBot, Perplexity-User, ClaudeBot, Claude-User, anthropic-ai,
  Google-Extended, Applebot-Extended and CCBot;
- keeps `/admin`, `/api` and `/uploads` out of crawl;
- points to `/sitemap.xml`.

`robots.txt` is not access control. `/admin` and `/api` remain protected by the
server. Private pages such as `/thank-you` and waitlist forms are handled with
`noindex` metadata instead of a robots block so crawlers can see the directive.

---

## 7. Dynamic sitemap

`frontend/scripts/generate-sitemap.mjs` writes:

- `/`
- `/offers`
- `/about`
- `/faq`
- `/contact`
- `/privacy`
- `/terms`
- every non-closed offer returned by `GET /api/offers`

It also rewrites the `Sitemap:` line in `public/robots.txt` so the domain stays
in sync, and writes `dist/sitemap.xml` when a build already exists.

Run it:

```bash
cd frontend
VITE_SITE_URL=https://your-domain.example \
VITE_API_URL=/api \
npm run seo:sitemap
```

If the API is unreachable it warns and writes the static routes only. That is
intentional: a deploy should not fail because the API is temporarily down, but
the output should be regenerated after offers change.

Recommended automation: run it in CI before `npm run build`, or on a daily cron
that redeploys the frontend. Re-run it whenever an offer is created, archived,
or gets a new closing date.

---

## 8. The SPA limitation (important)

The app is a Vite + React SPA. Every route currently receives the same
`index.html` shell and metadata is updated by JavaScript after load.

What that means:

- Googlebot can render JavaScript, so it can usually see the client-updated
  head and content.
- Many AI crawlers and social preview bots do **not** execute JavaScript. They
  see only the static `index.html`.
- The static baseline (generic title/description, Organization + WebSite
  JSON-LD, semantic no-JS fallback) prevents the site from being invisible, but
  it cannot give a non-JS crawler the unique metadata and full body of
  `/offers/:slug`, `/faq` or `/about`.

To make the implementation exceptional rather than merely foundational,
prerender or server-render the public routes.

Recommended options, in order of effort:

1. **Prerender at build time** with Vite SSR, `react-dom/server` and
   `StaticRouter`, or with Vike/Astro. Write real HTML for each public route,
   including fetched offer pages. Keep the client router for navigation.
2. **SSR** the public routes from the existing Express backend, or move the
   public site to a framework with SSR/ISR.
3. **Host-level edge rendering** that injects the route-specific head and body
   into the HTML response, if the host supports it.

Prerender checklist:

- [ ] `/`, `/offers`, `/offers/:slug`, `/about`, `/faq`, `/contact`,
      `/privacy`, `/terms` have their own initial HTML.
- [ ] The initial HTML contains the route's title, meta description, canonical,
      OG/Twitter tags and JSON-LD — not just a placeholder.
- [ ] The route's H1 and visible body content are present in the initial HTML.
- [ ] The host serves the route-specific HTML instead of rewriting every path to
      `/index.html`. Update `vercel.json`, `_redirects` or the equivalent.
- [ ] Live offers are fetched at build/revalidation time, and the process is
      rerun when offers change.
- [ ] Client hydration keeps the SPA interactions working.
- [ ] Verify with JavaScript disabled and with `curl -A GPTBot`.

Until that is done, do not claim that AI crawlers can see the per-page content.
The static baseline and no-JS fallback are a safety net, not a substitute for
prerendering.

---

## 9. Validation checklist

Run:

```bash
cd frontend
npm run lint
npm run build
npm run seo:sitemap
```

Then check:

- [ ] `dist/robots.txt` exists and references the production sitemap.
- [ ] `dist/sitemap.xml` is valid XML and includes every public offer.
- [ ] `/` has one H1, a direct answer H2, and no skipped heading levels.
- [ ] `/faq` has an H1, direct answer H2, FAQ section H2 and H3 questions.
- [ ] `view-source:` on a route shows the expected baseline head; after JS,
      inspect the live `<head>` for the route-specific canonical/OG/JSON-LD.
- [ ] Google Rich Results Test accepts the `FAQPage` and `JobPosting` graphs.
- [ ] Schema Markup Validator shows no errors for `Organization`, `WebSite`,
      `BreadcrumbList` and `Article`.
- [ ] Lighthouse mobile scores for SEO, accessibility and best practices are
      checked on `/`, `/offers/:slug` and the registration form.
- [ ] All `[PLACEHOLDER]` values are replaced before launch.

Useful manual checks:

```bash
curl -s -A GPTBot https://your-domain.example/faq | head -80
curl -s https://your-domain.example/robots.txt
curl -s https://your-domain.example/sitemap.xml | head -60
```

---

## 10. File map

| Path | Purpose |
| --- | --- |
| `src/config/site.js` | Canonical origin, entity facts, contact fallbacks, `sameAs` |
| `src/config/route-seo.js` | Static route titles, descriptions, schemas, breadcrumbs |
| `src/lib/seo.js` | Organization, WebSite, WebPage, Article, FAQPage, JobPosting, breadcrumb builders |
| `src/components/Seo.jsx` | Writes head tags and JSON-LD |
| `src/components/RouteSeo.jsx` | Applies the static route map |
| `src/components/DirectAnswer.jsx` | 40–60 word answer block |
| `src/components/FaqList.jsx` | Visible H3 question/article answers |
| `index.html` | Static baseline meta, OG/Twitter, Organization/WebSite JSON-LD, no-JS fallback |
| `public/robots.txt` | Crawler rules and sitemap declaration |
| `public/sitemap.xml` | Generated sitemap |
| `scripts/generate-sitemap.mjs` | Sitemap + robots sitemap-line generator |
| `public/logo.svg` | Organization logo |
| `public/og-image.svg` | 1200×630 social card placeholder |
