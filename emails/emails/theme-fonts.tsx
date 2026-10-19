// The Manrope / Sora pairing the site uses (see frontend/index.html), loaded the
// same way: one Google Fonts `@import`.
//
// This is progressive enhancement, not a requirement. Gmail and Outlook strip
// `@import`, so those readers get the Arial/Helvetica fallback declared in
// theme.ts; Apple Mail and iOS Mail get the real brand fonts. There is no
// hard-coded @font-face list on purpose — Google's font file URLs change
// whenever a family is updated, and a stale URL fails silently.
//
// Named export only (no default export) so `email export` does not treat this as
// a template.

const FONT_STACK =
  'Manrope:wght@400;500;600;700&family=Sora:wght@600;700';

export function EnrollHubFonts() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `@import url('https://fonts.googleapis.com/css2?family=${FONT_STACK}&display=swap');`,
      }}
    />
  );
}
