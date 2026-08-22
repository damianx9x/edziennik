#!/usr/bin/env bash
set -Eeuo pipefail

VAULT=/srv/kla-vault
mountpoint -q "$VAULT" || exit 0
LATEST="$(find "$VAULT/backups" -maxdepth 1 -type f -name 'kla-*.tar.age' -print | sort | tail -n1)"
[[ -n "$LATEST" ]] || { echo "Brak kopii do testu odtworzenia."; exit 1; }
/usr/local/sbin/edziennik-kla-restore --test "$LATEST"
date -Iseconds > "$VAULT/restore-tests/latest-ok"
printf '%s\n' "$LATEST" > "$VAULT/restore-tests/latest-backup"
