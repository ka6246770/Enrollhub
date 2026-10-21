// Sent to the owner (OWNER_EMAIL) the moment a registration arrives: the whole
// form, with the voice recording attached. This is an internal notification, so
// its footer talks about handling the recording, not about the customer's
// privacy — that is the one difference from the four customer-facing emails.

import { BoxedEmail } from './boxed-email';

type Props = {
  /** The `ownerRegistration` message, rendered from the dashboard's text. */
  body: string;
  /** The offer title. */
  offer: string;
  /** The applicant's name. */
  name: string;
  /** The admin dashboard. */
  ctaUrl: string;
};

const RegistrationAlert = ({
  body = '{{body}}',
  offer = '{{offer}}',
  name = '{{name}}',
  ctaUrl = '{{ctaUrl}}',
}: Props) => (
  <BoxedEmail
    label="Owner alert"
    preview={`New registration — ${offer}`}
    heading="New registration"
    body={body}
    cta={{ label: 'Review and decide', url: ctaUrl }}
    note={`The voice recording is attached. Reply to ${name} by email or phone.`}
    footer="Internal notification from Al-Tayeb Company. The recording is personal data — keep it only as long as you need it."
  />
);

RegistrationAlert.PreviewProps = {
  body: [
    'New registration',
    'Offer: Speaking Club — Level 3',
    'Name: Layla Hassan',
    'Age: 27',
    'Language: English',
    'Level: Intermediate',
    'Residence: Cairo, Egypt',
    'Email: layla@example.com',
    'Phone: +20 100 000 0000',
    'Voice recording: attached.',
  ].join('\n'),
  offer: 'Speaking Club — Level 3',
  name: 'Layla Hassan',
  ctaUrl: 'https://example.com/admin',
} satisfies Props;

export default RegistrationAlert;
