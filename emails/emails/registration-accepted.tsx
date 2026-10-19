// Sent when the owner accepts a registration (the `accepted` text).

import { BoxedEmail } from './boxed-email';

type Props = {
  /** The `accepted` message, rendered from the dashboard's text. */
  body: string;
  /** The offer title. */
  offer: string;
  /** The offer's page. */
  ctaUrl: string;
};

const RegistrationAccepted = ({
  body = '{{body}}',
  offer = '{{offer}}',
  ctaUrl = '{{ctaUrl}}',
}: Props) => (
  <BoxedEmail
    label="Your seat"
    preview={`Your seat for ${offer} is confirmed`}
    heading="Your seat is confirmed"
    body={body}
    cta={{ label: 'See the offer', url: ctaUrl }}
    note="If you can no longer attend, reply to this message so the seat can go to someone else."
  />
);

RegistrationAccepted.PreviewProps = {
  body: 'Hi Amina, good news — your seat for Speaking Club — Level 3 is confirmed. We will send the schedule and joining details shortly.',
  offer: 'Speaking Club — Level 3',
  ctaUrl: 'https://example.com/offers/speaking-club',
} satisfies Props;

export default RegistrationAccepted;
