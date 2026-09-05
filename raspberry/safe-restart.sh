#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# Shared with update, backup, restore and healthcheck. Never interrupt their work.
exec 9>/run/lock/kla-maintenance.lock
flock -n 9 || { logger -t kla-planned-restart 'Restart pominięty: trwają prace serwisowe.'; exit 0; }
mountpoint -q /srv/kla-vault || { echo 'Restart pominięty: sejf jest zamknięty.' >&2; exit 1; }
systemctl is-active --quiet edziennik-kla || { echo 'Aplikacja zatrzymana; odzyskanie należy do watchdogu.' >&2; exit 1; }

STATE=/var/lib/kla-restart
install -d -m 700 "$STATE"
NOW="$(date +%s)"
LAST="$(cat "$STATE/last-attempt" 2>/dev/null || echo 0)"
[[ "$LAST" =~ ^[0-9]+$ ]] || LAST=0
if (( NOW - LAST < 900 )); then
  logger -t kla-planned-restart 'Restart pominięty: obowiązuje przerwa 15 minut między próbami.'
  exit 0
fi
# A planned restart is optional maintenance, never an excuse to proceed without a copy.
LATEST="$(find /srv/kla-vault/backups -maxdepth 1 -name 'kla-*.tar.age' -type f -mmin -2880 -print | sort | tail -n1)"
[[ -n "$LATEST" && -f "$LATEST.sha256" ]] || { echo 'Restart pominięty: brak kompletnej kopii z ostatnich 48 godzin.' >&2; exit 1; }
(cd /srv/kla-vault/backups && sha256sum -c "$(basename "$LATEST").sha256" >/dev/null)
printf '%s\n' "$NOW" > "$STATE/last-attempt"
logger -t kla-planned-restart 'Rozpoczynam kontrolowany restart aplikacji; baza i tunel pozostają aktywne.'
systemctl restart edziennik-kla
for attempt in {1..15}; do
  if curl --fail --silent --max-time 3 http://127.0.0.1:3000/api/health >/dev/null; then
    date --iso-8601=seconds > "$STATE/last-success"
    logger -t kla-planned-restart 'Aplikacja wróciła po restarcie; kontrola bazy i HTTP poprawna.'
    exit 0
  fi
  sleep 2
done
logger -t kla-planned-restart 'ALARM: aplikacja nie wróciła po restarcie. Sprawdź usługę i logi.'
exit 1
