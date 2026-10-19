# EnrollHub emails

The five emails the site sends, designed with [React Email](https://react.email)
and rendered to static HTML that the API sends through Resend.

```
emails/emails/          the designs (one file per email)
  boxed-email.tsx       the shared frame: wordmark, card, button, small print
  theme.ts              colours and type, mirroring frontend/src/index.css
  theme-fonts.tsx       the Manrope / Sora @import
  static/               the logo mark, for when the site has a public URL
emails/scripts/         publishes the rendered HTML into the backend
backend/src/emails/     the rendered HTML the API actually reads
```

## Working on a design

```bash
cd emails
npm install       # first time only
npm run dev       # live preview at http://localhost:3000
```

Each design exports sample copy through `PreviewProps`, so the preview shows a
realistic message. That sample text is **only** used by the preview.

## Publishing

```bash
cd emails
npm run export
```

This renders every design, checks that all four placeholders survived, and copies
the HTML into `backend/src/emails/`. **Restart the API afterwards** — the files
are read once and kept in memory.

If a design ever renders its sample copy instead of a placeholder, the export
fails with the name of the missing token rather than quietly emailing the same
sentence to everybody.

`GET /api/health` reports `emailDesigns`, and the API prints a warning at boot if
a file is missing; a missing file is not fatal, that email is then sent as plain
text only.

## How the owner's text gets in

The wording lives in the `message_templates` table and is edited from the
dashboard's Messages page, so the design and the copy can change independently.
The API fills these placeholders at send time:

| Placeholder | Filled with |
| --- | --- |
| `{{body}}` | the message text (HTML-escaped, line breaks become `<br />`) |
| `{{offer}}` | the offer title (escaped) |
| `{{name}}` | the applicant's name (escaped) — used by the owner alert |
| `{{ctaUrl}}` | where the button points |
| `{{privacyUrl}}` | the footer's privacy link |

`{{siteUrl}}` is also available, for a design that needs to link somewhere of its
own. Anything else left in braces is a bug and is left visible on purpose rather
than silently dropped.

The owner alert is an internal notification, so it replaces the customer small
print with its own footer and has no `{{privacyUrl}}`; the publish step knows
that and only requires the other tokens from it.

The headline, the button label and the small print are structure, not copy, and
live in the design files.

## Which email is sent when

| Design | Sent | Text it carries |
| --- | --- | --- |
| `registration-confirmation` | the moment a registration arrives | `customerConfirmation` |
| `registration-accepted` | when the owner accepts | `accepted` |
| `registration-rejected` | when the owner rejects | `rejected` |
| `waitlist-joined` | when someone leaves an email address on the waitlist form | `waitlist` |
| `registration-alert` | to `OWNER_EMAIL`, the moment a registration arrives, with the recording attached | `ownerRegistration` |

The waitlist form asks for a phone number first and the address is optional, so
this email only goes out when there is somewhere to send it.
