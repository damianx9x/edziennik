#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

VAULT=/srv/kla-vault
MODE="${1:-}"
if [[ "$MODE" == "--test" || "$MODE" == "--confirmed" ]]; then BACKUP="${2:-}"; else BACKUP="$MODE"; fi
if [[ ${EUID} -ne 0 || ! -f "$BACKUP" ]]; then
  echo "Test: sudo edziennik-kla-restore --test /srv/kla-vault/backups/kla-....tar.age"
  echo "Odtworzenie: sudo edziennik-kla-restore /srv/kla-vault/backups/kla-....tar.age"
  exit 1
fi
mountpoint -q "$VAULT" || { echo "Najpierw: sudo kla-unlock"; exit 1; }
if [[ "${KLA_MAINTENANCE_LOCK_HELD:-0}" != "1" ]]; then
  exec 9>/run/lock/kla-maintenance.lock
  flock -n 9 || { echo "Trwa inna operacja serwisowa. Odtwarzanie nie zostało rozpoczęte."; exit 1; }
fi
(
  cd "$(dirname "$BACKUP")"
  sha256sum -c "$(basename "$BACKUP").sha256"
)
TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT
age -d -i "$VAULT/secrets/backup-age.key" "$BACKUP" \
  | /usr/local/sbin/kla-safe-archive outer "$TEMP_DIR"
# Katalog tymczasowy pozostaje prywatny dla roota. PostgreSQL dostaje tylko
# prawo przejścia przez katalog i odczytu samego zrzutu bazy.
chgrp postgres "$TEMP_DIR/database.dump"
chgrp postgres "$TEMP_DIR"
chmod 710 "$TEMP_DIR"
chmod 640 "$TEMP_DIR/database.dump"
pg_restore --list "$TEMP_DIR/database.dump" >/dev/null
VALIDATION_FILES="$TEMP_DIR/private-files.validation"
/usr/local/sbin/kla-safe-archive private "$TEMP_DIR/private-files.tar.gz" "$VALIDATION_FILES"
clamdscan --fdpass --no-summary "$VALIDATION_FILES" >/dev/null \
  || { echo "Skan antywirusowy zatrzymał odtwarzanie kopii."; exit 1; }

if [[ "$MODE" == "--test" ]]; then
  TEST_DB="kla_restore_test_$(date +%s)"
  trap 'runuser -u postgres -- dropdb --if-exists "$TEST_DB" >/dev/null 2>&1 || true; rm -rf "$TEMP_DIR"' EXIT
  runuser -u postgres -- createdb "$TEST_DB"
  runuser -u postgres -- pg_restore --no-owner --dbname="$TEST_DB" "$TEMP_DIR/database.dump"
  runuser -u postgres -- psql --dbname="$TEST_DB" --tuples-only --command='SELECT count(*) FROM "School";' >/dev/null
  runuser -u postgres -- dropdb "$TEST_DB"
  # Every successful restore test updates the same status, including tests
  # performed by the updater or the web panel, not only the scheduled timer.
  install -d -m 700 "$VAULT/restore-tests"
  date -Iseconds > "$VAULT/restore-tests/latest-ok.tmp"
  printf '%s\n' "$(basename "$BACKUP")" > "$VAULT/restore-tests/latest-backup.tmp"
  mv "$VAULT/restore-tests/latest-backup.tmp" "$VAULT/restore-tests/latest-backup"
  mv "$VAULT/restore-tests/latest-ok.tmp" "$VAULT/restore-tests/latest-ok"
  echo "TEST ODTWORZENIA OK: baza i dokumenty są czytelne."
  exit 0
fi

if [[ "$MODE" != "--confirmed" ]]; then
  read -r -p "To zastąpi bazę i dokumenty. Wpisz ODTWARZAM KLA: " CONFIRM
  [[ "$CONFIRM" == "ODTWARZAM KLA" ]] || { echo "Anulowano."; exit 1; }
fi
KLA_MAINTENANCE_LOCK_HELD=1 /usr/local/sbin/edziennik-kla-backup
STAMP="$(date +%s)"
CANDIDATE_DB="kla_restore_candidate_$STAMP"
PREVIOUS_DB="kla_before_restore_$STAMP"
RESTORE_FILES="$VAULT/private-files.restore-$STAMP"
PREVIOUS_FILES="$VAULT/private-files.before-restore-$STAMP"
switched=0

rollback_restore() {
  local exit_code=$?
  if [[ "$switched" -eq 1 ]]; then
    echo "Odtworzenie nie przeszło kontroli. Przywracam poprzedni stan..."
    systemctl stop edziennik-kla >/dev/null 2>&1 || true
    runuser -u postgres -- psql --dbname=postgres -v ON_ERROR_STOP=1 <<SQL || true
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname IN ('kla_edziennik', '$PREVIOUS_DB') AND pid <> pg_backend_pid();
ALTER DATABASE kla_edziennik RENAME TO ${CANDIDATE_DB}_failed;
ALTER DATABASE $PREVIOUS_DB RENAME TO kla_edziennik;
SQL
    if [[ -d "$PREVIOUS_FILES" ]]; then
      rm -rf -- "$VAULT/private-files.failed-$STAMP"
      [[ -d "$VAULT/private-files" ]] && mv "$VAULT/private-files" "$VAULT/private-files.failed-$STAMP"
      mv "$PREVIOUS_FILES" "$VAULT/private-files"
    fi
    systemctl start edziennik-kla >/dev/null 2>&1 || true
  fi
  runuser -u postgres -- dropdb --if-exists "$CANDIDATE_DB" >/dev/null 2>&1 || true
  rm -rf -- "$RESTORE_FILES"
  exit "$exit_code"
}
trap rollback_restore ERR INT TERM

# Najpierw pełne odtworzenie do odizolowanej bazy i osobnego katalogu.
runuser -u postgres -- createdb --owner=kla_app "$CANDIDATE_DB"
runuser -u postgres -- pg_restore --no-owner --role=kla_app --dbname="$CANDIDATE_DB" "$TEMP_DIR/database.dump"
runuser -u postgres -- psql --dbname="$CANDIDATE_DB" --tuples-only --command='SELECT count(*) FROM "School";' >/dev/null
install -d -m 700 -o kla -g kla "$RESTORE_FILES"
/usr/local/sbin/kla-safe-archive private "$TEMP_DIR/private-files.tar.gz" "$RESTORE_FILES"
chown -R kla:kla "$RESTORE_FILES"

systemctl stop edziennik-kla
runuser -u postgres -- psql --dbname=postgres -v ON_ERROR_STOP=1 <<SQL
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'kla_edziennik' AND pid <> pg_backend_pid();
ALTER DATABASE kla_edziennik RENAME TO $PREVIOUS_DB;
ALTER DATABASE $CANDIDATE_DB RENAME TO kla_edziennik;
SQL
mv "$VAULT/private-files" "$PREVIOUS_FILES"
mv "$RESTORE_FILES" "$VAULT/private-files"
switched=1

runuser -u kla -- bash -lc "cd /opt/kla/current && set -a && source /etc/kla/edziennik.env && set +a && npm run db:migrate:deploy"
systemctl start edziennik-kla
KLA_MAINTENANCE_LOCK_HELD=1 /usr/local/sbin/edziennik-kla-health
switched=0
trap - ERR INT TERM
echo "Odtworzenie zakończone. Poprzednia baza i dokumenty pozostają tymczasowo w szyfrowanym sejfie."
