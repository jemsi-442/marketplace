#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

read_env_file_value() {
    local file="$1"
    local key="$2"

    [[ -f "$file" ]] || return 0

    grep -E "^${key}=" "$file" | tail -n 1 | cut -d= -f2- | tr -d '"' || true
}

TEST_DB_URL="${TEST_DATABASE_URL:-}"

if [[ -z "$TEST_DB_URL" && -f .env.test.local ]]; then
    TEST_DB_URL="$(read_env_file_value .env.test.local TEST_DATABASE_URL)"
fi

if [[ -z "$TEST_DB_URL" ]]; then
    echo "TEST_DATABASE_URL is not set."
    echo "Create backend/.env.test.local and point it at a dedicated test database."
    exit 1
fi

if [[ $# -eq 0 ]]; then
    echo "Usage: bash run_test_env_command.sh <command> [args...]"
    exit 1
fi

export DATABASE_URL="$TEST_DB_URL"
export TEST_DATABASE_URL="$TEST_DB_URL"
export APP_ENV=test
export APP_DEBUG=0

exec "$@"
