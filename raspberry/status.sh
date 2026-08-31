#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${EUID} -ne 0 ]]; then echo "Uruchom: sudo kla-status"; exit 1; fi
source /etc/kla/vault.conf
DEPLOYMENT_MODE="$(awk -F= '$1 == "KLA_DEPLOYMENT_MODE" {print $2}' /etc/kla/edziennik.env 2>/dev/null || true)"
echo "KLA — stan urządzenia"
if mountpoint -q "$KLA_VAULT_MOUNT"; then echo "[OK] szyfrowany sejf jest otwarty"; else echo "[STOP] sejf zamknięty — uruchom: sudo kla-unlock"; fi
SERVICES=(postgresql clamav-daemon edziennik-kla nginx)
[[ "$DEPLOYMENT_MODE" != "local-demo" ]] && SERVICES+=(cloudflared)
for SERVICE in "${SERVICES[@]}"; do
  if systemctl is-active --quiet "$SERVICE"; then echo "[OK] $SERVICE"; else echo "[STOP] $SERVICE"; fi
done
if curl --fail --silent --max-time 5 http://127.0.0.1:3000/ >/dev/null; then echo "[OK] aplikacja odpowiada"; else echo "[STOP] aplikacja nie odpowiada"; fi
if curl --fail --silent --max-time 10 http://127.0.0.1:8080/api/health >/dev/null; then echo "[OK] prywatny origin nginx odpowiada"; else echo "[STOP] prywatny origin nginx nie odpowiada"; fi
if [[ -f /etc/kla/vault-auto-unlock.key ]] && grep -qE '^[[:space:]]*kla-data[[:space:]]' /etc/crypttab; then
  echo "[OK] automatyczny start po zaniku prądu"
else
  echo "[UWAGA] automatyczny start sejfu nie jest jeszcze włączony"
fi
if grep -RqsE '^[[:space:]]*RuntimeWatchdogSec=' /etc/systemd/system.conf /etc/systemd/system.conf.d 2>/dev/null; then
  echo "[OK] sprzętowy watchdog systemd skonfigurowany"
else
  echo "[STOP] sprzętowy watchdog systemd nie jest skonfigurowany"
fi
if [[ -d /var/log/journal ]] && grep -RqsE '^[[:space:]]*Storage=persistent' /etc/systemd/journald.conf /etc/systemd/journald.conf.d 2>/dev/null; then
  echo "[OK] trwałe logi poprzednich uruchomień"
else
  echo "[UWAGA] logi startu nie są jawnie zapisane trwale"
fi
for TIMER in edziennik-kla-health.timer edziennik-kla-backup.timer edziennik-kla-retention.timer edziennik-kla-restore-test.timer edziennik-kla-email-queue.timer; do
  if systemctl is-enabled --quiet "$TIMER" && systemctl is-active --quiet "$TIMER"; then
    echo "[OK] $TIMER"
  else
    echo "[STOP] $TIMER"
  fi
done
if command -v vcgencmd >/dev/null; then
  echo "Temperatura: $(vcgencmd measure_temp | cut -d= -f2)"
  THROTTLED="$(vcgencmd get_throttled | cut -d= -f2)"
  if [[ "$THROTTLED" == "0x0" ]]; then echo "[OK] brak przegrzania i problemów z zasilaniem"; else echo "[UWAGA] zasilanie/temperatura: $THROTTLED"; fi
fi
echo "Ostatnia kopia: $(find "$KLA_VAULT_MOUNT/backups" -maxdepth 1 -name '*.age' -type f -printf '%TY-%Tm-%Td %TH:%TM %f\n' 2>/dev/null | sort | tail -n1 || echo brak)"
if [[ -f "$KLA_VAULT_MOUNT/restore-tests/latest-ok" ]]; then
  echo "Ostatni test odtworzenia: $(cat "$KLA_VAULT_MOUNT/restore-tests/latest-ok")"
else
  echo "[UWAGA] nie wykonano jeszcze testu odtworzenia"
fi
