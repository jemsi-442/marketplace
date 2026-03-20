#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

bash prepare_test_db.sh

TEST_DB_URL="${TEST_DATABASE_URL:-}"

if [[ -z "$TEST_DB_URL" && -f .env.test.local ]]; then
    TEST_DB_URL="$(grep -E '^TEST_DATABASE_URL=' .env.test.local | tail -n 1 | cut -d= -f2- | tr -d '"' || true)"
fi

if [[ -z "$TEST_DB_URL" ]]; then
    echo "TEST_DATABASE_URL is not set."
    exit 1
fi

TEST_DATABASE_URL="$TEST_DB_URL" APP_ENV=test APP_DEBUG=0 php bin/phpunit tests/Api
