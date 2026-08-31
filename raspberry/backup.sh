#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

if [[ "${KLA_MAINTENANCE_LOCK_HELD:-0}" != "1" ]]; then
  exec 9>/run/lock/kla-maintenance.lock
  flock -n 9 || { echo "Trwa inna operacja serwisowa. Kopia nie została rozpoczęta."; exit 1; }
fi

VAULT=/srv/kla-vault
BACKUP_DIR="$VAULT/backups"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT
mountpoint -q "$VAULT" || { echo "Sejf jest zamknięty. Kopia nie została wykonana."; exit 1; }

RECIPIENT="$(sed -n 's/^Public key: //p' "$VAULT/secrets/backup-recipient.txt")"
[[ -n "$RECIPIENT" ]] || { echo "Brak klucza szyfrowania kopii."; exit 1; }
install -d -m 700 "$BACKUP_DIR"
USB_TEST_BACKUP=""
BACKUP_RETENTION_DAYS=30
if [[ -f /etc/kla/backup-policy.env ]]; then
  source /etc/kla/backup-policy.env
fi
[[ "$BACKUP_RETENTION_DAYS" =~ ^(14|30|90)$ ]] || { echo "Nieprawidłowy okres przechowywania backupu." >&2; exit 1; }

sudo -u postgres pg_dump --format=custom --dbname=kla_edziennik > "$TEMP_DIR/database.dump"
tar -C "$VAULT" -czf "$TEMP_DIR/private-files.tar.gz" private-files
install -d -m 700 "$TEMP_DIR/continuity"
install -m 600 "$VAULT/secrets/edziennik.env" "$TEMP_DIR/continuity/edziennik.env"
if [[ -f /etc/kla/vault.conf ]]; then install -m 600 /etc/kla/vault.conf "$TEMP_DIR/continuity/vault.conf"; fi
if [[ -f /opt/kla/current/KLA_RELEASE_COMMIT ]]; then
  APP_COMMIT="$(tr -d '\r\n' < /opt/kla/current/KLA_RELEASE_COMMIT)"
else
  APP_COMMIT="$(git -C /opt/kla/current rev-parse HEAD 2>/dev/null || echo unknown-release)"
fi
cat > "$TEMP_DIR/manifest.txt" <<EOF
created_at=$STAMP
app_commit=$APP_COMMIT
database=kla_edziennik
files=private-files
continuity=encrypted-application-secrets-without-backup-private-key
EOF
tar -C "$TEMP_DIR" -cf - database.dump private-files.tar.gz continuity manifest.txt \
  | age -r "$RECIPIENT" -o "$BACKUP_DIR/kla-$STAMP.tar.age"
(
  cd "$BACKUP_DIR"
  sha256sum "kla-$STAMP.tar.age" > "kla-$STAMP.tar.age.sha256"
)

find "$BACKUP_DIR" -maxdepth 1 -type f -mtime +"$BACKUP_RETENTION_DAYS" -delete

if [[ -f /etc/kla/backup-usb.env ]]; then
  source /etc/kla/backup-usb.env
  if [[ -n "${KLA_USB_BACKUP_PATH:-}" ]] && mountpoint -q -- "$KLA_USB_BACKUP_PATH"; then
    USB_BACKUP_DIR="$KLA_USB_BACKUP_PATH/kla-encrypted-backups"
    install -d -m 700 "$USB_BACKUP_DIR"
    install -m 600 "$BACKUP_DIR/kla-$STAMP.tar.age" "$BACKUP_DIR/kla-$STAMP.tar.age.sha256" "$USB_BACKUP_DIR/"
    USB_TEST_BACKUP="$USB_BACKUP_DIR/kla-$STAMP.tar.age"
    find "$USB_BACKUP_DIR" -maxdepth 1 -type f -mtime +"$BACKUP_RETENTION_DAYS" -delete
  else
    echo "Skonfigurowany dysk USB nie jest zamontowany. Kopia w sejfie została zachowana, ale kopia USB nie powstała." >&2
  fi
fi

if [[ -f /etc/kla/backup-sftp.env ]]; then
  source /etc/kla/backup-sftp.env
  KEY="$VAULT/secrets/sftp-backup-key"
  KNOWN_HOSTS="$VAULT/secrets/sftp-known-hosts"
  for FILE in "$BACKUP_DIR/kla-$STAMP.tar.age" "$BACKUP_DIR/kla-$STAMP.tar.age.sha256"; do
    printf 'put %s %s/%s\n' "$FILE" "$KLA_SFTP_PATH" "$(basename "$FILE")" \
      | sftp -q -b - -P "$KLA_SFTP_PORT" -i "$KEY" \
        -oBatchMode=yes -oIdentitiesOnly=yes -oStrictHostKeyChecking=yes \
        -oUserKnownHostsFile="$KNOWN_HOSTS" "$KLA_SFTP_USER@$KLA_SFTP_HOST"
  done
fi

if [[ "${1:-}" == "--test-restore" ]]; then
  TEST_BACKUP="$BACKUP_DIR/kla-$STAMP.tar.age"
  if [[ -n "$USB_TEST_BACKUP" ]]; then
    TEST_BACKUP="$USB_TEST_BACKUP"
  fi
  if [[ -f /etc/kla/backup-sftp.env ]]; then
    REMOTE_TEST_DIR="$TEMP_DIR/sftp-download"
    install -d -m 700 "$REMOTE_TEST_DIR"
    for NAME in "kla-$STAMP.tar.age" "kla-$STAMP.tar.age.sha256"; do
      printf 'get %s/%s %s/%s\n' "$KLA_SFTP_PATH" "$NAME" "$REMOTE_TEST_DIR" "$NAME" \
        | sftp -q -b - -P "$KLA_SFTP_PORT" -i "$KEY" \
          -oBatchMode=yes -oIdentitiesOnly=yes -oStrictHostKeyChecking=yes \
          -oUserKnownHostsFile="$KNOWN_HOSTS" "$KLA_SFTP_USER@$KLA_SFTP_HOST"
    done
    TEST_BACKUP="$REMOTE_TEST_DIR/kla-$STAMP.tar.age"
  fi
  KLA_MAINTENANCE_LOCK_HELD=1 /usr/local/sbin/edziennik-kla-restore --test "$TEST_BACKUP"
fi

echo "Kopia gotowa: $BACKUP_DIR/kla-$STAMP.tar.age"
