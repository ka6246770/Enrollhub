// Sent when the owner rejects a registration (the `rejected` text).
//
// The button points at the offers list rather than the offer the person was not
// accepted for.

import { BoxedEmail } from './boxed-email';

type Props = {
  /** The `rejected` message, rendered from the dashboard's text. */
  body: string;
  /** The offer title. */
  offer: string;
  /** The offers list. */
  ctaUrl: string;
};

const RegistrationRejected = ({
  body = '{{body}}',
  offer = '{{offer}}',
  ctaUrl = '{{ctaUrl}}',
}: Props) => (
  <BoxedEmail
    label="Your registration"
    preview={`About your registration for ${offer}`}
    heading="About your registration"
    body={body}
    cta={{ label: 'See other offers', url: ctaUrl, variant: 'quiet' }}
    note="This was a decision on one offer only — you are still welcome to register for any of the others."
  />
);

RegistrationRejected.PreviewProps = {
  body: 'Hi Amina, thank you for registering for Speaking Club — Level 3. We could not offer you a seat this time. Reply to this message if you would like to be considered for the next round.',
  offer: 'Speaking Club — Level 3',
  ctaUrl: 'https://example.com/offers',
} satisfies Props;

export default RegistrationRejected;
