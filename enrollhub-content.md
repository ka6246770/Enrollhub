# EnrollHub: Content Pack

All text on the site and in messages is in English. Anything in [square brackets] must be replaced with real information before launch.

---

## 1. Offers (database seed)

Offer details are stored in the database, not in the code. Each offer is one row in the `offers` table.

```json
[
  {
    "id": 1,
    "slug": "offer-1",
    "title": "[OFFER 1 TITLE]",
    "description": "[One or two sentences describing what this offer includes and who it is for.]",
    "price": "[PRICE]",
    "duration": "[DURATION]",
    "included": [
      "[Included item one]",
      "[Included item two]",
      "[Included item three]"
    ],
    "seats_total": 30,
    "seats_taken": 0,
    "closes_at": "[YYYY-MM-DD]",
    "status": "active"
  },
  {
    "id": 2,
    "slug": "offer-2",
    "title": "[OFFER 2 TITLE]",
    "description": "[One or two sentences describing what this offer includes and who it is for.]",
    "price": "[PRICE]",
    "duration": "[DURATION]",
    "included": [
      "[Included item one]",
      "[Included item two]",
      "[Included item three]"
    ],
    "seats_total": 20,
    "seats_taken": 20,
    "closes_at": "[YYYY-MM-DD]",
    "status": "soldout"
  },
  {
    "id": 3,
    "slug": "offer-3",
    "title": "[OFFER 3 TITLE]",
    "description": "[One or two sentences describing what this offer includes and who it is for.]",
    "price": "[PRICE]",
    "duration": "[DURATION]",
    "included": [
      "[Included item one]",
      "[Included item two]",
      "[Included item three]"
    ],
    "seats_total": 20,
    "seats_taken": 0,
    "closes_at": "[YYYY-MM-DD]",
    "status": "active"
  }
]
```

**Status values:** `active` (open for registration), `soldout` (show waitlist form), `closed` (hidden or disabled).

**Registration form fields (same for all offers):** name, age, language, level, residence, email, WhatsApp number, voice recording (1 to 2 minutes, MP3, M4A or WAV, max 10 MB), consent checkbox.

---

## 2. Website text

### Welcome page
- **Eyebrow:** Welcome
- **Headline:** [WELCOME HEADLINE: e.g., "Find the program that fits you, and tell us why in your own voice."]
- **Intro:** [One or two sentences explaining what you offer and what happens after someone registers.]
- **Section: Choose your offer**
- **Section: How it works**
  1. **Pick an offer:** Compare the details and choose the one that fits you.
  2. **Register and record:** Fill in the form and upload a 1 to 2 minute voice note.
  3. **Get a WhatsApp reply:** We confirm your seat on WhatsApp within [X] hours.

### FAQ
**Q: How do I register?**
A: Pick an offer, fill in the form, upload your voice recording, and accept the consent checkbox. You will see a confirmation page straight away.

**Q: What should I say in my voice recording?**
A: See the recording instructions in section 4 below.

**Q: When will I hear back?**
A: We review every registration and reply within [X] hours on WhatsApp or by email.

**Q: Is my personal information safe?**
A: We only use your details to review your registration and contact you about the offer. Read our Privacy Policy for more details.

**Q: What if the offer is sold out?**
A: You can join the waitlist. If a seat opens up, we will contact you on WhatsApp.

### Thank you page
- **Headline:** Thank you, [NAME]. You're registered.
- **Text:** Your registration for [OFFER NAME] was received. Here is what happens next.
- **Step 1:** Check WhatsApp. You will get a confirmation message within [X] hours.
- **Step 2:** Keep your phone on. We may reach out with questions before we confirm your seat.
- **Step 3:** Start on [START DATE]. Full details and the schedule will be in your confirmation message.
- **Button:** Back to offers
- **Footer:** Did not get a message? Contact [SUPPORT EMAIL]

### Sold out / waitlist page
- **Notice:** Sold out. All seats for this offer are taken.
- **Text:** Join the waitlist and we will message you on WhatsApp if a seat opens up.
- **Consent checkbox:** I agree to be contacted on WhatsApp if a seat opens for this offer.
- **Button:** Join waitlist

---

## 3. Consent text (checkbox on registration form)

> I agree that [BRAND NAME] may store my details and voice recording, and contact me by WhatsApp or email about this offer. I can withdraw my consent at any time by contacting [SUPPORT EMAIL].

Must be unchecked by default. The form cannot be submitted without it.

---

## 4. Voice recording instructions (shown next to the upload field)

> Record a voice note of 1 to 2 minutes. Please say:
> 1. Your full name.
> 2. Why you are interested in [OFFER NAME].
> 3. Your current level and what you hope to achieve.
> 4. Anything else you would like us to know.
>
> Speak clearly in a quiet place. Accepted formats: MP3, M4A, WAV. Maximum size: 10 MB.

---

## 5. Customer emails

### Accepted
**Subject:** You're accepted into [OFFER NAME]

Hi {name},

Great news: your registration for [OFFER NAME] has been accepted.

What happens next:
- We will contact you on WhatsApp within [X] hours to confirm the details and your start date.
- If you have any questions in the meantime, reply to this email or contact us at [SUPPORT EMAIL].

We look forward to having you with us.

Best regards,
[BRAND NAME] Team

### Rejected
**Subject:** An update on your registration for [OFFER NAME]

Hi {name},

Thank you for applying to [OFFER NAME] and for taking the time to record your voice note.

Unfortunately, we are not able to accept your registration for this offer at this time. This decision is not a judgement of you as a person and is based on [GENERAL REASON, e.g., current capacity or program requirements].

You are welcome to apply again in the future. If you have any questions, reply to this email and we will get back to you as soon as we can.

Best wishes,
[BRAND NAME] Team

### Waitlist confirmation
**Subject:** You're on the waitlist for [OFFER NAME]

Hi {name},

Thanks for joining the waitlist for [OFFER NAME]. All seats are currently taken.

If a seat opens up, we will contact you on WhatsApp at {phone}. We will not share your details with anyone else.

Best regards,
[BRAND NAME] Team

---

## 6. Message to the second person (internal)

Sent automatically after every new registration. Replace placeholders with the real data from the registration.

> New registration: {name}
> Offer: {offer}
> Age: {age} | Language: {language} | Level: {level}
> Residence: {residence}
> Email: {email} | WhatsApp: {phone}
> Voice recording: attached
> Please review and reply to the customer within [X] hours.

---

## 7. WhatsApp message templates (for later, when WhatsApp is connected)

Use the **Utility** category for these, not Marketing, because they are cheaper and approved faster.

**Template: registration_confirmation**
> Hi {{1}}, thanks for registering for {{2}}. We will contact you on WhatsApp within [X] hours.

**Template: registration_accepted**
> Hi {{1}}, your registration for {{2}} has been accepted. We will be in touch soon with the next steps.

---

## 8. Privacy Policy (DRAFT, must be reviewed by a lawyer before publishing)

**What we collect:** name, age, language, level, residence, email address, WhatsApp number, and the voice recording you upload with your registration.

**Why we collect it:** to review your registration for [OFFER NAME], contact you about the offer, and manage your seat.

**Who can access it:** only the [BRAND NAME] team and the service providers we use to run the website, email, and messaging.

**How long we keep it:** [RETENTION PERIOD, e.g., 12 months] after the offer closes, unless you ask us to delete it sooner.

**Your rights:** you can ask to see, correct, or delete your personal data at any time by contacting [SUPPORT EMAIL]. You can also withdraw your consent at any time.

**Security:** we use [SECURITY MEASURES, e.g., encrypted connections and access controls] to protect your information.

**Contact:** [SUPPORT EMAIL] | [WHATSAPP NUMBER] | [BUSINESS ADDRESS]

**Last updated:** [DATE]

---

## 9. Footer and contact

- **Email:** [SUPPORT EMAIL]
- **WhatsApp:** [WHATSAPP NUMBER]
- **Links:** Privacy Policy | Terms of Use | Contact
- **Copyright line:** © [YEAR] [BRAND NAME]. All rights reserved.

---

## Checklist before launch

- [ ] All [placeholders] replaced with real information
- [ ] Offer rows filled in the database
- [ ] Consent text reviewed
- [ ] Privacy Policy and Terms reviewed by a lawyer
- [ ] Email domain verified in Resend
- [ ] Test registration sent and received on Telegram
- [ ] Test accepted and rejected emails received
