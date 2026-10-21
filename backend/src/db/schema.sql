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
  location          text NOT NULL DEFAULT '',
  price             text NOT NULL DEFAULT '',
  duration          text NOT NULL DEFAULT '',
  included          jsonb NOT NULL DEFAULT '[]'::jsonb,
  seats_total       integer NOT NULL DEFAULT 0 CHECK (seats_total >= 0),
  seats_taken       integer NOT NULL DEFAULT 0 CHECK (seats_taken >= 0),
  closes_at         date,
  status            text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'soldout', 'paused', 'closed')),
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
  status              text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'offered', 'accepted', 'rejected', 'declined')),
  notes               text,
  follow_up_at        date,
  status_token        text,
  offered_at          timestamptz,
  responded_at        timestamptz,
  whatsapp_confirmed  boolean NOT NULL DEFAULT false,
  telegram_message_id bigint,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS registrations_offer_idx ON registrations (offer_id);
CREATE INDEX IF NOT EXISTS registrations_recent_idx ON registrations (email, phone, created_at);
CREATE INDEX IF NOT EXISTS registrations_status_idx ON registrations (status);

CREATE TABLE IF NOT EXISTS waitlist (
  id               serial PRIMARY KEY,
  offer_id         integer NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  name             text NOT NULL,
  phone            text NOT NULL,
  email            text,
  status           text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'contacted', 'offered', 'accepted', 'declined')),
  notes            text,
  follow_up_at     date,
  place_opened_on  date,
  status_token     text,
  contacted_at     timestamptz,
  offered_at       timestamptz,
  responded_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS waitlist_offer_idx ON waitlist (offer_id);

CREATE TABLE IF NOT EXISTS contact_messages (
  id         serial PRIMARY KEY,
  name       text NOT NULL,
  email      text,
  message    text NOT NULL,
  type       text NOT NULL DEFAULT 'question',
  page_url   text NOT NULL DEFAULT '',
  user_agent text NOT NULL DEFAULT '',
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

-- Follow-up and private status links were added after the first release. Every
-- ALTER is additive, so existing applications and waitlist rows are untouched.
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS follow_up_at date;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS status_token text;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS offered_at timestamptz;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS responded_at timestamptz;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS registrations_follow_up_idx ON registrations (follow_up_at);
CREATE UNIQUE INDEX IF NOT EXISTS registrations_status_token_idx ON registrations (status_token) WHERE status_token IS NOT NULL;

ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'waiting';
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS follow_up_at date;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS place_opened_on date;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS status_token text;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS contacted_at timestamptz;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS offered_at timestamptz;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS responded_at timestamptz;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS waitlist_status_idx ON waitlist (status);
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_status_token_idx ON waitlist (status_token) WHERE status_token IS NOT NULL;

-- Message-log rows keep the waitlist entry they belong to, so a privacy
-- deletion can remove both the entry and every personal-data log in one go.
ALTER TABLE messages_log ADD COLUMN IF NOT EXISTS waitlist_id integer REFERENCES waitlist(id) ON DELETE SET NULL;

-- Job locations were added after the first release; this keeps an existing
-- database in step with the CREATE TABLE above.
ALTER TABLE offers ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT '';

-- Contact reports can now come from a visitor without an email, and carry the
-- kind of report plus the page and browser they came from. Existing rows keep
-- the defaults, so nothing is rewritten.
ALTER TABLE contact_messages ALTER COLUMN email DROP NOT NULL;
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'question';
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS page_url text NOT NULL DEFAULT '';
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS user_agent text NOT NULL DEFAULT '';

-- Admin sessions are stored in Postgres so a server restart does not sign the
-- owner out. The table matches express-session/connect-pg-simple's expected
-- shape; expire is timestamptz so it is independent of the server timezone.
CREATE TABLE IF NOT EXISTS session (
  sid    varchar NOT NULL COLLATE "default",
  sess   json NOT NULL,
  expire timestamptz NOT NULL,
  CONSTRAINT session_pkey PRIMARY KEY (sid)
);

CREATE INDEX IF NOT EXISTS session_expire_idx ON session (expire);

-- Offers can be put on hold without being removed. This widens the existing
-- status check in place; it does not rewrite or delete any offer rows, and it
-- is a no-op once the constraint already accepts 'paused'.
DO $$
DECLARE
  status_constraint record;
  has_paused boolean := false;
BEGIN
  FOR status_constraint IN
    SELECT conname, pg_get_constraintdef(oid) AS definition
    FROM pg_constraint
    WHERE conrelid = 'offers'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%status%'
  LOOP
    IF status_constraint.definition LIKE '%paused%' THEN
      has_paused := true;
    ELSE
      EXECUTE format('ALTER TABLE offers DROP CONSTRAINT %I', status_constraint.conname);
    END IF;
  END LOOP;

  IF NOT has_paused THEN
    ALTER TABLE offers ADD CONSTRAINT offers_status_check
      CHECK (status IN ('active', 'soldout', 'paused', 'closed'));
  END IF;
END $$;

-- Applications now move through an explicit offer/acceptance step: an admin
-- offers a place, and only the applicant can accept or decline it. Existing
-- databases keep their rows; only the allowed values are widened.
DO $$
DECLARE
  status_constraint record;
  has_offer_states boolean := false;
BEGIN
  FOR status_constraint IN
    SELECT conname, pg_get_constraintdef(oid) AS definition
    FROM pg_constraint
    WHERE conrelid = 'registrations'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%status%'
  LOOP
    IF status_constraint.definition LIKE '%offered%'
       AND status_constraint.definition LIKE '%declined%' THEN
      has_offer_states := true;
    ELSE
      EXECUTE format('ALTER TABLE registrations DROP CONSTRAINT %I', status_constraint.conname);
    END IF;
  END LOOP;

  IF NOT has_offer_states THEN
    ALTER TABLE registrations ADD CONSTRAINT registrations_status_check
      CHECK (status IN ('new', 'contacted', 'offered', 'accepted', 'rejected', 'declined'));
  END IF;
END $$;

-- Waitlists use the same private-link flow, with one extra state: waiting.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'waitlist'::regclass
      AND conname = 'waitlist_status_check'
  ) THEN
    ALTER TABLE waitlist ADD CONSTRAINT waitlist_status_check
      CHECK (status IN ('waiting', 'contacted', 'offered', 'accepted', 'declined'));
  END IF;
END $$;
