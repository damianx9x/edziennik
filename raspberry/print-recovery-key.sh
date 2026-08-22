#!/usr/bin/env bash
set -Eeuo pipefail
if [[ ${EUID} -ne 0 ]]; then echo "Uruchom przez sudo."; exit 1; fi
echo "KLUCZ ODTWARZANIA KOPII KLA — przechowuj poza Raspberry Pi"
echo "Data wydruku: $(date -Iseconds)"
mountpoint -q /srv/kla-vault || { echo "Najpierw odblokuj sejf: sudo kla-unlock"; exit 1; }
cat /srv/kla-vault/secrets/backup-age.key
