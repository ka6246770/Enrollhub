// The waitlist text.
//
// NOTE: nothing sends this yet. The waitlist form collects a name and a phone
// number, not an email address, so there is nowhere to deliver it. The design is
// built and the `waitlist` text is editable on the dashboard, ready for whenever
// the form starts asking for an email.

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
