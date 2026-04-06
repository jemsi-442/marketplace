#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_ENV="${APP_ENV:-prod}"
CALLBACK_INPUT="${1:-${CALLBACK_URL:-/api/payments/webhooks/payout}}"

load_env_file() {
  local file="$1"
  if [[ -f "$file" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$file"
    set +a
  fi
}

redact_value() {
  local value="$1"
  local length=${#value}
  if (( length <= 8 )); then
    printf '***'
    return
  fi

  printf '%s...%s' "${value:0:4}" "${value: -4}"
}

is_local_host() {
  local host="$1"
  [[ "$host" == "127.0.0.1" || "$host" == "localhost" || "$host" == "::1" ]]
}

load_env_file "$ROOT_DIR/.env"
load_env_file "$ROOT_DIR/.env.local"
load_env_file "$ROOT_DIR/.env.${APP_ENV}"
load_env_file "$ROOT_DIR/.env.${APP_ENV}.local"

required_vars=(
  DEFAULT_URI
  SNIPPE_BASE_URL
  SNIPPE_API_KEY
  SNIPPE_WEBHOOK_SECRET
)

missing=0
for var_name in "${required_vars[@]}"; do
  if [[ -z "${!var_name:-}" ]]; then
    printf 'ERROR: %s is not set.\n' "$var_name" >&2
    missing=1
  fi
done

if (( missing > 0 )); then
  exit 1
fi

if [[ "$CALLBACK_INPUT" =~ ^https?:// ]]; then
  CALLBACK_URL="$CALLBACK_INPUT"
else
  CALLBACK_URL="${DEFAULT_URI%/}/${CALLBACK_INPUT#/}"
fi

provider_host="$(php -r 'echo parse_url($argv[1], PHP_URL_HOST) ?: "";' "$SNIPPE_BASE_URL")"
provider_scheme="$(php -r 'echo parse_url($argv[1], PHP_URL_SCHEME) ?: "";' "$SNIPPE_BASE_URL")"
callback_host="$(php -r 'echo parse_url($argv[1], PHP_URL_HOST) ?: "";' "$CALLBACK_URL")"
callback_scheme="$(php -r 'echo parse_url($argv[1], PHP_URL_SCHEME) ?: "";' "$CALLBACK_URL")"

printf 'Provider preflight\n'
printf '  app_env: %s\n' "$APP_ENV"
printf '  snippe_base_url: %s\n' "$SNIPPE_BASE_URL"
printf '  snippe_api_key: %s\n' "$(redact_value "$SNIPPE_API_KEY")"
printf '  webhook_secret: %s\n' "$(redact_value "$SNIPPE_WEBHOOK_SECRET")"
printf '  callback_url: %s\n' "$CALLBACK_URL"

if [[ "$provider_scheme" != "https" ]]; then
  printf 'ERROR: SNIPPE_BASE_URL must use https.\n' >&2
  exit 1
fi

if [[ -z "$provider_host" ]]; then
  printf 'ERROR: Could not parse provider host from SNIPPE_BASE_URL.\n' >&2
  exit 1
fi

if [[ "$callback_scheme" != "https" ]]; then
  printf 'WARNING: callback_url is not https. Real providers usually require a public https callback.\n'
fi

if [[ -z "$callback_host" ]]; then
  printf 'ERROR: Could not parse callback host.\n' >&2
  exit 1
fi

if is_local_host "$callback_host"; then
  printf 'WARNING: callback host resolves to a local address. A real provider will not reach this without a tunnel or public reverse proxy.\n'
fi

if is_local_host "$provider_host"; then
  printf 'WARNING: provider host is local. This looks like a stub or non-public gateway target.\n'
fi

printf '\nChecklist\n'
printf '  [x] required provider credentials are present\n'
printf '  [x] provider base URL is parseable\n'
printf '  [x] callback URL is parseable\n'
printf '  [ ] confirm payout destination is a controlled test recipient before any live approval\n'
printf '  [ ] confirm the callback URL is reachable from the provider network before any live approval\n'
