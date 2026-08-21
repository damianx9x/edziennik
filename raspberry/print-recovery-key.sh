#!/usr/bin/env bash
set -Eeuo pipefail
if [[ ${EUID} -ne 0 ]]; then echo "Uruchom przez sudo."; exit 1; fi
echo "KLUCZ ODTWARZANIA KOPII KLA — przechowuj poza Raspberry Pi"
echo "Data wydruku: $(date -Iseconds)"
cat /etc/kla/backup.agekey
