#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Uruchom: sudo kla-local-url"
  exit 1
fi

ENV_FILE=/etc/kla/edziennik.env
[[ -f "$ENV_FILE" ]] || { echo "Nie znaleziono konfiguracji KLA."; exit 1; }
MODE="$(awk -F= '$1 == "KLA_DEPLOYMENT_MODE" {print $2}' "$ENV_FILE")"
[[ "$MODE" == "local-demo" ]] || {
  echo "Ten skrót działa wyłącznie dla lokalnego demo. Produkcja wymaga stałego adresu HTTPS."
  exit 1
}

LOCAL_IP="$(ip -o -4 addr show scope global | awk '$2 !~ /^(docker|br-|veth)/ {split($4, parts, "/"); print parts[1]; exit}')"
[[ -n "$LOCAL_IP" ]] || { echo "Nie znaleziono adresu IP. Podłącz sieć i spróbuj ponownie."; exit 1; }
APP_URL="http://${LOCAL_IP}:8080"

sed -i \
  -e "s|^BETTER_AUTH_URL=.*|BETTER_AUTH_URL=${APP_URL}|" \
  -e "s|^NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=${APP_URL}|" \
  "$ENV_FILE"

echo "Aktualizuję adres w aplikacji — może to potrwać kilka minut."
runuser -u kla -- bash -lc "cd /opt/kla/current && set -a && source '$ENV_FILE' && set +a && npm run build"
systemctl restart edziennik-kla
echo "Adres lokalnego demo: $APP_URL"
echo "Jeśli adres IP się zmienił, aplikacja została przeładowana pod nowym adresem."
