#!/usr/bin/env bash
set -Eeuo pipefail

readonly LOG_TAG="edziennik-kla-health"
readonly APP_HEALTH="http://127.0.0.1:3000/api/health"
readonly ORIGIN_HEALTH="http://127.0.0.1:8080/api/health"
readonly TUNNEL_HEALTH="http://127.0.0.1:20241/ready"
readonly STATE_DIR="/run/edziennik-kla-health"
readonly MAX_RESTARTS=2
readonly RESTART_WINDOW_SECONDS=600

# An intentional stop during restore/update must not be "repaired" mid-write.
if [[ "${KLA_MAINTENANCE_LOCK_HELD:-0}" != "1" ]]; then
  exec 9>/run/lock/kla-maintenance.lock
  flock -n 9 || exit 0
fi

log() {
  logger -t "$LOG_TAG" -- "$*"
}

ensure_active() {
  local service="$1"
  if systemctl is-active --quiet "$service"; then
    return 0
  fi
  restart_allowed "$service" || return 1
  log "Usługa $service jest zatrzymana; uruchamiam ją."
  systemctl restart "$service"
}

probe_http() {
  local url="$1" timeout="$2"
  curl --fail --silent --show-error --max-time "$timeout" "$url" >/dev/null
}

restart_allowed() {
  local service="$1" now cutoff file recent
  now="$(date +%s)"
  cutoff=$((now - RESTART_WINDOW_SECONDS))
  file="$STATE_DIR/$service.restarts"
  touch "$file"
  awk -v cutoff="$cutoff" '$1 >= cutoff' "$file" > "$file.tmp"
  mv "$file.tmp" "$file"
  recent="$(wc -l < "$file")"
  if (( recent >= MAX_RESTARTS )); then
    log "ALARM: pomijam restart $service — wykorzystano budżet $MAX_RESTARTS restartów w ciągu $((RESTART_WINDOW_SECONDS / 60)) minut."
    return 1
  fi
  printf '%s\n' "$now" >> "$file"
}

check_http_with_recovery() {
  local name="$1" url="$2" service="$3" wait_seconds="$4"
  local attempt
  if probe_http "$url" 10; then
    return 0
  fi

  # A single timeout during a traffic spike is not a reason to restart a
  # healthy process. Require three consecutive failures first.
  for attempt in 2 3; do
    sleep 2
    if probe_http "$url" 10; then
      log "Kontrola $name wróciła w próbie $attempt; restart nie był potrzebny."
      return 0
    fi
  done

  restart_allowed "$service" || return 1
  log "Kontrola $name nie przeszła trzy razy; wykonuję kontrolowany restart usługi $service."
  systemctl restart "$service"
  sleep "$wait_seconds"
  if ! probe_http "$url" 15; then
    log "ALARM: $name nadal nie odpowiada po restarcie usługi $service."
    return 1
  fi
  log "$name ponownie działa."
}

check_postgresql_with_recovery() {
  local attempt
  if runuser -u postgres -- pg_isready --quiet; then
    return 0
  fi
  for attempt in 2 3; do
    sleep 2
    if runuser -u postgres -- pg_isready --quiet; then
      log "PostgreSQL wrócił w próbie $attempt; restart nie był potrzebny."
      return 0
    fi
  done
  restart_allowed postgresql || return 1
  log "PostgreSQL nie przyjmuje połączeń po trzech próbach; wykonuję kontrolowany restart."
  systemctl restart postgresql
  sleep 5
  if ! runuser -u postgres -- pg_isready --quiet; then
    log "ALARM: PostgreSQL nadal nie odpowiada po kontrolowanym restarcie."
    return 1
  fi
  log "PostgreSQL ponownie działa."
}

if ! mountpoint -q /srv/kla-vault; then
  if [[ -f /etc/kla/vault-auto-unlock.key ]] && [[ -x /usr/lib/systemd/system-generators/systemd-cryptsetup-generator ]]; then
    log "Sejf nie jest jeszcze zamontowany; ponawiam kontrolowany start jednostki montowania."
    systemctl start --no-block 'srv-kla\x2dvault.mount' || true
  fi
  log "ALARM: szyfrowany sejf jest zamknięty. Automatyczny start nie może uruchomić bazy ani aplikacji."
  exit 1
fi

# Linux may report rw together with emergency_ro after an aborted journal.
# Never repeatedly restart writers against a damaged/read-only filesystem.
VAULT_OPTIONS="$(findmnt -rn -M /srv/kla-vault -o OPTIONS)" || VAULT_OPTIONS=""
if [[ -z "$VAULT_OPTIONS" || ",$VAULT_OPTIONS," == *,ro,* || ",$VAULT_OPTIONS," == *,emergency_ro,* ]]; then
  log "ALARM: dysk sejfu nie pozwala na zapis. Sprawdź zasilanie i dysk; automatyczne restarty bazy zostały wstrzymane."
  exit 1
fi

install -d -m 0750 "$STATE_DIR"

DEPLOYMENT_MODE="$(awk -F= '$1 == "KLA_DEPLOYMENT_MODE" {print $2}' /etc/kla/edziennik.env 2>/dev/null || true)"
FAILED=0

for service in postgresql clamav-daemon nginx edziennik-kla kla-web-control; do
  ensure_active "$service" || FAILED=1
done

check_postgresql_with_recovery || FAILED=1

check_http_with_recovery "aplikacji i bazy" "$APP_HEALTH" edziennik-kla 8 || FAILED=1
check_http_with_recovery "prywatnego originu nginx" "$ORIGIN_HEALTH" nginx 3 || FAILED=1

if [[ "$DEPLOYMENT_MODE" != "local-demo" ]]; then
  ensure_active cloudflared || FAILED=1
  check_http_with_recovery "tunelu Cloudflare" "$TUNNEL_HEALTH" cloudflared 8 || FAILED=1
fi

exit "$FAILED"
