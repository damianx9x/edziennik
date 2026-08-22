#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${EUID} -ne 0 ]]; then echo "Uruchom: sudo kla-unlock"; exit 1; fi
source /etc/kla/vault.conf

if ! cryptsetup status "$KLA_VAULT_MAPPER" >/dev/null 2>&1; then
  cryptsetup luksOpen "UUID=$KLA_LUKS_UUID" "$KLA_VAULT_MAPPER"
fi
install -d -m 700 "$KLA_VAULT_MOUNT"
mountpoint -q "$KLA_VAULT_MOUNT" || mount "/dev/mapper/$KLA_VAULT_MAPPER" "$KLA_VAULT_MOUNT"
systemctl start postgresql clamav-daemon nginx edziennik-kla
echo "Sejf otwarty. eDziennik uruchomiony."
systemctl --no-pager --full status edziennik-kla | sed -n '1,8p'
