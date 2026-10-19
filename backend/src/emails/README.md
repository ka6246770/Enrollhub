# Rendered emails — do not edit by hand

These HTML files are produced by `npm run export` in the `emails/` folder and are
read by `src/services/email.js` at send time. Edit the React Email components in
`emails/emails/` and export again; a change made here disappears on the next
export.

Each file keeps the placeholders the API fills in (`{{body}}`, `{{offer}}`,
`{{ctaUrl}}`, `{{privacyUrl}}`), which is why the text is not visible in these
files. The publish step refuses to copy a file that lost one of them.

See `emails/README.md` for the full workflow.
