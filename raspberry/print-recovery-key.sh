#!/usr/bin/env bash
set -Eeuo pipefail
if [[ ${EUID} -ne 0 ]]; then echo "Uruchom przez sudo."; exit 1; fi
DISPLAY_CONTEXT="${1:-operator}"
case "$DISPLAY_CONTEXT" in
  operator) MARKER=/srv/kla-vault/secrets/backup-recovery-key-exported ;;
  first-run) MARKER=/srv/kla-vault/secrets/backup-recovery-key-first-run-shown ;;
  *) echo "Nieznany kontekst wyświetlenia klucza." >&2; exit 2 ;;
esac
exec 9>/run/lock/kla-recovery-key.lock
flock -n 9 || { echo "Inny odczyt klucza już trwa." >&2; exit 1; }
[[ ! -e "$MARKER" ]] || { echo "Klucz został już wcześniej wyświetlony w tym kroku. Użyj zapisanej kopii — serwer nie pokaże go ponownie." >&2; exit 2; }
echo "KLUCZ ODTWARZANIA KOPII KLA — przechowuj poza Raspberry Pi"
echo "Data wydruku: $(date -Iseconds)"
mountpoint -q /srv/kla-vault || { echo "Najpierw odblokuj sejf: sudo kla-unlock"; exit 1; }
cat /srv/kla-vault/secrets/backup-age.key
install -m 600 -o root -g root /dev/null "$MARKER"
