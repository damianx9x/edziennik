#!/usr/bin/env bash

set -euo pipefail

release_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$release_dir"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Brak DATABASE_URL. Ustaw bezpieczny adres bazy PostgreSQL i spróbuj ponownie."
  exit 1
fi

echo "Uruchamiam zatwierdzone migracje Prisma 7.8.0..."
node "$release_dir/migration-tools/node_modules/prisma/build/index.js" \
  migrate deploy \
  --config "$release_dir/migration-tools/prisma.config.ts"
echo "Migracje zakończone."
