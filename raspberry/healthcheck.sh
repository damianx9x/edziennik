#!/usr/bin/env bash
set -Eeuo pipefail

readonly LOG_TAG="edziennik-kla-health"
readonly APP_HEALTH="http://127.0.0.1:3000/api/health"
readonly ORIGIN_HEALTH="http://127.0.0.1:8080/api/health"
readonly TUNNEL_HEALTH="http://127.0.0.1:20241/ready"

log() {
  logger -t "$LOG_TAG" -- "$*"
}

ensure_active() {
  local service="$1"
  if systemctl is-active --quiet "$service"; then
    return 0
  fi
  log "Usługa $service jest zatrzymana; uruchamiam ją."
  systemctl restart "$service"
}

check_http_with_recovery() {
  local name="$1" url="$2" service="$3" wait_seconds="$4"
  if curl --fail --silent --show-error --max-time 10 "$url" >/dev/null; then
    return 0
  fi

  log "Kontrola $name nie przeszła; wykonuję pojedynczy restart usługi $service."
  systemctl restart "$service"
  sleep "$wait_seconds"
  if ! curl --fail --silent --show-error --max-time 15 "$url" >/dev/null; then
    log "ALARM: $name nadal nie odpowiada po restarcie usługi $service."
    return 1
  fi
  log "$name ponownie działa."
}

if ! mountpoint -q /srv/kla-vault; then
  log "Szyfrowany sejf jest zamknięty; automatyczna naprawa celowo czeka na ręczne odblokowanie."
  exit 0
fi

DEPLOYMENT_MODE="$(awk -F= '$1 == "KLA_DEPLOYMENT_MODE" {print $2}' /etc/kla/edziennik.env 2>/dev/null || true)"
FAILED=0

for service in postgresql clamav-daemon nginx edziennik-kla; do
  ensure_active "$service" || FAILED=1
done

if ! runuser -u postgres -- pg_isready --quiet; then
  log "Baza PostgreSQL nie przyjmuje połączeń; wykonuję pojedynczy restart."
  systemctl restart postgresql
  sleep 5
  runuser -u postgres -- pg_isready --quiet || { log "ALARM: PostgreSQL nadal nie odpowiada."; FAILED=1; }
fi

check_http_with_recovery "aplikacji i bazy" "$APP_HEALTH" edziennik-kla 8 || FAILED=1
check_http_with_recovery "prywatnego originu nginx" "$ORIGIN_HEALTH" nginx 3 || FAILED=1

if [[ "$DEPLOYMENT_MODE" != "local-demo" ]]; then
  ensure_active cloudflared || FAILED=1
  check_http_with_recovery "tunelu Cloudflare" "$TUNNEL_HEALTH" cloudflared 8 || FAILED=1
fi

exit "$FAILED"
