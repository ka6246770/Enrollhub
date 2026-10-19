// Design tokens for the emails, mirroring frontend/src/index.css so a message
// looks like the site it came from. Colours, type and one `mobile` variant live
// here; the layout itself is in boxed-email.tsx.
//
// This file is .ts, not .tsx, so `email export` does not treat it as a
// template (only .jsx/.tsx files with a default export are emails).

import type { TailwindConfig } from 'react-email';
import plugin from 'tailwindcss/plugin';

const colors = {
  page: '#F4F7F5',
  surface: '#FFFFFF',
  ink: '#15231F',
  muted: '#46534F',
  brand: '#08715F',
  line: '#D4DDD8',
} as const;

// Only the sizes the emails actually use. Named `font-11`, `font-16`, … to stay
// close to the React Email demo this layout is based on.
const fontScale = {
  11: {
    fontSize: '11px',
    fontWeight: '500',
    letterSpacing: '0.01em',
    lineHeight: '1.5',
  },
  13: { fontSize: '13px', fontWeight: '500', lineHeight: '1.55' },
  15: { fontSize: '15px', fontWeight: '600', lineHeight: '1.5' },
  16: { fontSize: '16px', fontWeight: '400', lineHeight: '1.6' },
  28: {
    fontSize: '28px',
    fontWeight: '700',
    letterSpacing: '-0.02em',
    lineHeight: '1.25',
  },
} as const;

export const enrollHubTheme: TailwindConfig = {
  plugins: [
    plugin(({ addUtilities, addVariant }) => {
      // Tailwind's breakpoints are width-based helpers for the web; an email
      // needs one switch that says "the screen is narrow".
      addVariant('mobile', '@media (max-width: 600px)');

      const utilities: Record<string, Record<string, string>> = {};
      for (const [step, token] of Object.entries(fontScale)) {
        utilities[`.font-${step}`] = token;
      }
      addUtilities(utilities);
    }),
  ],
  theme: {
    extend: {
      colors,
      fontFamily: {
        sans: ['Manrope', 'Arial', 'Helvetica', 'sans-serif'],
        display: ['Sora', 'Manrope', 'Arial', 'Helvetica', 'sans-serif'],
      },
    },
  },
};
