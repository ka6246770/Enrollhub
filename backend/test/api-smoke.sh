#!/usr/bin/env bash
# End-to-end smoke test for the EnrollHub API.
#
#   npm run test:api
#   API=http://localhost:3001/api ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... npm run test:api
#
# Requires a running API, a migrated database and an admin account
# (`npm run admin:set -- <email> <password>`). Every run uses a unique email and
# creates (then archives) its own offer, so it can be repeated without touching
# the real offers or tripping the duplicate guard.
set -u

API="${API:-http://localhost:3001/api}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@enrollhub.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin12345}"

TMP="$(mktemp -d)"
JAR="$TMP/cookies.txt"
BODY="$TMP/body.json"
STAMP="$(date +%s)"
EMAIL="smoke.$STAMP@example.com"
PHONE="+1999$STAMP"
PASS=0
FAIL=0
SKIP=0
REG_ID=""
REG_STATUS_PATH=""
REG_TOKEN=""
REG_REFERENCE=""
NOTE_ID=""
NOTE_TWO_ID=""
PRIVACY_REG_ID=""
PRIVACY_REG_STATUS_PATH=""
WAITLIST_EMAIL="waiter.$STAMP@example.com"
WAITLIST_ID=""
WAITLIST_TOKEN=""
WAITLIST_ANON_ID=""
WAITLIST_ANON_TOKEN=""
ANY_SLUG=""
OPEN_SLUG=""
FIXTURE_ID=""
FIXTURE_SLUG=""
FIXTURE_HAS_APPLICANTS=0
OFFER_ID=""
PRICE_BEFORE=""

trap 'rm -rf "$TMP"' EXIT

# Smallest thing that looks like an MP3 to the signature check.
printf 'ID3\x03\x00\x00\x00\x00\x00\x00\xff\xfb\x90\x00' > "$TMP/voice.mp3"
# Bytes that are not audio at all.
printf 'definitely not audio' > "$TMP/bogus.mp3"

status() { curl -s -o "$BODY" -w "%{http_code}" "$@"; }

json() { node -e "const d=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));const v=eval(process.argv[2]);console.log(v===undefined||v===null?'':v)" "$BODY" "$1" 2>/dev/null; }

check() { # check <label> <expected> <actual>
  if [ "$2" = "$3" ]; then
    PASS=$((PASS + 1)); printf '  ok    %s → %s\n' "$1" "$3"
  else
    FAIL=$((FAIL + 1)); printf '  FAIL  %s → expected %s, got %s\n' "$1" "$2" "$3"
    head -c 240 "$BODY" | sed 's/^/          /'; echo
  fi
}

check_in() { # check_in <label> <actual> <expected...>
  local label="$1" actual="$2"; shift 2
  for expected in "$@"; do
    if [ "$expected" = "$actual" ]; then PASS=$((PASS + 1)); printf '  ok    %s → %s\n' "$label" "$actual"; return; fi
  done
  FAIL=$((FAIL + 1)); printf '  FAIL  %s → got %s, wanted one of: %s\n' "$label" "$actual" "$*"
}

# Same as `check`, but a 429 from the per-IP form limiter counts as a skip. The
# forms allow 20 submissions per IP per hour, so a second run within the hour
# legitimately cannot reach the validation logic. Restart the API (the limiter
# keeps its counters in memory) for a full run.
check_form() {
  local label="$1" expected="$2" actual="$3"
  if [ "$actual" = "429" ] && [ "$expected" != "429" ]; then
    SKIP=$((SKIP + 1)); printf '  skip  %s → 429 rate limited (form quota used; restart the API to re-run)\n' "$label"; return
  fi
  check "$label" "$expected" "$actual"
}

# Guards the checks that need the setup registration. Returns non-zero (and
# records a skip) when the rate limiter blocked that registration, so the later
# checks do not run against an empty id.
need_reg() {
  if [ -z "$REG_ID" ]; then
    SKIP=$((SKIP + 1)); printf '  skip  %s → needs the setup registration, which the form quota blocked\n' "$1"; return 1
  fi
  return 0
}

need_privacy_reg() {
  if [ -z "$PRIVACY_REG_ID" ]; then
    SKIP=$((SKIP + 1)); printf '  skip  %s → needs the second registration, which the form quota blocked\n' "$1"; return 1
  fi
  return 0
}

section() { printf '\n%s\n' "$1"; }

section 'Public offers'
check 'GET /offers' 200 "$(status "$API/offers")"
check 'GET /offers/does-not-exist' 404 "$(status "$API/offers/does-not-exist")"

# The suite creates its own offer with free seats. That keeps it independent of
# whatever the dev database currently contains, and the fixture is archived (not
# hard-deleted) at the end because it collects a registration and waitlist rows.
section 'Test fixture'
FIXTURE_JAR="$TMP/fixture-cookies.txt"
check 'fixture login' 200 "$(status -c "$FIXTURE_JAR" -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\",\"remember\":true}")"

FIXTURE_PAYLOAD="{\"title\":\"Smoke Fixture $STAMP\",\"description\":\"An offer created and archived by the API smoke test so the suite is self-contained.\",\"shortDescription\":\"Temporary smoke-test offer.\",\"location\":\"Cairo\",\"price\":\"1,000 EGP\",\"duration\":\"8-hour shifts\",\"included\":[\"Meal\"],\"seatsTotal\":5,\"closesAt\":\"2027-12-31\"}"
FIXTURE_STATUS="$(status -b "$FIXTURE_JAR" -X POST "$API/offers" -H 'Content-Type: application/json' -d "$FIXTURE_PAYLOAD")"
check 'create the test fixture offer' 201 "$FIXTURE_STATUS"
FIXTURE_ID="$(json 'd.id')"
FIXTURE_SLUG="$(json 'd.slug')"
OPEN_SLUG="$FIXTURE_SLUG"
ANY_SLUG="$FIXTURE_SLUG"
OFFER_ID="$FIXTURE_ID"
check 'fixture offer is public' 200 "$(status "$API/offers/$FIXTURE_SLUG")"

section 'Registration form'
if [ -z "$OPEN_SLUG" ]; then
  printf '  skip  registration checks → every offer in this database is full (re-seed or raise a seat limit)\n'
  SKIP=$((SKIP + 6))
else
  check_form 'valid registration' 201 "$(status -X POST "$API/registrations" \
    -F "name=Smoke Tester" -F 'age=27' -F 'language=English' -F 'level=Intermediate' \
    -F 'residence=Cairo, Egypt' -F "email=$EMAIL" -F "phone=$PHONE" \
    -F "offerSlug=$OPEN_SLUG" -F 'consent=on' \
    -F "recording=@$TMP/voice.mp3;type=audio/mpeg")"
  REG_ID="$(json 'd.id')"
  REG_STATUS_PATH="$(json 'd.statusPath')"
  REG_TOKEN="${REG_STATUS_PATH##*/}"
  REG_REFERENCE="$(json 'd.reference')"
  if [ -n "$REG_ID" ]; then FIXTURE_HAS_APPLICANTS=1; fi
  check 'registration returns a private status path' 'yes' \
    "$(printf '%s' "$REG_STATUS_PATH" | grep -Eq '^/status/reg_[A-Za-z0-9_-]+$' && echo yes || echo no)"
  check 'registration returns a reference code' 'yes' \
    "$(printf '%s' "$REG_REFERENCE" | grep -Eq '^ENR-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$' && echo yes || echo no)"
  if [ -n "$REG_TOKEN" ]; then
    check 'private status link works before an offer' 200 "$(status "$API/status/$REG_TOKEN")"
    check 'new application starts as received' 'new' "$(json 'd.status')"
  else
    SKIP=$((SKIP + 2)); printf '  skip  private status checks → no status path was returned\n'
  fi

  check_form 'duplicate registration' 409 "$(status -X POST "$API/registrations" \
    -F "name=Smoke Tester" -F 'age=27' -F "email=$EMAIL" -F "phone=$PHONE" \
    -F "offerSlug=$OPEN_SLUG" -F 'consent=on' \
    -F "recording=@$TMP/voice.mp3;type=audio/mpeg")"

  check_form 'missing consent' 400 "$(status -X POST "$API/registrations" \
    -F 'name=No Consent' -F 'age=27' -F "email=no-consent.$STAMP@example.com" -F "phone=+1998$STAMP" \
    -F "offerSlug=$OPEN_SLUG" -F "recording=@$TMP/voice.mp3;type=audio/mpeg")"

  check_form 'invalid email' 400 "$(status -X POST "$API/registrations" \
    -F 'name=Bad Email' -F 'age=abc' -F 'email=not-an-email' -F "phone=+1997$STAMP" \
    -F "offerSlug=$OPEN_SLUG" -F 'consent=on' -F "recording=@$TMP/voice.mp3;type=audio/mpeg")"

  check_form 'file that is not audio' 400 "$(status -X POST "$API/registrations" \
    -F "name=Not Audio" -F 'age=27' -F "email=not-audio.$STAMP@example.com" -F "phone=+1996$STAMP" \
    -F "offerSlug=$OPEN_SLUG" -F 'consent=on' -F "recording=@$TMP/bogus.mp3;type=audio/mpeg")"

  # A second application is used only for the deletion checks, so the first one
  # can survive archiving and the Telegram follow-up tests.
  check_form 'second registration for deletion' 201 "$(status -X POST "$API/registrations" \
    -F "name=Privacy Tester" -F 'age=31' -F "email=privacy.$STAMP@example.com" -F "phone=+1989$STAMP" \
    -F "offerSlug=$OPEN_SLUG" -F 'consent=on' \
    -F "recording=@$TMP/voice.mp3;type=audio/mpeg")"
  PRIVACY_REG_ID="$(json 'd.id')"
  PRIVACY_REG_STATUS_PATH="$(json 'd.statusPath')"
  if [ -n "$PRIVACY_REG_ID" ]; then FIXTURE_HAS_APPLICANTS=1; fi
fi

section 'Status tracking'
TRACK_IP='198.51.100.31'
if [ -n "$REG_REFERENCE" ]; then
  check 'lookup with a wrong reference' 404 "$(status -H "X-Forwarded-For: $TRACK_IP" -X POST "$API/status/lookup" \
    -H 'Content-Type: application/json' -d "{\"reference\":\"ENR-22222222\",\"email\":\"$EMAIL\"}")"
  WRONG_REFERENCE_MESSAGE="$(json 'd.message')"
  check 'wrong reference gets the generic answer' "We couldn't find a match. Check the reference code and the email address you applied with." "$WRONG_REFERENCE_MESSAGE"

  check 'lookup with a wrong email' 404 "$(status -H "X-Forwarded-For: $TRACK_IP" -X POST "$API/status/lookup" \
    -H 'Content-Type: application/json' -d "{\"reference\":\"$REG_REFERENCE\",\"email\":\"wrong.$STAMP@example.com\"}")"
  check 'wrong email gets the same generic answer' "$WRONG_REFERENCE_MESSAGE" "$(json 'd.message')"

  check 'lookup without an email' 400 "$(status -H "X-Forwarded-For: $TRACK_IP" -X POST "$API/status/lookup" \
    -H 'Content-Type: application/json' -d "{\"reference\":\"$REG_REFERENCE\"}")"

  check 'lookup with the right pair' 200 "$(status -H "X-Forwarded-For: $TRACK_IP" -X POST "$API/status/lookup" \
    -H 'Content-Type: application/json' -d "{\"reference\":\"$REG_REFERENCE\",\"email\":\"$EMAIL\"}")"
  check 'tracking shows the received status' 'received' "$(json 'd.status')"
  check 'tracking returns only the public fields' 'message,offerTitle,ok,position,reference,status,submittedAt' \
    "$(json 'Object.keys(d).sort().join(",")')"
  check 'tracking hides personal and private data' 'clean' \
    "$(json "['email','phone','name','notes','voiceUrl','voicePath','statusToken'].some((key) => key in d) ? 'leak' : 'clean'")"

  check 'resend for a registered email' 200 "$(status -H 'X-Forwarded-For: 198.51.100.32' -X POST "$API/status/resend-reference" \
    -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\"}")"
  check 'resend answer is generic' 'If this email is registered, we sent the code.' "$(json 'd.message')"
  check 'resend for an unknown email' 200 "$(status -H 'X-Forwarded-For: 198.51.100.32' -X POST "$API/status/resend-reference" \
    -H 'Content-Type: application/json' -d "{\"email\":\"nobody.$STAMP@example.com\"}")"
  check 'unknown email gets the same resend answer' 'If this email is registered, we sent the code.' "$(json 'd.message')"

  TRACK_RATE_STATUS=0
  for _ in 1 2 3 4 5 6 7 8 9 10 11 12; do
    TRACK_RATE_STATUS="$(status -H 'X-Forwarded-For: 198.51.100.33' -X POST "$API/status/lookup" \
      -H 'Content-Type: application/json' -d "{\"reference\":\"$REG_REFERENCE\",\"email\":\"$EMAIL\"}")"
    [ "$TRACK_RATE_STATUS" = "429" ] && break
  done
  check 'lookup rate limit stops repeated guesses' 429 "$TRACK_RATE_STATUS"
else
  SKIP=$((SKIP + 14)); printf '  skip  status tracking checks → no reference code was returned\n'
fi

check_form 'unknown offer' 404 "$(status -X POST "$API/registrations" \
  -F "name=No Offer" -F 'age=27' -F "email=no-offer.$STAMP@example.com" -F "phone=+1995$STAMP" \
  -F 'offerSlug=nope' -F 'consent=on' -F "recording=@$TMP/voice.mp3;type=audio/mpeg")"

section 'Waitlist'
check_form 'waitlist requires consent' 400 "$(status -X POST "$API/waitlist" -H 'Content-Type: application/json' \
  -d "{\"name\":\"No Consent\",\"email\":\"no-wait-consent.$STAMP@example.com\",\"phone\":\"+1992$STAMP\",\"offerSlug\":\"$ANY_SLUG\"}")"
WAITLIST_EMAIL_STATUS="$(status -X POST "$API/waitlist" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Waiter\",\"email\":\"$WAITLIST_EMAIL\",\"phone\":\"+1994$STAMP\",\"offerSlug\":\"$ANY_SLUG\",\"consent\":true}")"
check_form 'join waitlist with an email' 201 "$WAITLIST_EMAIL_STATUS"
WAITLIST_ANON_STATUS="$(status -X POST "$API/waitlist" -H 'Content-Type: application/json' \
  -d "{\"name\":\"No Email\",\"phone\":\"+1993$STAMP\",\"offerSlug\":\"$ANY_SLUG\",\"consent\":true}")"
check_form 'join waitlist without an email' 201 "$WAITLIST_ANON_STATUS"
if [ "$WAITLIST_EMAIL_STATUS" = "201" ] || [ "$WAITLIST_ANON_STATUS" = "201" ]; then
  FIXTURE_HAS_APPLICANTS=1
fi
check_form 'waitlist with a broken email' 400 "$(status -X POST "$API/waitlist" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Bad Email\",\"email\":\"not-an-email\",\"phone\":\"+1992$STAMP\",\"offerSlug\":\"$ANY_SLUG\",\"consent\":true}")"
check_form 'waitlist unknown offer' 404 "$(status -X POST "$API/waitlist" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Waiter\",\"email\":\"waiter2.$STAMP@example.com\",\"phone\":\"+1993000$STAMP\",\"offerSlug\":\"nope\",\"consent\":true}")"

section 'Contact form'
check_form 'contact message' 201 "$(status -X POST "$API/messages" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Visitor\",\"email\":\"visitor.$STAMP@example.com\",\"message\":\"Hello, I have a question.\"}")"
check_form 'contact message too short' 400 "$(status -X POST "$API/messages" -H 'Content-Type: application/json' \
  -d '{"name":"Visitor","email":"visitor2@example.com","message":"hi"}')"
check_form 'problem report without an email' 201 "$(status -X POST "$API/messages" -H 'Content-Type: application/json' \
  -d '{"name":"Reporter","message":"The upload button does not work on this page.","type":"problem","pageUrl":"https://example.com/offers/test","userAgent":"SmokeTest/1.0"}')"
check_form 'question without an email' 400 "$(status -X POST "$API/messages" -H 'Content-Type: application/json' \
  -d '{"name":"Visitor","message":"I have a question about the schedule.","type":"question"}')"
check_form 'unknown report type' 400 "$(status -X POST "$API/messages" -H 'Content-Type: application/json' \
  -d '{"name":"Visitor","email":"visitor3@example.com","message":"This type is not allowed.","type":"spam"}')"
LONG_MESSAGE="$(head -c 4001 /dev/zero | tr '\0' 'x')"
check_form 'contact message too long' 400 "$(status -X POST "$API/messages" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Visitor\",\"email\":\"visitor4@example.com\",\"message\":\"$LONG_MESSAGE\"}")"

section 'Admin authentication'
check 'registrations without a session' 401 "$(status "$API/registrations")"
check 'waitlist without a session' 401 "$(status "$API/waitlist")"
need_reg 'voice note without a session' && check 'voice note without a session' 401 "$(status "$API/registrations/$REG_ID/voice")"
check 'login with a wrong password' 401 "$(status -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"definitely-wrong\"}")"
LOGIN_STATUS="$(curl -s -D "$TMP/login.headers" -o "$BODY" -w '%{http_code}' -c "$JAR" \
  -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\",\"remember\":true}")"
check 'login' 200 "$LOGIN_STATUS"
check 'remembered login sets a persistent cookie' 'yes' \
  "$(grep -qi '^set-cookie: enrollhub.sid=.*expires=' "$TMP/login.headers" && echo yes || echo no)"
check 'session lookup' 200 "$(status -b "$JAR" "$API/auth/me")"
SHORT_LOGIN_STATUS="$(curl -s -D "$TMP/login-short.headers" -o "$BODY" -w '%{http_code}' -c "$TMP/short-cookies.txt" \
  -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\",\"remember\":false}")"
check 'session-only login' 200 "$SHORT_LOGIN_STATUS"
check 'session-only login has no persistent expiry' 'no' \
  "$(grep -qi '^set-cookie: enrollhub.sid=.*expires=' "$TMP/login-short.headers" && echo yes || echo no)"

section 'Admin reads'
check 'list registrations' 200 "$(status -b "$JAR" "$API/registrations")"
check 'filtered list' 200 "$(status -b "$JAR" "$API/registrations?status=new&q=smoke")"
check 'filter by recording' 200 "$(status -b "$JAR" "$API/registrations?recording=yes&date=$(date +%Y-%m-%d)")"
need_reg 'voice note with a session' && check 'voice note with a session' 200 "$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" "$API/registrations/$REG_ID/voice")"

check 'list waitlist entries' 200 "$(status -b "$JAR" "$API/waitlist")"
status -b "$JAR" "$API/waitlist?q=$WAITLIST_EMAIL" >/dev/null
WAITLIST_ID="$(json 'd[0]?.id')"
status -b "$JAR" "$API/waitlist?q=1993$STAMP" >/dev/null
WAITLIST_ANON_ID="$(json 'd[0]?.id')"
check 'waitlist search finds the email entry' 'yes' "$([ -n "$WAITLIST_ID" ] && echo yes || echo no)"
check 'waitlist search finds the no-email entry' 'yes' "$([ -n "$WAITLIST_ANON_ID" ] && echo yes || echo no)"

check 'message log' 200 "$(status -b "$JAR" "$API/messages")"
check 'channel + template status' 200 "$(status -b "$JAR" "$API/messages/status")"
check 'contact report is in the message log' 'contact_report' "$(status -b "$JAR" "$API/messages" >/dev/null; json "d.find((m) => m.type === 'contact_report')?.type")"
check_in 'contact report email has a status' "$(status -b "$JAR" "$API/messages" >/dev/null; json "d.find((m) => m.type === 'contact_report')?.status")" 'delivered' 'skipped' 'failed'
check_in 'contact telegram alert has a status' "$(status -b "$JAR" "$API/messages" >/dev/null; json "d.find((m) => m.type === 'contact')?.status")" 'delivered' 'skipped' 'failed'

section 'Admin writes'
need_reg 'offer a registration' && check 'offer a registration' 200 "$(status -b "$JAR" -X PATCH "$API/registrations/$REG_ID" \
  -H 'Content-Type: application/json' -d '{"status":"offered","notes":"Smoke test","followUpAt":"2026-10-20"}')"
need_reg 'the offer is stored' && check 'the offer is stored' 'offered' "$(json 'd.status')"
need_reg 'the private token is reused' && check 'the private token is reused' "$REG_TOKEN" "$(json 'd.statusToken')"
need_reg 'admin cannot confirm a place' && check 'admin cannot confirm a place' 400 "$(status -b "$JAR" -X PATCH "$API/registrations/$REG_ID" \
  -H 'Content-Type: application/json' -d '{"status":"accepted"}')"
need_reg 'invalid status' && check 'invalid status' 400 "$(status -b "$JAR" -X PATCH "$API/registrations/$REG_ID" \
  -H 'Content-Type: application/json' -d '{"status":"banana"}')"

need_reg 'admin can recreate a private link' && check 'admin can recreate a private link' 200 "$(status -b "$JAR" -X POST "$API/registrations/$REG_ID/status-link")"
need_reg 'the recreated link is the same token' && check 'the recreated link is the same token' "$REG_TOKEN" "$(json 'd.statusToken')"
if [ -n "$REG_TOKEN" ]; then
  check 'private status shows the offer' 'offered' "$(status "$API/status/$REG_TOKEN" >/dev/null; json 'd.status')"
  check 'private status allows a response' 'true' "$(status "$API/status/$REG_TOKEN" >/dev/null; json 'd.canRespond')"
  check 'applicant accepts the private offer' 200 "$(status -H 'X-Forwarded-For: 198.51.100.21' -X POST "$API/status/$REG_TOKEN/respond" \
    -H 'Content-Type: application/json' -d '{"decision":"accept"}')"
  check 'applicant acceptance is confirmed' 'accepted' "$(json 'd.status')"
  check 'a second response is rejected' 409 "$(status -H 'X-Forwarded-For: 198.51.100.21' -X POST "$API/status/$REG_TOKEN/respond" \
    -H 'Content-Type: application/json' -d '{"decision":"decline"}')"
else
  SKIP=$((SKIP + 5)); printf '  skip  private acceptance checks → no private token\n'
fi

section 'Private notes'
if need_reg 'private notes'; then
  check 'notes need a session' 401 "$(status "$API/admin/registrations/$REG_ID/notes")"
  check 'adding a note needs a session' 401 "$(status -X POST "$API/admin/registrations/$REG_ID/notes" \
    -H 'Content-Type: application/json' -d '{"body":"Hidden"}')"

  check 'add the first note' 201 "$(status -b "$JAR" -X POST "$API/admin/registrations/$REG_ID/notes" \
    -H 'Content-Type: application/json' -d '{"body":"  Called about the shift.  "}')"
  NOTE_ID="$(json 'd.id')"
  check 'the note is trimmed' 'Called about the shift.' "$(json 'd.body')"
  check 'the note records the signed-in admin' "$ADMIN_EMAIL" "$(json 'd.author')"

  check 'add a second note' 201 "$(status -b "$JAR" -X POST "$API/admin/registrations/$REG_ID/notes" \
    -H 'Content-Type: application/json' -d '{"body":"SMOKE-SECRET-NOTE wants a discount."}')"
  NOTE_TWO_ID="$(json 'd.id')"

  check 'list notes' 200 "$(status -b "$JAR" "$API/admin/registrations/$REG_ID/notes")"
  check 'the newest note comes first' "$NOTE_TWO_ID" "$(json 'd[0]?.id')"
  check 'both notes are listed' 2 "$(json 'd.length')"

  check 'an empty note is rejected' 400 "$(status -b "$JAR" -X POST "$API/admin/registrations/$REG_ID/notes" \
    -H 'Content-Type: application/json' -d '{"body":"   "}')"
  LONG_NOTE="$(head -c 1001 /dev/zero | tr '\0' 'x')"
  check 'a note over 1000 characters is rejected' 400 "$(status -b "$JAR" -X POST "$API/admin/registrations/$REG_ID/notes" \
    -H 'Content-Type: application/json' -d "{\"body\":\"$LONG_NOTE\"}")"

  status -b "$JAR" "$API/registrations?q=$EMAIL" >/dev/null
  check 'the list includes the note count' 2 "$(json "d.find((r) => r.id === $REG_ID)?.noteCount")"
  check 'the list includes note text for search' 'yes' \
    "$(json "d.find((r) => r.id === $REG_ID)?.noteText?.includes('SMOKE-SECRET-NOTE') ? 'yes' : 'no'")"
  check 'server search finds a note body' "$REG_ID" \
    "$(status -b "$JAR" "$API/registrations?q=SMOKE-SECRET-NOTE" >/dev/null; json 'd[0]?.id')"

  status -H 'X-Forwarded-For: 198.51.100.34' -X POST "$API/status/lookup" \
    -H 'Content-Type: application/json' -d "{\"reference\":\"$REG_REFERENCE\",\"email\":\"$EMAIL\"}" >/dev/null
  check 'public tracking hides notes' 'clean' \
    "$(json "JSON.stringify(d).includes('SMOKE-SECRET-NOTE') ? 'leak' : 'clean'")"
  check 'the private status page hides notes' 'clean' \
    "$(status "$API/status/$REG_TOKEN" >/dev/null; json "JSON.stringify(d).includes('SMOKE-SECRET-NOTE') ? 'leak' : 'clean'")"

  check 'edit a note' 200 "$(status -b "$JAR" -X PATCH "$API/admin/notes/$NOTE_ID" \
    -H 'Content-Type: application/json' -d '{"body":"Called twice."}')"
  check 'the edit is stored' 'Called twice.' "$(json 'd.body')"
  check 'a note cannot be edited to empty' 400 "$(status -b "$JAR" -X PATCH "$API/admin/notes/$NOTE_ID" \
    -H 'Content-Type: application/json' -d '{"body":"   "}')"

  check 'delete the second note' 204 "$(status -b "$JAR" -X DELETE "$API/admin/notes/$NOTE_TWO_ID")"
  check 'one note remains' 1 "$(status -b "$JAR" "$API/admin/registrations/$REG_ID/notes" >/dev/null; json 'd.length')"
  check 'delete a note that is gone' 404 "$(status -b "$JAR" -X DELETE "$API/admin/notes/$NOTE_TWO_ID")"
  check 'delete the first note' 204 "$(status -b "$JAR" -X DELETE "$API/admin/notes/$NOTE_ID")"
  check 'the note list is empty again' 0 "$(status -b "$JAR" "$API/admin/registrations/$REG_ID/notes" >/dev/null; json 'd.length')"
else
  SKIP=$((SKIP + 24)); printf '  skip  private notes → no setup registration\n'
fi

section 'Waitlist follow-up'
if [ -n "$WAITLIST_ANON_ID" ]; then
  check 'save waitlist notes and a follow-up date' 200 "$(status -b "$JAR" -X PATCH "$API/waitlist/$WAITLIST_ANON_ID" \
    -H 'Content-Type: application/json' -d '{"notes":"Smoke follow-up","followUpAt":"2026-10-20"}')"
  check 'waitlist notes are stored' 'Smoke follow-up' "$(json 'd.notes')"
else
  SKIP=$((SKIP + 2)); printf '  skip  waitlist notes → no searchable waitlist entry\n'
fi

if [ -n "$WAITLIST_ID" ] && [ -n "$WAITLIST_ANON_ID" ]; then
  check 'bulk offer to multiple waitlist contacts' 200 "$(status -b "$JAR" -X POST "$API/waitlist/offer" \
    -H 'Content-Type: application/json' -d "{\"ids\":[$WAITLIST_ID,$WAITLIST_ANON_ID],\"placeOpenedOn\":\"2026-10-21\"}")"
  check 'bulk offer returns one result per contact' '2' "$(json 'd.results.length')"
  WAITLIST_TOKEN="$(json "d.results.find((r) => r.id === $WAITLIST_ID)?.statusToken")"
  WAITLIST_ANON_TOKEN="$(json "d.results.find((r) => r.id === $WAITLIST_ANON_ID)?.statusToken")"
  check 'waitlist offer creates a wl_ token' 'yes' "$(printf '%s' "$WAITLIST_TOKEN" | grep -Eq '^wl_' && echo yes || echo no)"
  check 'waitlist offer creates a private url' 'yes' "$(json "d.results.find((r) => r.id === $WAITLIST_ID)?.statusUrl?.startsWith('http') ? 'yes' : 'no'")"

  check 'applicant accepts a waitlist place' 200 "$(status -H 'X-Forwarded-For: 198.51.100.22' -X POST "$API/status/$WAITLIST_TOKEN/respond" \
    -H 'Content-Type: application/json' -d '{"decision":"accept"}')"
  check 'waitlist acceptance is confirmed' 'accepted' "$(json 'd.status')"
  check 'applicant declines the second waitlist place' 200 "$(status -H 'X-Forwarded-For: 198.51.100.23' -X POST "$API/status/$WAITLIST_ANON_TOKEN/respond" \
    -H 'Content-Type: application/json' -d '{"decision":"decline"}')"
  check 'waitlist decline is recorded' 'declined' "$(json 'd.status')"
  check 'admin cannot confirm a waitlist place' 400 "$(status -b "$JAR" -X PATCH "$API/waitlist/$WAITLIST_ID" \
    -H 'Content-Type: application/json' -d '{"status":"accepted"}')"
  status -b "$JAR" "$API/waitlist?status=accepted&q=$WAITLIST_EMAIL" >/dev/null
  check 'accepted waitlist entry is in the accepted filter' 'accepted' "$(json 'd[0]?.status')"
else
  SKIP=$((SKIP + 9)); printf '  skip  waitlist offer checks → waitlist entries were not found\n'
fi

PRICE_BEFORE="$(status -b "$JAR" "$API/offers/$FIXTURE_SLUG" >/dev/null; json 'd.price')"
check 'update an offer' 200 "$(status -b "$JAR" -X PATCH "$API/offers/$OFFER_ID" \
  -H 'Content-Type: application/json' -d '{"price":"[SMOKE PRICE]"}')"
# Put the price back so the dev data stays as it was.
curl -s -o /dev/null -b "$JAR" -X PATCH "$API/offers/$OFFER_ID" -H 'Content-Type: application/json' \
  -d "{\"price\":\"$PRICE_BEFORE\"}"

section 'Offer management'
check 'offer creation needs a session' 401 "$(status -X POST "$API/offers" \
  -H 'Content-Type: application/json' -d '{}')"
check 'offer removal needs a session' 401 "$(status -X DELETE "$API/offers/$OFFER_ID")"
check 'offer creation is validated' 400 "$(status -b "$JAR" -X POST "$API/offers" \
  -H 'Content-Type: application/json' -d '{}')"

CREATE_PAYLOAD="{\"title\":\"Smoke Offer $STAMP\",\"description\":\"A throwaway offer used by the API smoke test.\",\"shortDescription\":\"Throwaway offer for the smoke test.\",\"location\":\"Cairo\",\"price\":\"1,000 EGP\",\"duration\":\"8-hour shifts\",\"included\":[\"Meal\",\"Transport\"],\"seatsTotal\":3,\"closesAt\":\"2027-12-31\"}"
CREATE_STATUS="$(status -b "$JAR" -X POST "$API/offers" -H 'Content-Type: application/json' -d "$CREATE_PAYLOAD")"
check 'create an offer' 201 "$CREATE_STATUS"
CREATE_ID="$(json 'd.id')"
CREATE_SLUG="$(json 'd.slug')"
check 'new offer starts active' 'active' "$(json 'd.status')"
check 'new offer slug comes from the title' "smoke-offer-$STAMP" "$CREATE_SLUG"
check 'new offer is public' 200 "$(status "$API/offers/$CREATE_SLUG")"
if [ -n "$CREATE_ID" ]; then
  check 'delete an offer with no applicants' 200 "$(status -b "$JAR" -X DELETE "$API/offers/$CREATE_ID")"
  check 'empty offer is deleted' true "$(json 'd.deleted')"
  check 'deleted offer is hidden' 404 "$(status "$API/offers/$CREATE_SLUG")"
else
  SKIP=$((SKIP + 3)); printf '  skip  empty-offer deletion → creation failed\n'
fi

PAUSE_PAYLOAD="{\"title\":\"Pause Test $STAMP\",\"description\":\"An offer put on hold by the smoke test.\",\"shortDescription\":\"Paused offer for the smoke test.\",\"location\":\"Cairo\",\"price\":\"1,000 EGP\",\"duration\":\"8-hour shifts\",\"included\":[],\"seatsTotal\":3,\"closesAt\":\"2027-12-31\"}"
PAUSE_CREATE_STATUS="$(status -b "$JAR" -X POST "$API/offers" -H 'Content-Type: application/json' -d "$PAUSE_PAYLOAD")"
check 'create an offer to pause' 201 "$PAUSE_CREATE_STATUS"
PAUSE_ID="$(json 'd.id')"
PAUSE_SLUG="$(json 'd.slug')"

if [ -n "$PAUSE_ID" ]; then
  check 'pause an offer' 200 "$(status -b "$JAR" -X PATCH "$API/offers/$PAUSE_ID" \
    -H 'Content-Type: application/json' -d '{"status":"paused"}')"
  check 'paused status is saved' 'paused' "$(json 'd.status')"
  check 'paused offer stays public' 200 "$(status "$API/offers/$PAUSE_SLUG")"
  check 'public detail returns the paused status' 'paused' "$(json 'd.status')"
  status "$API/offers" >/dev/null
  check 'paused offer is in the public list' 'paused' "$(json "d.find((o) => o.slug === '$PAUSE_SLUG')?.status")"

  PAUSE_REG_STATUS="$(status -X POST "$API/registrations" \
    -F "name=Paused Applicant" -F 'age=27' -F "email=paused.$STAMP@example.com" -F "phone=+1991$STAMP" \
    -F "offerSlug=$PAUSE_SLUG" -F 'consent=on' \
    -F "recording=@$TMP/voice.mp3;type=audio/mpeg")"
  check_form 'paused offer blocks registration' 409 "$PAUSE_REG_STATUS"
  if [ "$PAUSE_REG_STATUS" = "409" ]; then
    check_in 'paused registration message' "$(json 'd.message')" \
      'Registration is paused for this offer. Please check back later.'
  fi

  PAUSE_WAIT_STATUS="$(status -X POST "$API/waitlist" -H 'Content-Type: application/json' \
    -d "{\"name\":\"Paused Waiter\",\"email\":\"paused-wait.$STAMP@example.com\",\"phone\":\"+1990$STAMP\",\"offerSlug\":\"$PAUSE_SLUG\",\"consent\":true}")"
  check_form 'paused offer blocks the waitlist' 409 "$PAUSE_WAIT_STATUS"
  if [ "$PAUSE_WAIT_STATUS" = "409" ]; then
    check_in 'paused waitlist message' "$(json 'd.message')" \
      'Registration is paused for this offer. Please check back later.'
  fi

  check 'resume an offer' 200 "$(status -b "$JAR" -X PATCH "$API/offers/$PAUSE_ID" \
    -H 'Content-Type: application/json' -d '{"status":"active"}')"
  check 'resumed status is saved' 'active' "$(json 'd.status')"
  check 'delete the pause test offer' 200 "$(status -b "$JAR" -X DELETE "$API/offers/$PAUSE_ID")"
  check 'pause test offer is deleted' true "$(json 'd.deleted')"
else
  SKIP=$((SKIP + 11)); printf '  skip  pause checks → creation failed\n'
fi

section 'Automatic offer closure'
# The database runs in GMT, so its CURRENT_DATE can still be yesterday during
# the first hours of the local day. Build the fixture date in the same zone.
YESTERDAY="$(date -u -d 'yesterday' +%F)"
EXPIRED_PAYLOAD="{\"title\":\"Expired Smoke $STAMP\",\"description\":\"An offer that passed its closing date.\",\"shortDescription\":\"Expired smoke offer.\",\"location\":\"Cairo\",\"price\":\"1,000 EGP\",\"duration\":\"8-hour shifts\",\"included\":[],\"seatsTotal\":2,\"closesAt\":\"$YESTERDAY\"}"
check 'create an offer with a past closing date' 201 "$(status -b "$JAR" -X POST "$API/offers" -H 'Content-Type: application/json' -d "$EXPIRED_PAYLOAD")"
EXPIRED_ID="$(json 'd.id')"
EXPIRED_SLUG="$(json 'd.slug')"
if [ -n "$EXPIRED_ID" ]; then
  check 'expired offer is hidden from its direct page' 404 "$(status "$API/offers/$EXPIRED_SLUG")"
  status "$API/offers" >/dev/null
  check 'expired offer is hidden from the public list' '' "$(json "d.find((o) => o.slug === '$EXPIRED_SLUG')?.slug")"
  check 'expired offer can be deleted' 200 "$(status -b "$JAR" -X DELETE "$API/offers/$EXPIRED_ID")"
else
  SKIP=$((SKIP + 3)); printf '  skip  automatic closure checks → creation failed\n'
fi

section 'Privacy deletion'
if need_privacy_reg 'delete applicant details and recording'; then
  status "$API/offers/$FIXTURE_SLUG" >/dev/null
  SEATS_BEFORE="$(json 'd.seatsTaken')"
  check 'privacy deletion removes the applicant' 200 "$(status -b "$JAR" -X DELETE "$API/registrations/$PRIVACY_REG_ID")"
  check 'privacy deletion reports the recording removed' 'true' "$(json 'd.recordingRemoved')"
  check 'deleted applicant has no voice note' 404 "$(status -b "$JAR" "$API/registrations/$PRIVACY_REG_ID/voice")"
  status -b "$JAR" "$API/registrations?q=privacy.$STAMP@example.com" >/dev/null
  check 'deleted applicant is gone from the list' '' "$(json 'd[0]?.id')"
  PRIVACY_TOKEN="${PRIVACY_REG_STATUS_PATH##*/}"
  check 'deleted applicant private link is invalid' 404 "$(status "$API/status/$PRIVACY_TOKEN")"
  status "$API/offers/$FIXTURE_SLUG" >/dev/null
  check 'privacy deletion frees the seat' "$((SEATS_BEFORE - 1))" "$(json 'd.seatsTaken')"
fi
if [ -n "$WAITLIST_ID" ]; then
  check 'remove the accepted waitlist entry' 200 "$(status -b "$JAR" -X DELETE "$API/waitlist/$WAITLIST_ID")"
  check 'remove the declined waitlist entry' 200 "$(status -b "$JAR" -X DELETE "$API/waitlist/$WAITLIST_ANON_ID")"
else
  SKIP=$((SKIP + 2)); printf '  skip  waitlist removal → no waitlist entry\n'
fi

if [ -n "$FIXTURE_ID" ] && [ "$FIXTURE_HAS_APPLICANTS" = 1 ]; then
  check 'remove the fixture offer with applicants' 200 "$(status -b "$JAR" -X DELETE "$API/offers/$FIXTURE_ID")"
  check 'fixture offer is archived' true "$(json 'd.archived')"
  check 'fixture offer is not deleted' false "$(json 'd.deleted')"
  check 'archived fixture is hidden from direct links' 404 "$(status "$API/offers/$FIXTURE_SLUG")"
  status "$API/offers" >/dev/null
  check 'archived fixture is hidden from the list' '' "$(json "d.find((o) => o.slug === '$FIXTURE_SLUG')?.slug")"
  if need_reg 'applicant data survives archiving'; then
    status -b "$JAR" "$API/registrations?q=$EMAIL" >/dev/null
    check 'applicant data survives archiving' "$REG_ID" "$(json "d.find((r) => r.id === $REG_ID)?.id")"
  fi
else
  if [ -n "$FIXTURE_ID" ]; then
    curl -s -o /dev/null -b "$JAR" -X DELETE "$API/offers/$FIXTURE_ID"
  fi
  SKIP=$((SKIP + 6)); printf '  skip  archive checks → the fixture has no applicants (form quota blocked)\n'
fi

section 'Message templates'
check_in 'all message texts are listed' "$(status -b "$JAR" "$API/messages/status" >/dev/null; json 'd.templates.length')" '12'
check 'contact report template is listed' 'contactReport' "$(status -b "$JAR" "$API/messages/status" >/dev/null; json "d.templates.find((t) => t.key === 'contactReport')?.key")"
check 'status and waitlist offer templates are listed' 'yes' \
  "$(status -b "$JAR" "$API/messages/status" >/dev/null; json "['contacted','offered','waitlistOffer'].every((key) => d.templates.some((t) => t.key === key)) ? 'yes' : 'no'")"
check 'templates need a session' 401 "$(status -X PATCH "$API/messages/templates/accepted" \
  -H 'Content-Type: application/json' -d '{"body":"Hi {name} {offer}"}')"
check 'unknown message text' 404 "$(status -b "$JAR" -X PATCH "$API/messages/templates/nope" \
  -H 'Content-Type: application/json' -d '{"body":"Hi {name} {offer}"}')"
check 'variable that is not allowed' 400 "$(status -b "$JAR" -X PATCH "$API/messages/templates/accepted" \
  -H 'Content-Type: application/json' -d '{"body":"Hi {name}, about {offer} — {wat}"}')"
check 'a text that lost a needed variable' 400 "$(status -b "$JAR" -X PATCH "$API/messages/templates/accepted" \
  -H 'Content-Type: application/json' -d '{"body":"Good news about your registration."}')"
check 'an empty text' 400 "$(status -b "$JAR" -X PATCH "$API/messages/templates/accepted" \
  -H 'Content-Type: application/json' -d '{"body":"   "}')"
check 'edit a message text' 200 "$(status -b "$JAR" -X PATCH "$API/messages/templates/accepted" \
  -H 'Content-Type: application/json' -d '{"body":"Hi {name}, SMOKE-MARKER for {offer}."}')"
check_in 'the edit is stored' "$(json 'd.body')" 'Hi {name}, SMOKE-MARKER for {offer}.'
# `preview` is rendered through the same lookup a real send uses, so this proves
# the next message picks the edit up rather than only that it was saved.
check_in 'the preview uses the edit' "$(json 'd.preview')" 'Hi Amina, SMOKE-MARKER for Packaging & labeling.'
# Put the default back so the dev database is left as it was.
check 'restore the message text' 200 "$(status -b "$JAR" -X PATCH "$API/messages/templates/accepted" \
  -H 'Content-Type: application/json' -d '{"body":"Hi {name}, good news — your place on {offer} is confirmed. We will send the schedule and joining details shortly."}')"
check_in 'the default is restored' "$(json 'd.body')" 'Hi {name}, good news — your place on {offer} is confirmed. We will send the schedule and joining details shortly.'

section 'Telegram webhook'
check 'unknown callback is ignored' 200 "$(status -X POST "$API/telegram/webhook" -H 'Content-Type: application/json' \
  -d '{"message":{"text":"hello"}}')"
check 'invalid decision is ignored' 200 "$(status -X POST "$API/telegram/webhook" -H 'Content-Type: application/json' \
  -d '{"callback_query":{"id":"smoke","data":"nope","from":{},"message":{"message_id":1}}}')"
need_reg 'reject via callback button' && check 'reject via callback button' 200 "$(status -X POST "$API/telegram/webhook" -H 'Content-Type: application/json' \
  -d "{\"callback_query\":{\"id\":\"smoke\",\"data\":\"reg:$REG_ID:reject\",\"from\":{\"first_name\":\"Smoke\"},\"message\":{\"message_id\":1}}}")"
need_reg 'pressing the same button again' && check 'pressing the same button again' 200 "$(status -X POST "$API/telegram/webhook" -H 'Content-Type: application/json' \
  -d "{\"callback_query\":{\"id\":\"smoke2\",\"data\":\"reg:$REG_ID:reject\",\"from\":{\"first_name\":\"Smoke\"},\"message\":{\"message_id\":1}}}")"

section 'CORS'
HEADERS="$(curl -s -o /dev/null -D - -H 'Origin: http://evil.example' "$API/offers")"
if printf '%s' "$HEADERS" | grep -qi 'access-control-allow-origin'; then
  FAIL=$((FAIL + 1)); printf '  FAIL  disallowed origin got an Allow-Origin header\n'
else
  PASS=$((PASS + 1)); printf '  ok    disallowed origin gets no Allow-Origin header\n'
fi

section 'Sign out'
check_in 'logout' "$(status -b "$JAR" -c "$JAR" -X POST "$API/auth/logout")" 204 200
check 'session is gone' 401 "$(status -b "$JAR" "$API/auth/me")"

printf '\n%s\n' "----------------------------------------"
printf '%s passed, %s failed, %s skipped\n' "$PASS" "$FAIL" "$SKIP"
[ "$FAIL" -eq 0 ]
