#!/usr/bin/env bash
set -Eeuo pipefail
if [[ ${EUID} -ne 0 || $# -ne 1 ]]; then
  echo "Użycie: sudo edziennik-kla-restore /ścieżka/database-....dump.age"
  exit 1
fi
BACKUP="$1"
[[ -f "$BACKUP" ]] || { echo "Nie znaleziono kopii."; exit 1; }
read -r -p "Przywrócenie zastąpi bieżącą bazę. Wpisz PRZYWRACAM: " CONFIRM
[[ "$CONFIRM" == "PRZYWRACAM" ]] || exit 1
/usr/local/sbin/edziennik-kla-backup
systemctl stop edziennik-kla
TEMP_DUMP="$(mktemp)"
trap 'rm -f "$TEMP_DUMP"' EXIT
age -d -i /etc/kla/backup.agekey -o "$TEMP_DUMP" "$BACKUP"
DB_URL="$(sed -n 's/^DATABASE_URL=//p' /etc/kla/edziennik.env)"
DB_URL="${DB_URL%%\?*}"
pg_restore --clean --if-exists --no-owner --dbname="$DB_URL" "$TEMP_DUMP"
sudo -u kla bash -lc "cd /opt/kla/current && set -a && source /etc/kla/edziennik.env && set +a && npm run db:migrate:deploy"
systemctl start edziennik-kla
/usr/local/sbin/edziennik-kla-health
