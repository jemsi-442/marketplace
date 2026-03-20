#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

composer validate --no-check-publish
bash lint_php.sh
composer analyze:phpstan
php bin/console lint:container --env=test
php bin/console lint:container --env=prod
php bin/console cache:clear --env=test

if [[ "${1:-}" == "--isolated" ]]; then
    bash run_isolated_api_tests.sh
else
    php bin/phpunit tests/Api
fi
