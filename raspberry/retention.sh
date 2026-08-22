#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

VAULT=/srv/kla-vault
CONFIG=/etc/kla/retention.env
mountpoint -q "$VAULT" || exit 0
[[ -f "$CONFIG" ]] || exit 0
source "$CONFIG"

delete_archived_files() {
  local purpose="$1" days="$2"
  [[ "$days" =~ ^[0-9]+$ ]] || { echo "Nieprawidłowa retencja: $purpose"; exit 1; }
  [[ "$days" -gt 0 ]] || return 0
  sudo -u postgres psql -d kla_edziennik -At -F $'\t' -v purpose="$purpose" -v days="$days" <<'SQL' |
SELECT id, "schoolId", "storageKey"
FROM "StoredFile"
WHERE purpose::text = :'purpose'
  AND "archivedAt" IS NOT NULL
  AND "archivedAt" < now() - (:'days' || ' days')::interval;
SQL
  while IFS=$'\t' read -r file_id school_id storage_key; do
    [[ "$storage_key" =~ ^[0-9a-f-]{36}/[0-9]{4}/[0-9]{2}/[0-9a-f-]{36}$ ]] || continue
    target="$VAULT/private-files/$storage_key"
    if [[ -f "$target" ]]; then
      rm -f "$target"
      sudo -u postgres psql -d kla_edziennik -v ON_ERROR_STOP=1 \
        -v school_id="$school_id" -v file_id="$file_id" -v purpose="$purpose" <<'SQL'
INSERT INTO "AuditLog" (id, "schoolId", action, "entityType", "entityId", metadata, "createdAt")
VALUES (gen_random_uuid(), :'school_id'::uuid, 'files.retention.deleted', 'StoredFile', :'file_id', jsonb_build_object('purpose', :'purpose'), now());
SQL
    fi
  done
}

# Wartość 0 oznacza: brak automatycznego usuwania do czasu zatwierdzenia okresu.
delete_archived_files CONTRACT "${KLA_RETENTION_CONTRACT_DAYS:-0}"
delete_archived_files IMPORT_SOURCE "${KLA_RETENTION_IMPORT_DAYS:-30}"
delete_archived_files MESSAGE_ATTACHMENT "${KLA_RETENTION_MESSAGE_ATTACHMENT_DAYS:-0}"
