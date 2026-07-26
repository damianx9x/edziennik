#!/usr/bin/env bash

set -euo pipefail

release_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$release_dir"

if [[ -z "${KLA_SYSTEM_OWNER_PASSWORD:-}" ]]; then
  echo "Brak KLA_SYSTEM_OWNER_PASSWORD. Ustaw prywatne hasło i spróbuj ponownie."
  exit 1
fi

node migration-tools/setup-owner.mjs
