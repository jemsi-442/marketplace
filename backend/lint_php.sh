#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

while IFS= read -r -d '' file; do
    php -l "$file" >/dev/null
done < <(find src tests config bin -type f \( -name '*.php' -o -name 'console' \) -print0)

echo "PHP syntax lint passed."
