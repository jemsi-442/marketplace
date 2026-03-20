#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:8000}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-marketplace}"
DB_USER="${DB_USER:-marketplace_user}"
DB_PASS="${DB_PASS:-Jay442tx}"

MYSQL=(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASS" -D "$DB_NAME" -N -B)

require_bin() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_bin curl
require_bin jq
require_bin mysql

http_json() {
  local method="$1"
  local url="$2"
  local body="${3:-}"
  local token="${4:-}"
  local out_file="$5"

  local args=(-s -o "$out_file" -w '%{http_code}' -X "$method" "$url")

  if [[ -n "$body" ]]; then
    args+=(-H 'Content-Type: application/json' -d "$body")
  fi

  if [[ -n "$token" ]]; then
    args+=(-H "Authorization: Bearer $token")
  fi

  curl "${args[@]}"
}

assert_status() {
  local actual="$1"
  local expected="$2"
  local label="$3"

  if [[ "$actual" != "$expected" ]]; then
    echo "Assertion failed for $label: expected HTTP $expected, got $actual" >&2
    exit 1
  fi
}

echo "[1/8] Checking API reachability at $BASE_URL"
REACH_CODE=$(curl -s -o /dev/null -w '%{http_code}' \
  -X POST "$BASE_URL/api/register" \
  -H 'Content-Type: application/json' \
  -d '{}')
if [[ "$REACH_CODE" == "000" ]]; then
  echo "API not reachable at $BASE_URL. Start your server first." >&2
  exit 1
fi

TS="$(date +%s)"
PASSWORD="Password123!"

register_user() {
  local type="$1"
  local email="$2"
  local out_file="$3"

  local body
  body=$(printf '{"email":"%s","password":"%s","type":"%s"}' "$email" "$PASSWORD" "$type")
  local code
  code=$(http_json POST "$BASE_URL/api/register" "$body" "" "$out_file")
  assert_status "$code" "201" "register $email"
}

verify_user() {
  local url="$1"
  local out_file="$2"

  local code
  code=$(curl -s -o "$out_file" -w '%{http_code}' "$url")
  assert_status "$code" "200" "verify $url"
}

login_user() {
  local email="$1"
  local out_file="$2"

  local body
  body=$(printf '{"email":"%s","password":"%s"}' "$email" "$PASSWORD")
  local code
  code=$(http_json POST "$BASE_URL/api/login" "$body" "" "$out_file")
  assert_status "$code" "200" "login $email"
}

CLIENT_EMAIL="client_auth_${TS}@test.com"
VENDOR_EMAIL="vendor_auth_${TS}@test.com"
ADMIN_EMAIL="admin_auth_${TS}@test.com"
OUTSIDER_EMAIL="outsider_auth_${TS}@test.com"
SECOND_VENDOR_EMAIL="second_vendor_auth_${TS}@test.com"

echo "[2/9] Registering client, vendor, admin, outsider, and second vendor seed users"
register_user "client" "$CLIENT_EMAIL" /tmp/auth_client_register.json
register_user "vendor" "$VENDOR_EMAIL" /tmp/auth_vendor_register.json
register_user "client" "$ADMIN_EMAIL" /tmp/auth_admin_register.json
register_user "client" "$OUTSIDER_EMAIL" /tmp/auth_outsider_register.json
register_user "vendor" "$SECOND_VENDOR_EMAIL" /tmp/auth_second_vendor_register.json

CLIENT_PREVERIFY_TOKEN=$(jq -r '.token // empty' /tmp/auth_client_register.json)
CLIENT_VERIFY_URL=$(jq -r '.verification_url // empty' /tmp/auth_client_register.json)
VENDOR_VERIFY_URL=$(jq -r '.verification_url // empty' /tmp/auth_vendor_register.json)
ADMIN_VERIFY_URL=$(jq -r '.verification_url // empty' /tmp/auth_admin_register.json)
OUTSIDER_VERIFY_URL=$(jq -r '.verification_url // empty' /tmp/auth_outsider_register.json)
SECOND_VENDOR_VERIFY_URL=$(jq -r '.verification_url // empty' /tmp/auth_second_vendor_register.json)
VENDOR_USER_ID=$(jq -r '.user.id // empty' /tmp/auth_vendor_register.json)
SECOND_VENDOR_USER_ID=$(jq -r '.user.id // empty' /tmp/auth_second_vendor_register.json)

if [[ -z "$CLIENT_PREVERIFY_TOKEN" || -z "$CLIENT_VERIFY_URL" || -z "$VENDOR_VERIFY_URL" || -z "$ADMIN_VERIFY_URL" || -z "$OUTSIDER_VERIFY_URL" || -z "$SECOND_VENDOR_VERIFY_URL" || -z "$VENDOR_USER_ID" || -z "$SECOND_VENDOR_USER_ID" ]]; then
  echo "Missing token or verification URL in register responses." >&2
  exit 1
fi

echo "[3/9] Verifying unverified users are blocked from protected routes"
PREVERIFY_CODE=$(http_json GET "$BASE_URL/api/messages/inbox" "" "$CLIENT_PREVERIFY_TOKEN" /tmp/auth_preverify_block.json)
assert_status "$PREVERIFY_CODE" "403" "unverified token access"

echo "[4/9] Verifying email addresses"
verify_user "$CLIENT_VERIFY_URL" /tmp/auth_client_verify.json
verify_user "$VENDOR_VERIFY_URL" /tmp/auth_vendor_verify.json
verify_user "$ADMIN_VERIFY_URL" /tmp/auth_admin_verify.json
verify_user "$OUTSIDER_VERIFY_URL" /tmp/auth_outsider_verify.json
verify_user "$SECOND_VENDOR_VERIFY_URL" /tmp/auth_second_vendor_verify.json

echo "[5/9] Promoting admin seed user and seeding vendor profile"
"${MYSQL[@]}" <<SQL
UPDATE user
SET roles='["ROLE_ADMIN"]'
WHERE email='${ADMIN_EMAIL}';

INSERT INTO vendor_profile (company_name, bio, website, portfolio_link, user_id)
SELECT 'Smoke Vendor', NULL, NULL, NULL, id
FROM user
WHERE id='${VENDOR_USER_ID}'
  AND NOT EXISTS (
    SELECT 1
    FROM vendor_profile
    WHERE user_id='${VENDOR_USER_ID}'
  );

INSERT INTO vendor_profile (company_name, bio, website, portfolio_link, user_id)
SELECT 'Second Smoke Vendor', NULL, NULL, NULL, id
FROM user
WHERE id='${SECOND_VENDOR_USER_ID}'
  AND NOT EXISTS (
    SELECT 1
    FROM vendor_profile
    WHERE user_id='${SECOND_VENDOR_USER_ID}'
  );
SQL

echo "[6/9] Logging in verified users"
login_user "$CLIENT_EMAIL" /tmp/auth_client_login.json
login_user "$VENDOR_EMAIL" /tmp/auth_vendor_login.json
login_user "$ADMIN_EMAIL" /tmp/auth_admin_login.json
login_user "$OUTSIDER_EMAIL" /tmp/auth_outsider_login.json
login_user "$SECOND_VENDOR_EMAIL" /tmp/auth_second_vendor_login.json

CLIENT_TOKEN=$(jq -r '.token // empty' /tmp/auth_client_login.json)
VENDOR_TOKEN=$(jq -r '.token // empty' /tmp/auth_vendor_login.json)
ADMIN_TOKEN=$(jq -r '.token // empty' /tmp/auth_admin_login.json)
OUTSIDER_TOKEN=$(jq -r '.token // empty' /tmp/auth_outsider_login.json)
SECOND_VENDOR_TOKEN=$(jq -r '.token // empty' /tmp/auth_second_vendor_login.json)

if [[ -z "$CLIENT_TOKEN" || -z "$VENDOR_TOKEN" || -z "$ADMIN_TOKEN" || -z "$OUTSIDER_TOKEN" || -z "$SECOND_VENDOR_TOKEN" ]]; then
  echo "Missing login token after verification." >&2
  exit 1
fi

echo "[7/9] Creating booking fixture through public API"
SERVICE_CODE=$(http_json POST "$BASE_URL/api/services" '{"title":"Smoke Test Service","description":"Auth smoke","category":"testing","price_cents":250000}' "$VENDOR_TOKEN" /tmp/auth_service_create.json)
assert_status "$SERVICE_CODE" "201" "vendor service create"
SERVICE_ID=$(jq -r '.id // empty' /tmp/auth_service_create.json)
if [[ -z "$SERVICE_ID" ]]; then
  echo "Failed to extract service id from service create response." >&2
  exit 1
fi

BOOKING_CODE=$(http_json POST "$BASE_URL/api/bookings" "{\"service_id\":${SERVICE_ID}}" "$CLIENT_TOKEN" /tmp/auth_booking_create.json)
assert_status "$BOOKING_CODE" "201" "client booking create"
BOOKING_ID=$(jq -r '.booking_id // empty' /tmp/auth_booking_create.json)
if [[ -z "$BOOKING_ID" ]]; then
  echo "Failed to extract booking id from booking create response." >&2
  exit 1
fi

ESCROW_REF="auth_escrow_${TS}"
"${MYSQL[@]}" <<SQL
INSERT INTO escrow (amount_minor, currency, status, created_at, client_id, vendor_id, reference, updated_at)
VALUES (250000, 'TZS', 'CREATED', NOW(), (
    SELECT id FROM user WHERE email='${CLIENT_EMAIL}'
), (
    SELECT id FROM user WHERE email='${VENDOR_EMAIL}'
), '${ESCROW_REF}', NOW());
SQL

ESCROW_ID=$("${MYSQL[@]}" -e "SELECT id FROM escrow WHERE reference='${ESCROW_REF}' LIMIT 1;")
if [[ -z "$ESCROW_ID" ]]; then
  echo "Failed to create escrow fixture." >&2
  exit 1
fi

echo "[8/9] Checking access-control matrix"
NO_TOKEN_CODE=$(http_json GET "$BASE_URL/api/messages/inbox" "" "" /tmp/auth_no_token.json)
assert_status "$NO_TOKEN_CODE" "401" "messages inbox without token"

CLIENT_INBOX_CODE=$(http_json GET "$BASE_URL/api/messages/inbox" "" "$CLIENT_TOKEN" /tmp/auth_client_inbox.json)
assert_status "$CLIENT_INBOX_CODE" "200" "messages inbox with client token"

CLIENT_WITHDRAWAL_CODE=$(http_json POST "$BASE_URL/api/withdrawals" '{"amount_minor":1000,"currency":"TZS","msisdn":"255700000001","provider":"MPESA"}' "$CLIENT_TOKEN" /tmp/auth_client_withdrawal.json)
assert_status "$CLIENT_WITHDRAWAL_CODE" "403" "client withdrawal request"

VENDOR_ADMIN_CODE=$(http_json GET "$BASE_URL/api/admin/users" "" "$VENDOR_TOKEN" /tmp/auth_vendor_admin.json)
assert_status "$VENDOR_ADMIN_CODE" "403" "vendor admin endpoint access"

VENDOR_APPROVE_CODE=$(http_json POST "$BASE_URL/api/withdrawals/999999/approve" '{}' "$VENDOR_TOKEN" /tmp/auth_vendor_approve.json)
assert_status "$VENDOR_APPROVE_CODE" "403" "vendor withdrawal approve access"

ADMIN_USERS_CODE=$(http_json GET "$BASE_URL/api/admin/users" "" "$ADMIN_TOKEN" /tmp/auth_admin_users.json)
assert_status "$ADMIN_USERS_CODE" "200" "admin users endpoint access"

ADMIN_APPROVE_CODE=$(http_json POST "$BASE_URL/api/withdrawals/999999/approve" '{}' "$ADMIN_TOKEN" /tmp/auth_admin_approve.json)
assert_status "$ADMIN_APPROVE_CODE" "404" "admin approve missing withdrawal"

OUTSIDER_ESCROW_COLLECT_CODE=$(http_json POST "$BASE_URL/api/payments/escrows/${ESCROW_ID}/collect" '{"msisdn":"255700000001","provider":"MPESA"}' "$OUTSIDER_TOKEN" /tmp/auth_outsider_escrow_collect.json)
assert_status "$OUTSIDER_ESCROW_COLLECT_CODE" "403" "outsider escrow collect"

ADMIN_ESCROW_COLLECT_CODE=$(http_json POST "$BASE_URL/api/payments/escrows/${ESCROW_ID}/collect" '{"msisdn":"255700000001","provider":"MPESA"}' "$ADMIN_TOKEN" /tmp/auth_admin_escrow_collect.json)
assert_status "$ADMIN_ESCROW_COLLECT_CODE" "403" "admin escrow collect"

CLIENT_ESCROW_COLLECT_VALIDATION_CODE=$(http_json POST "$BASE_URL/api/payments/escrows/${ESCROW_ID}/collect" '{}' "$CLIENT_TOKEN" /tmp/auth_client_escrow_collect_validation.json)
assert_status "$CLIENT_ESCROW_COLLECT_VALIDATION_CODE" "400" "client escrow collect validation"

CLIENT_BOOKING_CODE=$(http_json GET "$BASE_URL/api/bookings/${BOOKING_ID}" "" "$CLIENT_TOKEN" /tmp/auth_client_booking.json)
assert_status "$CLIENT_BOOKING_CODE" "200" "client booking view"

VENDOR_BOOKING_CODE=$(http_json GET "$BASE_URL/api/bookings/${BOOKING_ID}" "" "$VENDOR_TOKEN" /tmp/auth_vendor_booking.json)
assert_status "$VENDOR_BOOKING_CODE" "200" "vendor booking view"

ADMIN_BOOKING_CODE=$(http_json GET "$BASE_URL/api/bookings/${BOOKING_ID}" "" "$ADMIN_TOKEN" /tmp/auth_admin_booking.json)
assert_status "$ADMIN_BOOKING_CODE" "200" "admin booking view"

OUTSIDER_BOOKING_CODE=$(http_json GET "$BASE_URL/api/bookings/${BOOKING_ID}" "" "$OUTSIDER_TOKEN" /tmp/auth_outsider_booking.json)
assert_status "$OUTSIDER_BOOKING_CODE" "403" "outsider booking view"

OUTSIDER_BOOKING_UPDATE_CODE=$(http_json PUT "$BASE_URL/api/bookings/${BOOKING_ID}" '{"status":"confirmed"}' "$OUTSIDER_TOKEN" /tmp/auth_outsider_booking_update.json)
assert_status "$OUTSIDER_BOOKING_UPDATE_CODE" "403" "outsider booking update"

CLIENT_BOOKING_COMPLETE_CODE=$(http_json PUT "$BASE_URL/api/bookings/${BOOKING_ID}" '{"status":"completed"}' "$CLIENT_TOKEN" /tmp/auth_client_booking_complete.json)
assert_status "$CLIENT_BOOKING_COMPLETE_CODE" "200" "client booking complete"

OUTSIDER_REVIEW_CODE=$(http_json POST "$BASE_URL/api/reviews" "{\"bookingId\":${BOOKING_ID},\"rating\":5,\"comment\":\"Unauthorized review\"}" "$OUTSIDER_TOKEN" /tmp/auth_outsider_review.json)
assert_status "$OUTSIDER_REVIEW_CODE" "403" "outsider review create"

CLIENT_REVIEW_CODE=$(http_json POST "$BASE_URL/api/reviews" "{\"bookingId\":${BOOKING_ID},\"rating\":5,\"comment\":\"Legitimate review\"}" "$CLIENT_TOKEN" /tmp/auth_client_review.json)
assert_status "$CLIENT_REVIEW_CODE" "201" "client review create"

SECOND_VENDOR_SERVICE_UPDATE_CODE=$(http_json PUT "$BASE_URL/api/services/${SERVICE_ID}" '{"title":"Hijacked Title"}' "$SECOND_VENDOR_TOKEN" /tmp/auth_second_vendor_service_update.json)
assert_status "$SECOND_VENDOR_SERVICE_UPDATE_CODE" "403" "second vendor service update"

SECOND_VENDOR_SERVICE_DELETE_CODE=$(http_json DELETE "$BASE_URL/api/services/${SERVICE_ID}" "" "$SECOND_VENDOR_TOKEN" /tmp/auth_second_vendor_service_delete.json)
assert_status "$SECOND_VENDOR_SERVICE_DELETE_CODE" "403" "second vendor service delete"

echo "[9/9] Authorization smoke test passed"
