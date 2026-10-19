// The shared frame every EnrollHub email wears.
//
// Adapted from React Email's "Barebones boxed" demo
// (https://github.com/resend/react-email/tree/canary/apps/demo/emails) with the
// site's own colours and type: a white frame, the message on the page colour,
// the brand wordmark at the top, and the small print at the bottom.
//
// The wording the owner can change lives in the database and reaches the
// exported HTML through three tokens the API fills in at send time:
//
//   {{body}}        the rendered message text   (escaped, newlines become <br />)
//   {{offer}}       the offer title             (escaped)
//   {{ctaUrl}}      where the button points
//   {{privacyUrl}}  the footer's privacy link
//
// Everything else — the headline, the button label, the footer — is structure,
// not copy, so it stays in code.
//
// Named export only (no default export) so `email export` does not treat this as
// a template.

import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from 'react-email';
import { enrollHubTheme } from './theme';
import { EnrollHubFonts } from './theme-fonts';

export type BoxedEmailProps = {
  /** The hidden line inboxes show next to the subject. */
  preview: string;
  /** The headline inside the card. */
  heading: string;
  /** Small label at the top right saying which message this is. */
  label: string;
  /** The message. `{{body}}` in the sent email. */
  body: string;
  /** The single action. `url` is `{{ctaUrl}}` in the sent email. */
  cta: { label: string; url: string; variant?: 'primary' | 'quiet' };
  /** One line of small print under the button. */
  note: string;
};

// A rejection is not the moment for a filled, promotional button; it gets the
// same action in a quieter dress.
const buttonStyles = {
  primary: 'font-15 bg-brand text-white rounded-lg px-6 py-3.5',
  quiet: 'font-15 bg-transparent text-brand border border-solid border-brand rounded-lg px-6 py-3.5',
} as const;

export function BoxedEmail({
  preview,
  heading,
  label,
  body,
  cta,
  note,
}: BoxedEmailProps) {
  return (
    <Tailwind config={enrollHubTheme}>
      <Html>
        <Head>
          <EnrollHubFonts />
        </Head>

        <Body className="bg-white font-sans text-ink m-0">
          <Preview>{preview}</Preview>

          <Container className="mobile:py-6 mx-auto w-full max-w-[640px] px-4 py-8">
            <Section>
              {/* Header: the wordmark, and which message this is. */}
              <Section className="bg-surface mobile:px-5 px-6 py-4">
                <Row>
                  <Column className="w-1/2 py-[7px] align-middle">
                    <Text className="font-13 text-ink m-0 font-bold">
                      [YOUR BRAND]
                    </Text>
                  </Column>
                  <Column align="right" className="w-1/2 py-[7px] align-middle">
                    <Text className="font-11 text-muted m-0 text-right">
                      {label}
                    </Text>
                  </Column>
                </Row>
              </Section>

              {/* The card is the site's page colour inside the white frame. */}
              <Section className="bg-page mobile:px-5 mobile:py-9 rounded-[10px] px-[40px] py-[56px]">
                <Heading
                  as="h1"
                  className="font-display font-28 text-ink m-0"
                >
                  {heading}
                </Heading>

                <Text className="font-16 text-muted mt-4 mb-0">{body}</Text>

                <Section className="mt-8">
                  <Button
                    href={cta.url}
                    className={buttonStyles[cta.variant ?? 'primary']}
                  >
                    {cta.label}
                  </Button>
                </Section>

                <Text className="font-13 text-muted mt-8 mb-0">{note}</Text>
              </Section>

              {/* Small print: why this arrived, and how to be forgotten. */}
              <Section className="bg-surface mobile:px-5 px-6 py-8">
                <Text className="font-11 text-muted m-0">
                  You are receiving this email because you registered for an
                  offer on [YOUR BRAND]. Read the{' '}
                  <Link href="{{privacyUrl}}" className="text-brand">
                    privacy policy
                  </Link>
                  .
                </Text>
                <Text className="font-11 text-muted mt-3 mb-0">
                  [YOUR BRAND] · [BUSINESS ADDRESS] · [SUPPORT EMAIL]
                </Text>
              </Section>
            </Section>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
}
