// Sent the moment a registration arrives (the `customerConfirmation` text).
//
// The props are the tokens the API replaces at send time; the defaults keep this
// file self-explanatory, and `PreviewProps` below gives `email dev` realistic
// sample copy.

import { BoxedEmail } from './boxed-email';

type Props = {
  /** The `customerConfirmation` message, rendered from the dashboard's text. */
  body: string;
  /** The offer title. */
  offer: string;
  /** The offer's page. */
  ctaUrl: string;
};

const RegistrationConfirmation = ({
  body = '{{body}}',
  offer = '{{offer}}',
  ctaUrl = '{{ctaUrl}}',
}: Props) => (
  <BoxedEmail
    label="Registration"
    preview={`Registration received for ${offer}`}
    heading="We received your registration"
    body={body}
    cta={{ label: 'See the offer', url: ctaUrl }}
    note="If you did not register for this offer, reply to this message and we will delete your details."
  />
);

RegistrationConfirmation.PreviewProps = {
  body: 'Hi Amina, thanks for registering for Speaking Club — Level 3. We will contact you about the next step.',
  offer: 'Speaking Club — Level 3',
  ctaUrl: 'https://example.com/offers/speaking-club',
} satisfies Props;

export default RegistrationConfirmation;
