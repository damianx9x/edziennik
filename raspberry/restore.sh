#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

VAULT=/srv/kla-vault
MODE="${1:-}"
if [[ "$MODE" == "--test" ]]; then BACKUP="${2:-}"; else BACKUP="$MODE"; fi
if [[ ${EUID} -ne 0 || ! -f "$BACKUP" ]]; then
  echo "Test: sudo edziennik-kla-restore --test /srv/kla-vault/backups/kla-....tar.age"
  echo "Odtworzenie: sudo edziennik-kla-restore /srv/kla-vault/backups/kla-....tar.age"
  exit 1
fi
mountpoint -q "$VAULT" || { echo "Najpierw: sudo kla-unlock"; exit 1; }
(
  cd "$(dirname "$BACKUP")"
  sha256sum -c "$(basename "$BACKUP").sha256"
)
TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT
age -d -i "$VAULT/secrets/backup-age.key" "$BACKUP" | tar -C "$TEMP_DIR" -xf -
pg_restore --list "$TEMP_DIR/database.dump" >/dev/null
tar -tzf "$TEMP_DIR/private-files.tar.gz" >/dev/null

if [[ "$MODE" == "--test" ]]; then
  TEST_DB="kla_restore_test_$(date +%s)"
  trap 'sudo -u postgres dropdb --if-exists "$TEST_DB" >/dev/null 2>&1 || true; rm -rf "$TEMP_DIR"' EXIT
  sudo -u postgres createdb "$TEST_DB"
  sudo -u postgres pg_restore --no-owner --dbname="$TEST_DB" "$TEMP_DIR/database.dump"
  sudo -u postgres psql --dbname="$TEST_DB" --tuples-only --command='SELECT count(*) FROM "School";' >/dev/null
  sudo -u postgres dropdb "$TEST_DB"
  echo "TEST ODTWORZENIA OK: baza i dokumenty są czytelne."
  exit 0
fi

read -r -p "To zastąpi bazę i dokumenty. Wpisz ODTWARZAM KLA: " CONFIRM
[[ "$CONFIRM" == "ODTWARZAM KLA" ]] || { echo "Anulowano."; exit 1; }
/usr/local/sbin/edziennik-kla-backup
systemctl stop edziennik-kla
sudo -u postgres dropdb --if-exists kla_edziennik
sudo -u postgres createdb --owner=kla_app kla_edziennik
sudo -u postgres pg_restore --no-owner --dbname=kla_edziennik "$TEMP_DIR/database.dump"
install -d -m 700 -o kla -g kla "$VAULT/private-files.restore"
tar -C "$VAULT/private-files.restore" --strip-components=1 -xzf "$TEMP_DIR/private-files.tar.gz"
mv "$VAULT/private-files" "$VAULT/private-files.before-restore-$(( $(date +%s) ))"
mv "$VAULT/private-files.restore" "$VAULT/private-files"
chown -R kla:kla "$VAULT/private-files"
sudo -u kla bash -lc "cd /opt/kla/current && set -a && source /etc/kla/edziennik.env && set +a && npm run db:migrate:deploy"
systemctl start edziennik-kla
/usr/local/sbin/edziennik-kla-health
echo "Odtworzenie zakończone. Poprzednie dokumenty zachowano tymczasowo w sejfie."
