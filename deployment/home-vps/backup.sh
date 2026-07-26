#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
compose_file="$script_dir/compose.yml"
env_file="$script_dir/.env"
backup_dir="$script_dir/backups"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Uruchom kopię przez: sudo ./deployment/home-vps/backup.sh"
  exit 1
fi

if [[ ! -f "$env_file" ]]; then
  echo "Brak prywatnego pliku .env."
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$env_file"
set +a

mkdir -p "$backup_dir"
chmod 700 "$backup_dir"
backup_file="$backup_dir/kla-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"

docker compose --env-file "$env_file" -f "$compose_file" \
  exec -T db pg_dump \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --username "$POSTGRES_USER" \
  "$POSTGRES_DB" \
  | gzip -9 >"$backup_file"

chmod 600 "$backup_file"
echo "Kopia bazy gotowa: $backup_file"
