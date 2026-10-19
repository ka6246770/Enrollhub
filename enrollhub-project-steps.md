# EnrollHub: Step-by-Step Project Guide

This file lists every step needed to build the EnrollHub project, from the idea to launch. Work through the phases in order. Each step says what to do, why, and what "done" looks like.

**Project summary:** A website with 3 offers. Each offer has a registration form, and the customer uploads a 1 to 2 minute voice recording. When a registration arrives, the owner gets the details and the voice file on Telegram. Later, the owner accepts or rejects the registration from Telegram, and the customer gets an email.

**Stack:**
- Frontend: React (Vite), React Router, Tailwind CSS
- Backend: Node.js with Express
- Notifications: Telegram Bot (free)
- Emails: Resend (free tier, later)
- Database: to be chosen (SQLite or Supabase, later)
- WhatsApp: Meta WhatsApp Business Platform (later, paid per message)

---

## Phase 0: Preparation

### Step 0.1: Install the tools
1. Install Node.js (LTS version) from nodejs.org.
2. Install VS Code or any code editor.
3. Check the installation in a terminal:
   ```bash
   node -v
   npm -v
   ```
   **Done when:** both commands print a version number.

### Step 0.2: Create the accounts you need
- Telegram account (for notifications).
- Resend account (for emails, do this later).
- Hosting account, such as Render, Railway, or Vercel (do this at deployment).
- Meta Business account (only when you connect WhatsApp).

### Step 0.3: Collect the real content
Gather the following from the owner:
- Offer names, descriptions, prices, durations, included items.
- Number of seats per offer and the closing date.
- Contact email, WhatsApp number, brand name.
- Second person's name and contact (if they receive registrations).
- Reason templates for accept and reject emails.

**Done when:** you have all the information, with no placeholders left.

### Step 0.4: Review the content pack
Open `enrollhub-content.md` and replace every placeholder in `[square brackets]` with real information. This file contains the website text, consent text, voice instructions, email templates, and privacy policy draft.

**Done when:** the content pack has no `[ ]` placeholders left.

### Step 0.5: Get a lawyer to review the privacy policy and consent
The privacy policy is a draft. The customer's personal data and voice recording are sensitive, so a lawyer must review the text before you publish it.

**Done when:** the privacy policy and consent text are approved.

---

## Phase 1: Design

### Step 1.1: Finish the design screens
The design screens are in the Artifact canvas, and the PDF export is in `scratchpad/out/Offers-Registration-Design.pdf`. The screens are:
1. Offer 1, Offer 2, Offer 3 (registration forms)
2. Offer 2 sold out (waitlist form)
3. Welcome page
4. Thank you page
5. Admin login
6. Dashboard
7. Manage offers
8. Messages and templates

**Done when:** the owner approves every screen.

### Step 1.2: Decide what is interactive
Mark which parts are static and which must work, for example:
- Form validation
- Status filters on the dashboard
- Accept and reject buttons
- Sold out state (driven by seat count)

**Done when:** you have a list of working features.

---

## Phase 2: Frontend Setup (React)

### Step 2.1: Create the React project
```bash
npm create vite@latest enrollhub-frontend -- --template react
cd enrollhub-frontend
npm install
```
**Done when:** `npm run dev` opens the starter page.

### Step 2.2: Install React Router and Tailwind
```bash
npm install react-router-dom
npm install tailwindcss @tailwindcss/vite
```

Update `vite.config.js`:
```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

Update `src/index.css`:
```css
@import "tailwindcss";
```

**Done when:** Tailwind classes change the page appearance.

### Step 2.3: Add the fonts
In `index.html`, inside `<head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Sora:wght@600;700&display=swap" rel="stylesheet" />
```

**Done when:** the headings use Sora and the body text uses Manrope.

### Step 2.4: Set up the router
Create `src/main.jsx`:
```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

**Rule:** `BrowserRouter` goes only in `main.jsx`. `App.jsx` holds only the `Routes`.

**Done when:** the app loads without the "no router match" error.

### Step 2.5: Create the offers data file
Create `src/data/offers.js`. This is the one place that holds the offers. Later it comes from the database.

**Done when:** each offer has an id, title, description, price, seats left, and a sold out flag.

### Step 2.6: Build the Header component
Create `src/components/Header.jsx` (Tailwind version). It contains the logo, the navigation links (Offers, How it works, FAQ), the "Choose an offer" button, and a mobile menu.

**Done when:** the header is sticky, and the mobile menu opens and closes.

### Step 2.7: Build the Welcome page
Create `src/pages/Welcome.jsx`. It contains:
- The hero with the headline and intro text
- The offer cards (from `offers.js`), showing seats left or Sold out
- How it works (3 steps)
- Frequently asked questions

**Done when:** all 3 offers show, and each card links to the right page.

### Step 2.8: Build the Thank you page
Create `src/pages/Thanks.jsx`. It reads the name and offer name from the router state. It contains the check mark, next steps, and a button back to the offers.

**Done when:** the page shows after a successful registration.

### Step 2.9: Build the Login page
Create `src/pages/Login.jsx`. It has an email field, a password field, a "keep me signed in" checkbox, and a sign-in button.

**Note:** this login does not check the password yet. Add real authentication later (Step 5.6).

**Done when:** the form submits and goes to `/admin`.

### Step 2.10: Build the offer registration page
Create `src/pages/Offer.jsx`. Use one component for all offers, and pass the offer id through the route (`/offer/:id`).

The form contains:
- Name, age, language, level, residence, email, WhatsApp number
- Voice recording upload (`name="voice"`, `accept="audio/*"`)
- Consent checkbox (`name="consent"`), unchecked by default
- Register button

**Important:** every input needs a `name` attribute that matches the backend. Without it, the data does not reach the server.

**Done when:** the form cannot be submitted without the required fields, the voice file, and the consent checkbox.

### Step 2.11: Build the sold out waitlist page
Create `src/pages/OfferSoldOut.jsx` for offers with `status: "soldout"`. It contains the sold out notice, a name and WhatsApp field, a consent checkbox, and a "Join waitlist" button.

**Done when:** the sold out offer shows this page instead of the registration form.

### Step 2.12: Build the App routes
Create `src/App.jsx`:
- `/` → Welcome
- `/offer/:id` → Offer
- `/offer/:id/waitlist` → OfferSoldOut
- `/thanks` → Thanks
- `/admin/login` → Login
- `/admin` → Dashboard (Step 5.5)
- `*` → NotFound

**Done when:** every route opens its page, and unknown paths show the 404 page.

### Step 2.13: Connect the registration form to the backend
Create `src/services/api.js`:
- Build a `FormData` object from the form.
- Add the offer name.
- Send it with `POST` to the backend's `/api/register` endpoint.
- If the response is OK, go to `/thanks`. Otherwise, show the error.

**Done when:** a test registration reaches the backend and the owner's Telegram.

---

## Phase 3: Backend Setup (Node.js and Express)

### Step 3.1: Create the backend project
```bash
mkdir enrollhub-backend
cd enrollhub-backend
npm init -y
npm install express multer cors dotenv
```

Add `"type": "module"` to `package.json` so you can use `import`.

**Done when:** `package.json` exists and the packages are installed.

### Step 3.2: Create the Telegram bot
1. Open Telegram and search for **@BotFather**.
2. Send `/newbot`.
3. Enter the bot display name (for example, `EnrollHub`).
4. Enter the username. It must end in `bot` (for example, `enrollhub_bot`).
5. Copy the token BotFather gives you.

**Security:** never share the token in chats, screenshots, or public code. If it leaks, send `/revoke` to BotFather and get a new token.

**Done when:** the bot exists and you have its token.

### Step 3.3: Get your Chat ID
1. Open your bot and send `/start`, then send any other message.
2. Open this link in a browser, replacing `TOKEN` with your token:
   `https://api.telegram.org/botTOKEN/getUpdates`
3. Find `"chat":{"id": ...}`. That number is your Chat ID.

If the result is empty (`"result":[]`), send another message to the bot and reload the page.

**Done when:** you have your Chat ID.

### Step 3.4: Save the settings in `.env`
Create `enrollhub-backend/.env`:
```
TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
FRONTEND_URL=http://localhost:5173
PORT=3001
```

Add `.env` to `.gitignore` so it never goes to GitHub.

**Done when:** the `.env` file exists and is ignored by git.

### Step 3.5: Write the registration endpoint
Create `enrollhub-backend/index.js` with:
- Express and CORS set up for `FRONTEND_URL`.
- Multer to receive the voice file in memory, with a 10 MB limit.
- A `POST /api/register` route that:
  1. Checks that the voice file, name, email, phone, and consent exist.
  2. Sends the details as a Telegram message.
  3. Sends the voice file as a Telegram audio message.
  4. Returns `{ ok: true }`, or an error.

**Done when:** a test request with a voice file reaches your Telegram.

### Step 3.6: Test the backend
1. Start the backend: `node index.js`.
2. Start the frontend: `npm run dev`.
3. Submit a test registration from the website.
4. Check your Telegram for the details and the voice file.

**Done when:** the test registration arrives with all details and the voice file.

### Step 3.7: Add the database (later)
Choose a database to save every registration and its status (new, accepted, rejected). Options:
- **SQLite** if you run the backend on one server.
- **Supabase** (hosted Postgres) if you want a managed database with storage for voice files.

Save these fields: offer, name, age, language, level, residence, email, phone, voice file link, consent time, status, and created time.

**Done when:** every registration is saved, and you can list them.

### Step 3.8: Prevent duplicate registrations
Reject a registration if the same email or phone already registered for the same offer in the last few hours. Show a clear message to the customer.

**Done when:** a repeated submission is blocked.

### Step 3.9: Add spam protection
- Limit the number of registrations per IP address per hour.
- Add a simple captcha (for example, Cloudflare Turnstile, which is free) if spam appears.

**Done when:** a script that submits many forms gets blocked.

---

## Phase 4: Accept and Reject Flow

### Step 4.1: Set up Resend for emails
1. Create an account at resend.com.
2. Add your domain and verify it by adding the DNS records they give you at your domain provider.
3. Create an API key and save it in `.env` as `RESEND_API_KEY`.

**Free tier limits:** 3,000 emails per month and 100 emails per day. Check resend.com/pricing for the current limits.

**Done when:** a test email sends from your domain.

### Step 4.2: Add the accept and reject buttons on Telegram
When a registration arrives, send the message with two inline buttons: **Accept** and **Reject**. Each button carries the registration ID, not the customer's data (Telegram limits the button data to 64 bytes).

**Done when:** the buttons appear on the registration message.

### Step 4.3: Handle the button press
1. Set up a Telegram webhook that points to your backend's public URL.
2. When a button is pressed, look up the registration by its ID.
3. If the status is still "new", update it to "accepted" or "rejected". If it already has a status, stop (this prevents double decisions).
4. Send the matching email through Resend.
5. Edit the Telegram message to show the final status.
6. Answer the button press so Telegram stops the loading spinner.

**Done when:** pressing Accept sends the acceptance email and updates the message.

### Step 4.4: Add the email templates
Use the texts from `enrollhub-content.md` (section 5):
- Accepted email
- Rejected email
- Waitlist confirmation

Replace `{name}` and `{offer}` with the real values before sending.

**Done when:** each email shows the customer's name and offer correctly.

### Step 4.5: Send the confirmation to the customer
After a registration is saved, send the customer a confirmation email (from the content pack, section 5 or a new one). This tells them their registration was received.

**Done when:** every new registration sends the customer a confirmation.

### Step 4.6: Send the message to the second person
Send the second person the same registration details through Telegram (add them as a second chat ID, or use a group). Their message is in `enrollhub-content.md` (section 6).

**Done when:** the second person gets every new registration with the voice file.

---

## Phase 5: Admin Dashboard

### Step 5.1: Build the admin API
Add endpoints for the dashboard:
- `GET /api/registrations`: list registrations, with filters for offer and status.
- `PATCH /api/registrations/:id`: update status and notes.
- `GET /api/offers`, `PATCH /api/offers/:id`: list and update offers (title, price, seats, status).
- `GET /api/messages`: message log with success or failure.

**Done when:** each endpoint returns the right data.

### Step 5.2: Protect the admin API
Every `/api/admin` route must check that the user is logged in. Only the admin can see or change data.

**Done when:** a request without login gets a 401 error.

### Step 5.3: Build the Dashboard page
Create `src/pages/admin/Dashboard.jsx`:
- Stat cards (total, new this week, accepted, failed messages)
- Registrations by day and by offer
- A table with name, offer, age, language, level, residence, email, phone, voice play button, status
- Filter tabs (All, New, Contacted, Accepted, Rejected)
- Search box and Export CSV button

**Done when:** the table loads real data and the filters work.

### Step 5.4: Build the Manage offers page
Create `src/pages/admin/Offers.jsx`:
- One card per offer with title, price, seat limit, closing date
- Seats taken progress bar
- Toggle to accept or stop registrations
- Save changes button

**Done when:** changing a seat limit updates the offer on the website.

### Step 5.5: Build the Messages page
Create `src/pages/admin/Messages.jsx`:
- Editable text for the customer confirmation and the second person message
- Variable chips (`{name}`, `{offer}`, `{phone}`)
- Message log with Delivered or Failed status and a Retry button

**Done when:** an edited template is used for the next message.

### Step 5.6: Add real login
Replace the test login with real authentication:
- Option A: Supabase Auth (email and password)
- Option B: a simple admin password stored as a hash, plus a session cookie

Limit login attempts to protect against password guessing.

**Done when:** only the correct password lets you into `/admin`.

### Step 5.7: Connect the dashboard to the database
Replace the sample data with real API calls in every admin page.

**Done when:** the dashboard shows the real registrations.

---

## Phase 6: WhatsApp (Optional, Later)

Only do this phase if you want to message customers on WhatsApp. It costs money per message and needs approval from Meta.

### Step 6.1: Set up the WhatsApp Business account
1. Create a Meta Business account at business.facebook.com.
2. Verify the business with official documents. This can take days.
3. Create an app at developers.facebook.com and add the WhatsApp product.
4. Add a new phone number that is not used on WhatsApp or WhatsApp Business.

### Step 6.2: Create a permanent access token
Create a System User in Business Settings and generate a token with the `whatsapp_business_messaging` permission. Save it in `.env`.

### Step 6.3: Create and approve message templates
Create these templates in WhatsApp Manager, using the **Utility** category:
- `registration_confirmation`
- `registration_accepted`

Use the texts in `enrollhub-content.md` (section 7). Wait for Meta to approve them.

### Step 6.4: Send messages from the backend
Call the WhatsApp Cloud API with the approved template name and parameters. Phone numbers must include the country code, for example `201001234567` (no `+`, no spaces).

### Step 6.5: Set up the webhook for delivery status
Register a webhook URL in the WhatsApp settings and verify it. This tells you when a message is delivered, read, or failed, and you can show it in the message log.

**Costs to know:** a template message outside the 24-hour customer window is charged. Utility templates are cheaper than marketing templates. Check the current rates at developers.facebook.com/docs/whatsapp/pricing.

---

## Phase 7: Testing

### Step 7.1: Test the customer flow
- Register for each offer, with and without a voice file.
- Try missing fields, a wrong email, and a file bigger than 10 MB.
- Try registering without ticking the consent box.
- Test the sold out offer and the waitlist form.
- Test on a phone screen.

**Done when:** every case shows the right result.

### Step 7.2: Test the admin flow
- Log in with the right and wrong password.
- Accept and reject a registration. Check the customer email.
- Try pressing Accept twice. The second press should do nothing.
- Change a seat limit and check the website.
- Edit a message template and check the next message.

**Done when:** every admin action works.

### Step 7.3: Test on different browsers and devices
Check the site on Chrome, Safari, Firefox, and on Android and iPhone. Check that the audio upload works on each.

**Done when:** the site works on all the browsers and devices you tested.

---

## Phase 8: Deployment

### Step 8.1: Prepare the production settings
- Change `FRONTEND_URL` to your real website address.
- Make sure every secret is in the hosting provider's environment settings, not in code.
- Build the frontend: `npm run build`.

### Step 8.2: Deploy the frontend
Deploy the `frontend` folder to Vercel or Netlify. Add a rewrite rule so that refreshing `/admin` does not show a 404:
- Vercel: `vercel.json` with `{"rewrites":[{"source":"/(.*)","destination":"/"}]}`
- Netlify: `public/_redirects` with `/* /index.html 200`

### Step 8.3: Deploy the backend
Deploy the `backend` folder to Render, Railway, or another host. Set the environment variables there. Update the frontend's API address to the backend's public URL.

### Step 8.4: Connect your domain
Point your domain to the frontend host. Set up HTTPS (most hosts do this automatically).

### Step 8.5: Set up the Telegram webhook on the live server
Set the webhook to your backend's public address so the accept and reject buttons work.

### Step 8.6: Set up backups
Back up the database regularly. Keep the voice files in storage with a clear retention period, as stated in the privacy policy.

**Done when:** the live site works end to end.

---

## Phase 9: Launch and Operations

### Step 9.1: Final checklist before launch
- [ ] All placeholders in the content pack replaced
- [ ] Offers and seat numbers entered in the database
- [ ] Consent text and privacy policy approved by a lawyer
- [ ] Resend domain verified
- [ ] Telegram bot works, with the owner and second person receiving messages
- [ ] Test registration received with all details and the voice file
- [ ] Accept and reject emails received
- [ ] Mobile layout checked
- [ ] Admin login works and is protected
- [ ] Backups and error alerts set up

### Step 9.2: Launch
Share the website link. Start with a small group to find problems before a full launch.

### Step 9.3: Watch the first week closely
- Check the message log for failed messages.
- Check the registration numbers and fix any form problems.
- Read customer feedback and adjust the FAQ.

### Step 9.4: Ongoing maintenance
- Renew the domain and check hosting limits every month.
- Check Resend usage against the free limit.
- Remove voice files and personal data when the retention period ends.
- Update the content pack when offers change.

---

## Quick Reference: Folder Structure

```
enrollhub/
├── enrollhub-frontend/          (React + Vite + Tailwind)
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── components/
│       │   └── Header.jsx
│       ├── data/
│       │   └── offers.js
│       ├── pages/
│       │   ├── Welcome.jsx
│       │   ├── Offer.jsx
│       │   ├── OfferSoldOut.jsx
│       │   ├── Thanks.jsx
│       │   ├── Login.jsx
│       │   └── admin/
│       │       ├── Dashboard.jsx
│       │       ├── Offers.jsx
│       │       └── Messages.jsx
│       └── services/
│           └── api.js
└── enrollhub-backend/           (Node.js + Express)
    ├── index.js
    ├── .env                     (never commit this file)
    └── (routes, database, telegram, email services as the project grows)
```

---

## Quick Reference: Order of Work

1. Phase 0: content and accounts
2. Phase 1: design approval
3. Phase 2: frontend pages
4. Phase 3: backend and Telegram notifications (**first working version**)
5. Phase 4: accept and reject with emails
6. Phase 5: admin dashboard and real login
7. Phase 7: testing
8. Phase 8: deployment
9. Phase 9: launch
10. Phase 6: WhatsApp (optional, anytime after launch)
