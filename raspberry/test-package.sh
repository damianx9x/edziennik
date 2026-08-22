#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
bash -n "$ROOT"/raspberry/*.sh

required_files=(
  raspberry/install.sh
  raspberry/vault-create.sh
  raspberry/unlock.sh
  raspberry/backup.sh
  raspberry/restore.sh
  raspberry/retention.sh
  raspberry/configure-sftp-backup.sh
  raspberry/systemd/edziennik-kla.service
  raspberry/systemd/edziennik-kla-backup.timer
  raspberry/systemd/edziennik-kla-restore-test.timer
  raspberry/README.md
)
for file in "${required_files[@]}"; do
  [[ -s "$ROOT/$file" ]] || { echo "Brak wymaganego pliku: $file"; exit 1; }
done

grep -q 'cryptsetup luksFormat --type luks2' "$ROOT/raspberry/vault-create.sh"
grep -q 'KLA_MALWARE_SCAN_MODE=required' "$ROOT/raspberry/install.sh"
grep -q 'RequiresMountsFor=/srv/kla-vault' "$ROOT/raspberry/systemd/edziennik-kla.service"
grep -q 'edziennik-kla-restore --test' "$ROOT/raspberry/backup.sh"
grep -q 'StrictHostKeyChecking=yes' "$ROOT/raspberry/backup.sh"

echo "Pakiet Raspberry: składnia i zabezpieczenia są kompletne."
