#!/usr/bin/env bash
set -Eeuo pipefail

[[ ${EUID} -eq 0 ]] || { echo "Uruchom: sudo kla-startup-audit"; exit 1; }
source /etc/kla/vault.conf

FAILED=0
ok() { printf '[OK] %s\n' "$1"; }
fail() { printf '[STOP] %s\n' "$1"; FAILED=1; }

check_enabled() {
  local unit="$1" label="$2"
  systemctl is-enabled --quiet "$unit" && ok "$label: start automatyczny" || fail "$label: brak startu automatycznego"
}

check_active() {
  local unit="$1" label="$2"
  systemctl is-active --quiet "$unit" && ok "$label: działa" || fail "$label: zatrzymany"
}

echo "KLA — audyt startu i watchdogów"
[[ -x /usr/lib/systemd/system-generators/systemd-cryptsetup-generator ]] \
  && ok "obsługa szyfrowanych dysków systemd" \
  || fail "brak pakietu systemd-cryptsetup; crypttab nie wystarcza"

if [[ -f /etc/kla/vault-auto-unlock.key ]] \
  && [[ "$(stat -c '%U:%G:%a' /etc/kla/vault-auto-unlock.key)" == "root:root:600" ]] \
  && grep -qE '^[[:space:]]*kla-data[[:space:]].*/etc/kla/vault-auto-unlock\.key[[:space:]]' /etc/crypttab \
  && grep -qE '^[^#]+[[:space:]]+/srv/kla-vault[[:space:]]' /etc/fstab; then
  ok "sejf: klucz startowy root-only, crypttab i fstab"
else
  fail "sejf: automatyczne odblokowanie nie jest kompletne"
fi

mountpoint -q "$KLA_VAULT_MOUNT" && ok "sejf: zamontowany" || fail "sejf: zamknięty"

if grep -RqsE '^[[:space:]]*RuntimeWatchdogSec=' /etc/systemd/system.conf /etc/systemd/system.conf.d 2>/dev/null; then
  ok "sprzętowy watchdog systemd"
else
  fail "sprzętowy watchdog systemd nie ma aktywnej konfiguracji"
fi

[[ -d /var/log/journal ]] \
  && grep -RqsE '^[[:space:]]*Storage=persistent' /etc/systemd/journald.conf /etc/systemd/journald.conf.d 2>/dev/null \
  && ok "trwały dziennik poprzednich uruchomień" \
  || fail "dziennik systemowy nie jest jawnie trwały"

for unit in \
  edziennik-kla-health.timer edziennik-kla-backup.timer \
  edziennik-kla-retention.timer edziennik-kla-restore-test.timer \
  edziennik-kla-email-queue.timer; do
  check_enabled "$unit" "$unit"
  check_active "$unit" "$unit"
done

check_enabled edziennik-kla.service "aplikacja"
if mountpoint -q "$KLA_VAULT_MOUNT"; then
  for pair in \
    'postgresql.service|PostgreSQL' \
    'edziennik-kla.service|aplikacja' \
    'kla-web-control.service|panel sterowania' \
    'nginx.service|prywatny origin' \
    'cloudflared.service|tunel Cloudflare' \
    'clamav-daemon.service|skaner plików'; do
    IFS='|' read -r unit label <<<"$pair"
    check_active "$unit" "$label"
  done
  [[ "$(systemctl show -p Restart --value edziennik-kla.service)" == "always" ]] \
    && ok "aplikacja: Restart=always" \
    || fail "aplikacja: brak Restart=always"
  [[ "$(systemctl show -p Restart --value cloudflared.service)" =~ ^(always|on-failure)$ ]] \
    && ok "tunel Cloudflare: automatyczny restart" \
    || fail "tunel Cloudflare: brak polityki restartu"
fi

exit "$FAILED"
