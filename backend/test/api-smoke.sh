#!/usr/bin/env bash
# End-to-end smoke test for the EnrollHub API.
#
#   npm run test:api
#   API=http://localhost:3001/api ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... npm run test:api
#
# Requires a running API, a migrated + seeded database and an admin account
# (`npm run admin:set -- <email> <password>`). Every run uses a unique email so
# it can be repeated without tripping the duplicate guard.
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

section() { printf '\n%s\n' "$1"; }

section 'Public offers'
check 'GET /offers' 200 "$(status "$API/offers")"
check 'GET /offers/offer-1' 200 "$(status "$API/offers/offer-1")"
check 'GET /offers/does-not-exist' 404 "$(status "$API/offers/does-not-exist")"

# Discover slugs instead of hardcoding them: a full offer rejects registrations
# (correctly), so the suite has to target one with free seats. Runs against a
# database where every offer is full skip the registration section instead.
slug() { node -e "
const offers = JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'))
const mode = process.argv[2]
const pick = mode === 'open'
  ? offers.find((o) => o.status !== 'soldout' && o.seatsTaken < o.seatsTotal)
  : offers[0]
process.stdout.write(pick ? pick.slug : '')
" "$BODY" "$1"; }

status "$API/offers" >/dev/null
ANY_SLUG="$(slug any)"
status "$API/offers" >/dev/null
OPEN_SLUG="$(slug open)"

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
fi

check_form 'unknown offer' 404 "$(status -X POST "$API/registrations" \
  -F "name=No Offer" -F 'age=27' -F "email=no-offer.$STAMP@example.com" -F "phone=+1995$STAMP" \
  -F 'offerSlug=nope' -F 'consent=on' -F "recording=@$TMP/voice.mp3;type=audio/mpeg")"

section 'Waitlist'
check_form 'join waitlist with an email' 201 "$(status -X POST "$API/waitlist" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Waiter\",\"email\":\"waiter.$STAMP@example.com\",\"phone\":\"+1994$STAMP\",\"offerSlug\":\"$ANY_SLUG\"}")"
check_form 'join waitlist without an email' 201 "$(status -X POST "$API/waitlist" -H 'Content-Type: application/json' \
  -d "{\"name\":\"No Email\",\"phone\":\"+1993$STAMP\",\"offerSlug\":\"$ANY_SLUG\"}")"
check_form 'waitlist with a broken email' 400 "$(status -X POST "$API/waitlist" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Bad Email\",\"email\":\"not-an-email\",\"phone\":\"+1992$STAMP\",\"offerSlug\":\"$ANY_SLUG\"}")"
check_form 'waitlist unknown offer' 404 "$(status -X POST "$API/waitlist" -H 'Content-Type: application/json' \
  -d '{"name":"Waiter","email":"waiter2@example.com","phone":"+1993000","offerSlug":"nope"}')"

section 'Contact form'
check_form 'contact message' 201 "$(status -X POST "$API/messages" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Visitor\",\"email\":\"visitor.$STAMP@example.com\",\"message\":\"Hello, I have a question.\"}")"
check_form 'contact message too short' 400 "$(status -X POST "$API/messages" -H 'Content-Type: application/json' \
  -d '{"name":"Visitor","email":"visitor2@example.com","message":"hi"}')"

section 'Admin authentication'
check 'registrations without a session' 401 "$(status "$API/registrations")"
need_reg 'voice note without a session' && check 'voice note without a session' 401 "$(status "$API/registrations/$REG_ID/voice")"
check 'login with a wrong password' 401 "$(status -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"definitely-wrong\"}")"
check 'login' 200 "$(status -c "$JAR" -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")"
check 'session lookup' 200 "$(status -b "$JAR" "$API/auth/me")"

section 'Admin reads'
check 'list registrations' 200 "$(status -b "$JAR" "$API/registrations")"
check 'filtered list' 200 "$(status -b "$JAR" "$API/registrations?status=new&q=smoke")"
need_reg 'voice note with a session' && check 'voice note with a session' 200 "$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" "$API/registrations/$REG_ID/voice")"
check 'message log' 200 "$(status -b "$JAR" "$API/messages")"
check 'channel + template status' 200 "$(status -b "$JAR" "$API/messages/status")"

section 'Admin writes'
need_reg 'accept a registration' && check 'accept a registration' 200 "$(status -b "$JAR" -X PATCH "$API/registrations/$REG_ID" \
  -H 'Content-Type: application/json' -d '{"status":"accepted","notes":"Smoke test"}')"
need_reg 'invalid status' && check 'invalid status' 400 "$(status -b "$JAR" -X PATCH "$API/registrations/$REG_ID" \
  -H 'Content-Type: application/json' -d '{"status":"banana"}')"

PRICE_BEFORE="$(status -b "$JAR" "$API/offers/offer-1" >/dev/null; json 'd.price')"
check 'update an offer' 200 "$(status -b "$JAR" -X PATCH "$API/offers/1" \
  -H 'Content-Type: application/json' -d '{"price":"[SMOKE PRICE]"}')"
# Put the price back so the dev data stays as it was.
curl -s -o /dev/null -b "$JAR" -X PATCH "$API/offers/1" -H 'Content-Type: application/json' \
  -d "{\"price\":\"$PRICE_BEFORE\"}"

section 'Message templates'
check_in 'all message texts are listed' "$(status -b "$JAR" "$API/messages/status" >/dev/null; json 'd.templates.length')" '8'
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
check_in 'the preview uses the edit' "$(json 'd.preview')" 'Hi Amina, SMOKE-MARKER for Your offer.'
# Put the default back so the dev database is left as it was.
check 'restore the message text' 200 "$(status -b "$JAR" -X PATCH "$API/messages/templates/accepted" \
  -H 'Content-Type: application/json' -d '{"body":"Hi {name}, good news — your seat for {offer} is confirmed. We will send the schedule and joining details shortly."}')"
check_in 'the default is restored' "$(json 'd.body')" 'Hi {name}, good news — your seat for {offer} is confirmed. We will send the schedule and joining details shortly.'

section 'Telegram webhook'
check 'unknown callback is ignored' 200 "$(status -X POST "$API/telegram/webhook" -H 'Content-Type: application/json' \
  -d '{"message":{"text":"hello"}}')"
check 'invalid decision is ignored' 200 "$(status -X POST "$API/telegram/webhook" -H 'Content-Type: application/json' \
  -d '{"callback_query":{"id":"smoke","data":"nope","from":{},"message":{"message_id":1}}}')"
need_reg 'accept via callback button' && check 'accept via callback button' 200 "$(status -X POST "$API/telegram/webhook" -H 'Content-Type: application/json' \
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
