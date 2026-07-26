#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
compose_file="$script_dir/compose.yml"
env_file="$script_dir/.env"

if [[ ! -f "$env_file" ]]; then
  echo "Brak prywatnego pliku .env."
  exit 1
fi

docker compose --env-file "$env_file" -f "$compose_file" ps
docker compose --env-file "$env_file" -f "$compose_file" logs --tail=60 app
