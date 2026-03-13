#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:8000}"
WEBHOOK_SECRET="${WEBHOOK_SECRET:-test_secret}"
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
require_bin openssl
require_bin xxd
require_bin mysql

http_status() {
  local method="$1"
  local url="$2"
  local body="$3"
  local sig="$4"
  local ts="$5"
  local event="$6"
  local out_file="$7"

  curl -s -o "$out_file" -w '%{http_code}' \
    -X "$method" "$url" \
    -H 'Content-Type: application/json' \
    -H "X-Webhook-Signature: $sig" \
    -H "X-Webhook-Timestamp: $ts" \
    -H "X-Webhook-Event: $event" \
    -d "$body"
}

sign_body() {
  local body="$1"
  printf '%s' "$body" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" -binary | xxd -p -c 256
}

assert_contains() {
  local file="$1"
  local expected="$2"
  if ! grep -q "$expected" "$file"; then
    echo "Assertion failed: expected '$expected' in $file" >&2
    echo "Actual body:" >&2
    cat "$file" >&2
    exit 1
  fi
}

echo "[1/6] Checking API reachability at $BASE_URL"
REACH_CODE=$(curl -s -o /dev/null -w '%{http_code}' \
  -X POST "$BASE_URL/api/register" \
  -H 'Content-Type: application/json' \
  -d '{}')
if [[ "$REACH_CODE" == "000" ]]; then
  echo "API not reachable at $BASE_URL. Start your server first." >&2
  exit 1
fi

echo "[2/6] Registering fresh vendor test user"
TS="$(date +%s)"
EMAIL="vendor_webhook_test_${TS}@test.com"
REGISTER_BODY=$(printf '{"email":"%s","password":"Password123!","type":"vendor"}' "$EMAIL")
REGISTER_RESP=$(curl -s -X POST "$BASE_URL/api/register" -H 'Content-Type: application/json' -d "$REGISTER_BODY")
USER_ID=$(printf '%s' "$REGISTER_RESP" | sed -n 's/.*"id":\([0-9][0-9]*\).*/\1/p' | head -n1)

if [[ -z "$USER_ID" ]]; then
  echo "Failed to register test user. Response:" >&2
  echo "$REGISTER_RESP" >&2
  exit 1
fi

echo "[3/6] Inserting CREATED escrow fixture"
ESCROW_REF="escrow_signed_test_${TS}"
PAY_REF="payref_${TS}"
"${MYSQL[@]}" <<SQL
INSERT INTO escrow (amount_minor,currency,status,created_at,client_id,vendor_id,reference,external_payment_reference,updated_at)
VALUES (12000,'TZS','CREATED',NOW(),${USER_ID},${USER_ID},'${ESCROW_REF}','${PAY_REF}',NOW());
SQL

echo "[4/6] Testing signed collection webhook (first + duplicate replay)"
COLL_TXN="txn_${TS}"
COLL_EVENT_ID="evt_coll_${TS}"
COLL_BODY=$(printf '{"id":"%s","type":"payment.completed","created_at":"%s","data":{"reference":"%s","status":"success","external_reference":"%s","metadata":{"order_id":"%s"}}}' "$COLL_EVENT_ID" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$PAY_REF" "$COLL_TXN" "$ESCROW_REF")
COLL_SIG="$(sign_body "$COLL_BODY")"
WEBHOOK_TS="$TS"

COLL_CODE_1=$(http_status POST "$BASE_URL/webhooks/snippe/collection" "$COLL_BODY" "$COLL_SIG" "$WEBHOOK_TS" "payment.completed" /tmp/snippe_coll_1.json)
COLL_CODE_2=$(http_status POST "$BASE_URL/webhooks/snippe/collection" "$COLL_BODY" "$COLL_SIG" "$WEBHOOK_TS" "payment.completed" /tmp/snippe_coll_2.json)

[[ "$COLL_CODE_1" == "202" ]] || { echo "Expected first collection webhook status 202, got $COLL_CODE_1"; cat /tmp/snippe_coll_1.json; exit 1; }
[[ "$COLL_CODE_2" == "202" ]] || { echo "Expected duplicate collection webhook status 202, got $COLL_CODE_2"; cat /tmp/snippe_coll_2.json; exit 1; }
assert_contains /tmp/snippe_coll_1.json 'Webhook processed'
assert_contains /tmp/snippe_coll_2.json 'Duplicate webhook ignored'

echo "[5/6] Verifying DB side effects for collection webhook"
ESCROW_STATUS=$("${MYSQL[@]}" -e "SELECT status FROM escrow WHERE reference='${ESCROW_REF}' LIMIT 1;")
ESCROW_TXN=$("${MYSQL[@]}" -e "SELECT external_transaction_id FROM escrow WHERE reference='${ESCROW_REF}' LIMIT 1;")
WEBHOOK_COUNT=$("${MYSQL[@]}" -e "SELECT COUNT(*) FROM snippe_webhook_event WHERE event_id='${COLL_EVENT_ID}';")
LEDGER_COUNT=$("${MYSQL[@]}" -e "SELECT COUNT(*) FROM wallet_ledger_entry WHERE reference='${ESCROW_REF}';")

[[ "$ESCROW_STATUS" == "ACTIVE" ]] || { echo "Expected escrow status ACTIVE, got '$ESCROW_STATUS'"; exit 1; }
[[ "$ESCROW_TXN" == "$COLL_TXN" ]] || { echo "Expected escrow transaction '$COLL_TXN', got '$ESCROW_TXN'"; exit 1; }
[[ "$WEBHOOK_COUNT" == "1" ]] || { echo "Expected 1 webhook event row, got '$WEBHOOK_COUNT'"; exit 1; }
[[ "$LEDGER_COUNT" == "2" ]] || { echo "Expected 2 ledger rows, got '$LEDGER_COUNT'"; exit 1; }

echo "[6/6] Testing signed payout webhook for unknown reference (recorded/not-applied + duplicate)"
PAYOUT_REF="payout_signed_test_${TS}"
PAYOUT_TXN="txp_${TS}"
PAYOUT_EVENT_ID="evt_payout_${TS}"
PAYOUT_BODY=$(printf '{"id":"%s","type":"payout.completed","created_at":"%s","data":{"reference":"%s","status":"success","external_reference":"%s","metadata":{"order_id":"%s"}}}' "$PAYOUT_EVENT_ID" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$PAYOUT_REF" "$PAYOUT_TXN" "$PAYOUT_REF")
PAYOUT_SIG="$(sign_body "$PAYOUT_BODY")"

PAYOUT_CODE_1=$(http_status POST "$BASE_URL/webhooks/snippe/payout" "$PAYOUT_BODY" "$PAYOUT_SIG" "$WEBHOOK_TS" "payout.completed" /tmp/snippe_pay_1.json)
PAYOUT_CODE_2=$(http_status POST "$BASE_URL/webhooks/snippe/payout" "$PAYOUT_BODY" "$PAYOUT_SIG" "$WEBHOOK_TS" "payout.completed" /tmp/snippe_pay_2.json)

[[ "$PAYOUT_CODE_1" == "202" ]] || { echo "Expected first payout webhook status 202, got $PAYOUT_CODE_1"; cat /tmp/snippe_pay_1.json; exit 1; }
[[ "$PAYOUT_CODE_2" == "202" ]] || { echo "Expected duplicate payout webhook status 202, got $PAYOUT_CODE_2"; cat /tmp/snippe_pay_2.json; exit 1; }
assert_contains /tmp/snippe_pay_1.json 'Webhook recorded but not applied'
assert_contains /tmp/snippe_pay_2.json 'Duplicate webhook ignored'

echo "PASS: Signed webhook and idempotency checks succeeded."
