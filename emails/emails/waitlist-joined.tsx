// Sent to someone who joins a waitlist and leaves an email address. The form asks
// for a phone number first, so nothing is sent when the address is empty.

import { BoxedEmail } from './boxed-email';

type Props = {
  /** The `waitlist` message, rendered from the dashboard's text. */
  body: string;
  /** The offer title. */
  offer: string;
  /** The offer's page. */
  ctaUrl: string;
};

const WaitlistJoined = ({
  body = '{{body}}',
  offer = '{{offer}}',
  ctaUrl = '{{ctaUrl}}',
}: Props) => (
  <BoxedEmail
    label="Waitlist"
    preview={`You are on the waitlist for ${offer}`}
    heading="You are on the waitlist"
    body={body}
    cta={{ label: 'See the offer', url: ctaUrl }}
    note="We only contact you if a seat becomes available, so there is nothing else to do for now."
  />
);

WaitlistJoined.PreviewProps = {
  body: 'Hi Amina, you are on the waitlist for Speaking Club — Level 3. We will message you if a seat opens up.',
  offer: 'Speaking Club — Level 3',
  ctaUrl: 'https://example.com/offers/speaking-club',
} satisfies Props;

export default WaitlistJoined;
