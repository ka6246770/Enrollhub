-- EnrollHub schema. Safe to run repeatedly (CREATE ... IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS admins (
  id            serial PRIMARY KEY,
  email         text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS offers (
  id                serial PRIMARY KEY,
  slug              text UNIQUE NOT NULL,
  title             text NOT NULL,
  description       text NOT NULL DEFAULT '',
  short_description text NOT NULL DEFAULT '',
  price             text NOT NULL DEFAULT '',
  duration          text NOT NULL DEFAULT '',
  included          jsonb NOT NULL DEFAULT '[]'::jsonb,
  seats_total       integer NOT NULL DEFAULT 0 CHECK (seats_total >= 0),
  seats_taken       integer NOT NULL DEFAULT 0 CHECK (seats_taken >= 0),
  closes_at         date,
  status            text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'soldout', 'closed')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS registrations (
  id                  serial PRIMARY KEY,
  offer_id            integer NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  name                text NOT NULL,
  age                 integer,
  language            text,
  level               text,
  residence           text,
  email               text NOT NULL,
  phone               text NOT NULL,
  voice_path          text,
  voice_mime          text,
  consent_at          timestamptz NOT NULL DEFAULT now(),
  status              text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'accepted', 'rejected')),
  notes               text,
  whatsapp_confirmed  boolean NOT NULL DEFAULT false,
  telegram_message_id bigint,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS registrations_offer_idx ON registrations (offer_id);
CREATE INDEX IF NOT EXISTS registrations_recent_idx ON registrations (email, phone, created_at);
CREATE INDEX IF NOT EXISTS registrations_status_idx ON registrations (status);

CREATE TABLE IF NOT EXISTS waitlist (
  id         serial PRIMARY KEY,
  offer_id   integer NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  name       text NOT NULL,
  phone      text NOT NULL,
  email      text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS waitlist_offer_idx ON waitlist (offer_id);

CREATE TABLE IF NOT EXISTS contact_messages (
  id         serial PRIMARY KEY,
  name       text NOT NULL,
  email      text NOT NULL,
  message    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Every outbound notification (Telegram or email) is recorded here so the
-- dashboard's message log can show delivered / failed / skipped.
CREATE TABLE IF NOT EXISTS messages_log (
  id              serial PRIMARY KEY,
  registration_id integer REFERENCES registrations(id) ON DELETE SET NULL,
  channel         text NOT NULL,
  type            text NOT NULL,
  recipient       text,
  status          text NOT NULL,
  error           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_log_created_idx ON messages_log (created_at DESC);

-- The texts the site sends, edited from the dashboard's Messages page. The keys
-- match `templateDefinitions` in src/config/templates.js, which supplies the
-- defaults and the required variables. A missing row falls back to that file.
--
-- updated_at is only set when someone edits the text in the dashboard, so a
-- seeded row (null) reads as "not edited yet" rather than "saved just now".
CREATE TABLE IF NOT EXISTS message_templates (
  key        text PRIMARY KEY,
  body       text NOT NULL,
  updated_at timestamptz
);

-- Safe on an existing table too: both are no-ops once applied.
ALTER TABLE message_templates ALTER COLUMN updated_at DROP NOT NULL;
ALTER TABLE message_templates ALTER COLUMN updated_at DROP DEFAULT;

-- The waitlist form asks for a phone number first, so the address is optional.
-- When one is given, that person also gets the confirmation email.
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS email text;
