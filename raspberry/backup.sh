#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
BACKUP_DIR="${KLA_BACKUP_DIR:-/var/backups/kla}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RECIPIENT="$(sed -n 's/^Public key: //p' /etc/kla/backup-recipient.txt)"
DB_URL="$(sed -n 's/^DATABASE_URL=//p' /etc/kla/edziennik.env)"
DB_URL="${DB_URL%%\?*}"
install -d -m 700 "$BACKUP_DIR"
pg_dump --dbname="$DB_URL" --format=custom \
  | age -r "$RECIPIENT" -o "$BACKUP_DIR/database-$STAMP.dump.age"
tar -C /var/lib/kla -czf - private-files 2>/dev/null \
  | age -r "$RECIPIENT" -o "$BACKUP_DIR/files-$STAMP.tar.gz.age"
find "$BACKUP_DIR" -type f -mtime +30 -delete
if [[ -n "${KLA_BACKUP_MIRROR:-}" ]]; then
  rsync -a --ignore-existing "$BACKUP_DIR/" "$KLA_BACKUP_MIRROR/"
fi
