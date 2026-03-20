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

normalize_db_name() {
    php -r '
        $url = $argv[1] ?? "";
        if ($url === "") {
            exit(0);
        }

        $parts = parse_url($url);
        $path = $parts["path"] ?? "";
        $dbName = ltrim($path, "/");
        echo $dbName;
    ' "$1"
}

TEST_DB_URL="${TEST_DATABASE_URL:-}"
APP_DB_URL="${DATABASE_URL:-}"

if [[ -z "$TEST_DB_URL" && -f .env.test.local ]]; then
    TEST_DB_URL="$(read_env_file_value .env.test.local TEST_DATABASE_URL)"
fi

if [[ -z "$APP_DB_URL" && -f .env.test ]]; then
    APP_DB_URL="$(read_env_file_value .env.test DATABASE_URL)"
fi

if [[ -z "$TEST_DB_URL" ]]; then
    echo "TEST_DATABASE_URL is not set."
    echo "Create backend/.env.test.local from backend/.env.test.local.example and point it at a dedicated test database."
    exit 1
fi

TEST_DB_NAME="$(normalize_db_name "$TEST_DB_URL")"
APP_DB_NAME="$(normalize_db_name "$APP_DB_URL")"

if [[ -n "$APP_DB_URL" && "$TEST_DB_URL" == "$APP_DB_URL" ]]; then
    echo "Refusing to prepare test database because TEST_DATABASE_URL matches DATABASE_URL."
    echo "Point TEST_DATABASE_URL at a dedicated database before running this command."
    exit 1
fi

if [[ -n "$APP_DB_NAME" && -n "$TEST_DB_NAME" && "$TEST_DB_NAME" == "$APP_DB_NAME" ]]; then
    echo "Refusing to prepare test database because both URLs target the same database name: $TEST_DB_NAME"
    echo "Use a dedicated database such as marketplace_test."
    exit 1
fi

echo "Preparing dedicated test database..."
if ! DATABASE_URL="$TEST_DB_URL" APP_ENV=test APP_DEBUG=0 php bin/console doctrine:database:create --if-not-exists --no-interaction; then
    echo
    echo "Failed to create the dedicated test database."
    echo "If MariaDB returns access denied, either:"
    echo "  1. Grant CREATE DATABASE privileges to the test DB user, or"
    echo "  2. Pre-create the database manually and rerun this command."
    echo "Current TEST_DATABASE_URL targets: $TEST_DB_NAME"
    exit 1
fi

DATABASE_URL="$TEST_DB_URL" APP_ENV=test APP_DEBUG=0 php bin/console doctrine:migrations:migrate --no-interaction

echo "Test database is ready."
