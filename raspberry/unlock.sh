#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${EUID} -ne 0 ]]; then echo "Uruchom: sudo kla-unlock"; exit 1; fi
source /etc/kla/vault.conf

if ! cryptsetup status "$KLA_VAULT_MAPPER" >/dev/null 2>&1; then
  cryptsetup luksOpen "UUID=$KLA_LUKS_UUID" "$KLA_VAULT_MAPPER"
fi
if ! mountpoint -q "$KLA_VAULT_MOUNT"; then
  install -d -m 700 "$KLA_VAULT_MOUNT"
  mount -o noatime,nodiratime "/dev/mapper/$KLA_VAULT_MAPPER" "$KLA_VAULT_MOUNT"
fi
VAULT_OPTIONS="$(findmnt -rn -M "$KLA_VAULT_MOUNT" -o OPTIONS)" || VAULT_OPTIONS=""
if [[ -z "$VAULT_OPTIONS" || ",$VAULT_OPTIONS," == *,ro,* || ",$VAULT_OPTIONS," == *,emergency_ro,* ]]; then
  echo "Sejf jest otwarty, ale dysk nie pozwala na zapis. Nie wpisuj ponownie klucza. Sprawdź zasilanie i dysk; baza nie została uruchomiona."
  exit 1
fi
systemctl start postgresql clamav-daemon nginx edziennik-kla
runuser -u postgres -- pg_isready --quiet || { echo "Sejf otwarty, ale PostgreSQL jeszcze nie odpowiada. Sprawdź: sudo kla-status"; exit 1; }
curl --fail --silent --max-time 10 --retry 5 --retry-delay 2 --retry-connrefused http://127.0.0.1:3000/api/health >/dev/null || { echo "Sejf otwarty, ale aplikacja nie przeszła kontroli. Sprawdź: sudo kla-status"; exit 1; }
echo "Sejf otwarty. eDziennik uruchomiony."
systemctl --no-pager --full status edziennik-kla | sed -n '1,8p'
