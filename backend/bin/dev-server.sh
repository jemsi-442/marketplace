#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${1:-8000}"
HOST="${HOST:-127.0.0.1}"

load_env_file() {
  local file="$1"
  if [[ -f "$file" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$file"
    set +a
  fi
}

load_env_file "$ROOT_DIR/.env"
load_env_file "$ROOT_DIR/.env.dev"
load_env_file "$ROOT_DIR/.env.dev.local"

export APP_ENV=dev
export APP_DEBUG=1
export DEFAULT_URI="http://${HOST}:${PORT}"

cd "$ROOT_DIR"
php bin/console cache:clear --env=dev --no-warmup >/dev/null
exec php -S "${HOST}:${PORT}" -t public
