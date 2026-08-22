#!/usr/bin/env bash

set -Eeuo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
compose_file="$script_dir/compose.yml"
env_file="$script_dir/.env"
lock_file=/run/lock/edziennik-kla-vps-update.lock
old_image_id=""
app_image_name=""
switched=0

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Uruchom aktualizację przez: sudo ./deployment/home-vps/update.sh"
  exit 1
fi

if [[ ! -f "$env_file" ]]; then
  echo "Brak prywatnego pliku .env. Najpierw wykonaj install.sh."
  exit 1
fi

exec 9>"$lock_file"
if ! flock -n 9; then
  echo "Inna aktualizacja już trwa. Poczekaj na jej zakończenie."
  exit 1
fi

compose() {
  docker compose --env-file "$env_file" -f "$compose_file" "$@"
}

rollback() {
  local exit_code=$?
  if [[ "$switched" -eq 1 && -n "$old_image_id" && -n "$app_image_name" ]]; then
    echo "Nowa wersja nie przeszła kontroli. Przywracam poprzedni obraz..."
    docker tag "$old_image_id" "$app_image_name"
    compose up -d --no-build --force-recreate app caddy || true
  fi
  exit "$exit_code"
}
trap rollback ERR INT TERM

old_container="$(compose ps -q app)"
if [[ -n "$old_container" ]]; then
  old_image_id="$(docker inspect --format '{{.Image}}' "$old_container")"
  app_image_name="$(docker inspect --format '{{.Config.Image}}' "$old_container")"
fi

echo "Buduję nową wersję, gdy bieżąca nadal działa..."
compose build --pull app

echo "Tworzę kopię bazy przed migracją..."
"$script_dir/backup.sh"

# Kod i CI blokują migracje destrukcyjne. Dzięki temu poprzedni kontener może
# wrócić po nieudanym teście zdrowia nowej wersji.
echo "Stosuję migracje bazy..."
compose run --rm app ./migrate.sh
compose run --rm app ./apply-director-mfa-policy.sh

echo "Przełączam kontener aplikacji..."
compose up -d --remove-orphans
switched=1

for attempt in {1..45}; do
  app_status="$(
    compose ps --format json app 2>/dev/null \
      | grep -o '"Health":"[^"]*"' \
      | head -1 \
      | cut -d'"' -f4 \
      || true
  )"
  if [[ "$app_status" == "healthy" ]]; then
    switched=0
    trap - ERR INT TERM
    compose ps
    echo "Aktualizacja zakończona i przeszła kontrolę zdrowia."
    exit 0
  fi
  if [[ "$attempt" -eq 45 ]]; then
    echo "Nowa wersja nie osiągnęła stanu healthy."
    compose logs --tail=120 app || true
    false
  fi
  sleep 2
done
