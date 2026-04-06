#!/usr/bin/env bash
set -euo pipefail

# Runtime smoke for the core local marketplace flows.
# Safe scope:
# - vendor creates service
# - client creates booking + escrow
# - signed collection webhook moves escrow to ACTIVE
# - client opens dispute
# - admin resolves dispute to vendor
# - vendor submits withdrawal request
#
# This script does NOT call admin payout approval, so it avoids live external
# payout side effects against the configured gateway.

BASE_URL="${BASE_URL:-http://127.0.0.1:8000}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COOKIE_VENDOR=/tmp/marketplace_vendor_runtime_cookie.txt
COOKIE_CLIENT=/tmp/marketplace_client_runtime_cookie.txt
COOKIE_ADMIN=/tmp/marketplace_admin_runtime_cookie.txt
rm -f "$COOKIE_VENDOR" "$COOKIE_CLIENT" "$COOKIE_ADMIN"

source "$ROOT_DIR/.env"

TS="$(date +%s)"
VENDOR_EMAIL="vendor_runtime_${TS}@test.com"
CLIENT_EMAIL="client_runtime_${TS}@test.com"
ADMIN_EMAIL="admin_runtime_${TS}@test.com"
PASSWORD='Password123!'

MYSQL=(
  mysql
  -h"${DB_HOST:-127.0.0.1}"
  -P"${DB_PORT:-3306}"
  -u"${DB_USERNAME:-marketplace_user}"
  -p"${DB_PASSWORD:-Jay442tx}"
  -D "${DB_NAME:-marketplace}"
  -N -B
)

post_json() {
  local method="$1"
  local url="$2"
  local body="$3"
  local cookie="${4:-}"

  if [[ -n "$cookie" ]]; then
    curl -sS -X "$method" "$url" -H 'Content-Type: application/json' -d "$body" -b "$cookie" -c "$cookie"
  else
    curl -sS -X "$method" "$url" -H 'Content-Type: application/json' -d "$body"
  fi
}

get_url() {
  local url="$1"
  local cookie="${2:-}"

  if [[ -n "$cookie" ]]; then
    curl -sS "$url" -b "$cookie" -c "$cookie"
  else
    curl -sS "$url"
  fi
}

json_get() {
  local json="$1"
  local path="$2"

  php -r '$data=json_decode($argv[1], true); if (!is_array($data)) exit(2); $segments=explode(".",$argv[2]); $value=$data; foreach($segments as $segment){ if(!is_array($value) || !array_key_exists($segment,$value)){ exit(1);} $value=$value[$segment]; } if (is_array($value)) { echo json_encode($value); } elseif (is_bool($value)) { echo $value ? "true" : "false"; } else { echo (string)$value; }' "$json" "$path"
}

curl -sS -m 5 "$BASE_URL/" >/dev/null

VENDOR_REGISTER=$(post_json POST "$BASE_URL/api/register" "{\"email\":\"${VENDOR_EMAIL}\",\"password\":\"${PASSWORD}\",\"type\":\"vendor\"}")
CLIENT_REGISTER=$(post_json POST "$BASE_URL/api/register" "{\"email\":\"${CLIENT_EMAIL}\",\"password\":\"${PASSWORD}\",\"type\":\"client\"}")
ADMIN_REGISTER=$(post_json POST "$BASE_URL/api/register" "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${PASSWORD}\",\"type\":\"client\"}")

get_url "$(json_get "$VENDOR_REGISTER" verification_url)" >/tmp/vendor_runtime_verify.json
get_url "$(json_get "$CLIENT_REGISTER" verification_url)" >/tmp/client_runtime_verify.json
get_url "$(json_get "$ADMIN_REGISTER" verification_url)" >/tmp/admin_runtime_verify.json

"${MYSQL[@]}" <<SQL
UPDATE user
SET roles='["ROLE_ADMIN"]'
WHERE email='${ADMIN_EMAIL}';
SQL

post_json POST "$BASE_URL/api/login" "{\"email\":\"${VENDOR_EMAIL}\",\"password\":\"${PASSWORD}\"}" "$COOKIE_VENDOR" >/tmp/vendor_runtime_login.json
post_json POST "$BASE_URL/api/login" "{\"email\":\"${CLIENT_EMAIL}\",\"password\":\"${PASSWORD}\"}" "$COOKIE_CLIENT" >/tmp/client_runtime_login.json
post_json POST "$BASE_URL/api/login" "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${PASSWORD}\"}" "$COOKIE_ADMIN" >/tmp/admin_runtime_login.json

post_json POST "$BASE_URL/api/vendor/profile" '{"companyName":"Runtime Smoke Vendor","bio":"Core marketplace runtime smoke","website":null,"portfolioLink":null}' "$COOKIE_VENDOR" >/tmp/vendor_runtime_profile.json

SERVICE_CREATE=$(post_json POST "$BASE_URL/api/services" '{"title":"Runtime Smoke Service","description":"Core marketplace runtime flow","category":"testing","price_cents":90000}' "$COOKIE_VENDOR")
SERVICE_ID=$(json_get "$SERVICE_CREATE" id)

BOOKING_CREATE=$(post_json POST "$BASE_URL/api/bookings" "{\"service_id\":${SERVICE_ID}}" "$COOKIE_CLIENT")
BOOKING_ID=$(json_get "$BOOKING_CREATE" booking_id)

ESCROW_CREATE=$(post_json POST "$BASE_URL/api/bookings/${BOOKING_ID}/escrow" '{}' "$COOKIE_CLIENT")
ESCROW_ID=$(json_get "$ESCROW_CREATE" escrow.id)
ESCROW_REF=$(json_get "$ESCROW_CREATE" escrow.reference)

EVENT_ID="evt_runtime_${TS}"
TXN_ID="txn_runtime_${TS}"
WEBHOOK_TS=$(date +%s)
WEBHOOK_BODY=$(printf '{"id":"%s","type":"payment.completed","reference":"%s","status":"success","data":{"reference":"%s","status":"success","external_reference":"%s","metadata":{"order_id":"%s"}}}' "$EVENT_ID" "$ESCROW_REF" "$ESCROW_REF" "$TXN_ID" "$ESCROW_REF")
WEBHOOK_SIG=$(printf '%s' "$WEBHOOK_BODY" | openssl dgst -sha256 -hmac "$SNIPPE_WEBHOOK_SECRET" -binary | xxd -p -c 256)
WEBHOOK_RESPONSE=$(curl -sS -X POST "$BASE_URL/webhooks/snippe/collection" \
  -H 'Content-Type: application/json' \
  -H "X-Webhook-Signature: $WEBHOOK_SIG" \
  -H "X-Webhook-Timestamp: $WEBHOOK_TS" \
  -H 'X-Webhook-Event: payment.completed' \
  -d "$WEBHOOK_BODY")

DISPUTE_RESPONSE=$(post_json POST "$BASE_URL/api/bookings/${BOOKING_ID}/escrow/dispute" '{"reason":"Runtime smoke dispute"}' "$COOKIE_CLIENT")
BOOKING_AFTER_DISPUTE=$(get_url "$BASE_URL/api/bookings/${BOOKING_ID}" "$COOKIE_CLIENT")
ESCROW_STATUS_AFTER_DISPUTE=$(json_get "$BOOKING_AFTER_DISPUTE" escrow.status)

DISPUTE_LIST=$(get_url "$BASE_URL/api/admin/escrow/list" "$COOKIE_ADMIN")
LISTED_ESCROW_ID=$(php -r '$rows=json_decode($argv[1], true); if (!is_array($rows)) exit(1); foreach ($rows as $row) { if ((string)($row["reference"] ?? "") === $argv[2]) { echo (string)($row["id"] ?? ""); exit(0); } } exit(1);' "$DISPUTE_LIST" "$ESCROW_REF")

RESOLVE_RESPONSE=$(post_json POST "$BASE_URL/api/admin/escrow/resolve/${ESCROW_ID}" '{"release_to_vendor":true,"resolution_note":"Runtime smoke resolution"}' "$COOKIE_ADMIN")
BOOKING_AFTER_RESOLVE=$(get_url "$BASE_URL/api/bookings/${BOOKING_ID}" "$COOKIE_CLIENT")
ESCROW_STATUS_AFTER_RESOLVE=$(json_get "$BOOKING_AFTER_RESOLVE" escrow.status)

WITHDRAWAL_SUMMARY=$(get_url "$BASE_URL/api/withdrawals/summary?currency=TZS" "$COOKIE_VENDOR")
BALANCE_MINOR=$(json_get "$WITHDRAWAL_SUMMARY" balance_minor)
WITHDRAWAL_REQUEST=$(post_json POST "$BASE_URL/api/withdrawals" '{"amount_minor":50000,"currency":"TZS","msisdn":"255700000001","provider":"MPESA"}' "$COOKIE_VENDOR")
WITHDRAWAL_ID=$(json_get "$WITHDRAWAL_REQUEST" id)
WITHDRAWAL_REFERENCE=$(json_get "$WITHDRAWAL_REQUEST" reference)
WITHDRAWAL_STATUS=$(json_get "$WITHDRAWAL_REQUEST" status)

printf 'SERVICE_ID=%s\nBOOKING_ID=%s\nESCROW_ID=%s\nESCROW_REF=%s\nWEBHOOK_RESPONSE=%s\nDISPUTE_RESPONSE=%s\nESCROW_STATUS_AFTER_DISPUTE=%s\nLISTED_ESCROW_ID=%s\nRESOLVE_RESPONSE=%s\nESCROW_STATUS_AFTER_RESOLVE=%s\nVENDOR_BALANCE_MINOR=%s\nWITHDRAWAL_ID=%s\nWITHDRAWAL_REFERENCE=%s\nWITHDRAWAL_STATUS=%s\n' \
  "$SERVICE_ID" "$BOOKING_ID" "$ESCROW_ID" "$ESCROW_REF" "$WEBHOOK_RESPONSE" "$DISPUTE_RESPONSE" "$ESCROW_STATUS_AFTER_DISPUTE" "$LISTED_ESCROW_ID" "$RESOLVE_RESPONSE" "$ESCROW_STATUS_AFTER_RESOLVE" "$BALANCE_MINOR" "$WITHDRAWAL_ID" "$WITHDRAWAL_REFERENCE" "$WITHDRAWAL_STATUS"
