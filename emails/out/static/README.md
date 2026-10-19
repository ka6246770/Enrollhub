# Static files for the emails

`mic-mark.svg` is the microphone tile from the site header
(`frontend/src/components/Brand.jsx`), redrawn at 48px.

**The emails do not use it yet, on purpose.** An `<Img>` in an email needs an
absolute URL, and there is no public site address until the project is deployed.
Until then the header shows the `[YOUR BRAND]` wordmark as text, which cannot
break.

## Adding the logo once the site has a URL

1. Convert the SVG to a PNG at 96px (2x for retina), for example:

   ```bash
   npx --yes sharp-cli -i mic-mark.svg -o mic-mark.png resize 96 96
   ```

2. Put the PNG somewhere public — `frontend/public/` is already served at the
   site root, so `frontend/public/email/mic-mark.png` becomes
   `https://your-site/email/mic-mark.png`.

3. In `emails/emails/boxed-email.tsx`, put an `<Img>` before the wordmark `Text`
   in the header, and give the URL the existing `{{siteUrl}}` token so it follows
   whichever address the API is configured with:

   ```tsx
   <Img
     src="{{siteUrl}}/email/mic-mark.png"
     alt=""
     width={24}
     height={24}
     className="rounded-[6px] block"
   />
   ```

   `{{siteUrl}}` is filled in by the API (see `backend/src/services/email.js`).

4. Re-export and check:

   ```bash
   cd emails && npm run export
   ```

   The publish step fails loudly if a token went missing, so a mistake here is
   caught before any email is sent.
