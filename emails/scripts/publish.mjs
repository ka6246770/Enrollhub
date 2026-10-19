// The API fills these tokens at send time. Every email needs the first three;
// the four customer-facing designs also carry the privacy link. If an export
// ever bakes in sample copy instead of a token this step fails loudly, rather
// than silently emailing the same text to everybody.

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(scriptDir, '..', 'out');
const targetDir = path.join(scriptDir, '..', '..', 'backend', 'src', 'emails');

const alwaysRequired = ['{{body}}', '{{offer}}', '{{ctaUrl}}'];

// An internal notification has no privacy link to offer, so it is exempt.
const customerEmails = new Set([
  'registration-confirmation.html',
  'registration-accepted.html',
  'registration-rejected.html',
  'waitlist-joined.html',
]);

const files = (await readdir(outDir).catch(() => [])).filter((file) =>
  file.endsWith('.html'),
);

if (files.length === 0) {
  console.error(`No rendered emails in ${outDir}. Run "npm run export" from emails/.`);
  process.exit(1);
}

await mkdir(targetDir, { recursive: true });

let failed = false;

for (const file of files.sort()) {
  const html = await readFile(path.join(outDir, file), 'utf8');
  const requiredTokens = customerEmails.has(file)
    ? [...alwaysRequired, '{{privacyUrl}}']
    : alwaysRequired;
  const missing = requiredTokens.filter((token) => !html.includes(token));

  if (missing.length > 0) {
    console.error(
      `  ! ${file} lost ${missing.join(', ')} — not published. A template probably renders its sample text instead of the token.`,
    );
    failed = true;
    continue;
  }

  await writeFile(path.join(targetDir, file), html);
  console.log(`  ${file} → backend/src/emails/${file} (${Math.round(html.length / 1024)} kB)`);
}

if (failed) process.exit(1);

console.log(`\n${files.length} emails published. Restart the API so it picks them up.`);
