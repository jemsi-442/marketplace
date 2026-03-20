#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

mkdir -p var/cache/dev

php bin/console debug:container --env=dev --no-debug --show-hidden --format=xml > var/cache/dev/phpstan-container.xml
