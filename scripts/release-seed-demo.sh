#!/usr/bin/env bash

set -euo pipefail

release_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$release_dir"

if [[ -z "${KLA_DEMO_PASSWORD:-}" ]]; then
  echo "Brak KLA_DEMO_PASSWORD. Ustaw prywatne hasło danych demo i spróbuj ponownie."
  exit 1
fi

node migration-tools/seed-demo.mjs
