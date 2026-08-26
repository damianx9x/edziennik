#!/usr/bin/env bash
set -Eeuo pipefail

source /etc/kla/vault.conf
DEPLOYMENT_MODE="$(awk -F= '$1 == "KLA_DEPLOYMENT_MODE" {print $2}' /etc/kla/edziennik.env 2>/dev/null || true)"
echo "KLA — stan urządzenia"
if mountpoint -q "$KLA_VAULT_MOUNT"; then echo "[OK] szyfrowany sejf jest otwarty"; else echo "[STOP] sejf zamknięty — uruchom: sudo kla-unlock"; fi
SERVICES=(postgresql clamav-daemon edziennik-kla nginx)
[[ "$DEPLOYMENT_MODE" == "production" ]] && SERVICES+=(cloudflared)
for SERVICE in "${SERVICES[@]}"; do
  if systemctl is-active --quiet "$SERVICE"; then echo "[OK] $SERVICE"; else echo "[STOP] $SERVICE"; fi
done
if curl --fail --silent --max-time 5 http://127.0.0.1:3000/ >/dev/null; then echo "[OK] aplikacja odpowiada"; else echo "[STOP] aplikacja nie odpowiada"; fi
if curl --fail --silent --max-time 10 http://127.0.0.1:8080/api/health >/dev/null; then echo "[OK] prywatny origin nginx odpowiada"; else echo "[STOP] prywatny origin nginx nie odpowiada"; fi
if command -v vcgencmd >/dev/null; then echo "Temperatura: $(vcgencmd measure_temp | cut -d= -f2)"; fi
echo "Ostatnia kopia: $(find "$KLA_VAULT_MOUNT/backups" -maxdepth 1 -name '*.age' -type f -printf '%TY-%Tm-%Td %TH:%TM %f\n' 2>/dev/null | sort | tail -n1 || echo brak)"
if [[ -f "$KLA_VAULT_MOUNT/restore-tests/latest-ok" ]]; then
  echo "Ostatni test odtworzenia: $(cat "$KLA_VAULT_MOUNT/restore-tests/latest-ok")"
else
  echo "[UWAGA] nie wykonano jeszcze testu odtworzenia"
fi
