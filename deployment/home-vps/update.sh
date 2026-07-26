#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
compose_file="$script_dir/compose.yml"
env_file="$script_dir/.env"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Uruchom aktualizację przez: sudo ./deployment/home-vps/update.sh"
  exit 1
fi

if [[ ! -f "$env_file" ]]; then
  echo "Brak prywatnego pliku .env. Najpierw wykonaj install.sh."
  exit 1
fi

compose() {
  docker compose --env-file "$env_file" -f "$compose_file" "$@"
}

echo "Tworzę kopię bazy przed aktualizacją..."
"$script_dir/backup.sh"

echo "Buduję nową wersję..."
compose build --pull app
compose run --rm app ./migrate.sh
compose up -d --remove-orphans
compose ps

echo "Aktualizacja zakończona."
