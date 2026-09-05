#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${EUID} -ne 0 ]]; then echo "Uruchom: sudo kla-status"; exit 1; fi
source /etc/kla/vault.conf
DEPLOYMENT_MODE="$(awk -F= '$1 == "KLA_DEPLOYMENT_MODE" {print $2}' /etc/kla/edziennik.env 2>/dev/null || true)"
BOOT_SECONDS="${BOOT_SECONDS:-$(cut -d. -f1 /proc/uptime)}"
START_GRACE=300
AUTO_UNLOCK_READY=0
if [[ -f /etc/kla/vault-auto-unlock.key ]] && grep -qE '^[[:space:]]*kla-data[[:space:]]' /etc/crypttab; then
  AUTO_UNLOCK_READY=1
fi
STARTING=0
if ! mountpoint -q "$KLA_VAULT_MOUNT" && ((AUTO_UNLOCK_READY == 1 && BOOT_SECONDS < START_GRACE)); then
  STARTING=1
fi
echo "KLA — stan urządzenia"
if mountpoint -q "$KLA_VAULT_MOUNT"; then
  VAULT_OPTIONS="$(findmnt -rn -M "$KLA_VAULT_MOUNT" -o OPTIONS)" || VAULT_OPTIONS=""
  if [[ -z "$VAULT_OPTIONS" || ",$VAULT_OPTIONS," == *,ro,* || ",$VAULT_OPTIONS," == *,emergency_ro,* ]]; then
    echo "[STOP] sejf otwarty, ale dysk nie pozwala na zapis — sprawdź zasilanie i dysk. Ponowne wpisanie klucza nie naprawi tego błędu."
  else
    echo "[OK] szyfrowany sejf jest otwarty w trybie zapisu"
  fi
elif ((STARTING == 1)); then
  echo "[START] sejf otwiera się automatycznie — po zaniku prądu może to potrwać do 5 minut"
else
  echo "[STOP] sejf zamknięty — uruchom: sudo kla-unlock"
fi
SERVICES=(postgresql clamav-daemon edziennik-kla nginx)
[[ "$DEPLOYMENT_MODE" != "local-demo" ]] && SERVICES+=(cloudflared)
for SERVICE in "${SERVICES[@]}"; do
  if [[ "$SERVICE" == "postgresql" ]] && ! runuser -u postgres -- pg_isready --quiet; then
    echo "[STOP] PostgreSQL nie przyjmuje połączeń"
  elif systemctl is-active --quiet "$SERVICE"; then
    echo "[OK] $SERVICE"
  elif ((STARTING == 1)); then
    echo "[START] $SERVICE oczekuje na sejf"
  else
    echo "[STOP] $SERVICE"
  fi
done
if curl --fail --silent --max-time 5 http://127.0.0.1:3000/api/health >/dev/null; then
  echo "[OK] aplikacja i baza odpowiadają"
elif ((STARTING == 1)); then
  echo "[START] aplikacja jeszcze się uruchamia"
else
  echo "[STOP] aplikacja nie odpowiada"
fi
if curl --fail --silent --max-time 10 http://127.0.0.1:8080/api/health >/dev/null; then
  echo "[OK] prywatny origin nginx odpowiada"
elif ((STARTING == 1)); then
  echo "[START] prywatny origin jeszcze się uruchamia"
else
  echo "[STOP] prywatny origin nginx nie odpowiada"
fi
if ((AUTO_UNLOCK_READY == 1)); then
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
