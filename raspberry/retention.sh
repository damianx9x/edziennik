#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

VAULT=/srv/kla-vault
CONFIG=/etc/kla/retention.env
mountpoint -q "$VAULT" || exit 0
if [[ -f "$CONFIG" ]]; then source "$CONFIG"; fi

# Diagnostic data has a finite lifetime independently of business documents.
# Bounded batches avoid a long transaction/large locks on the Raspberry.
for days in "${KLA_RETENTION_VISITS_DAYS:-30}" "${KLA_RETENTION_AUDIT_DAYS:-180}"; do
  [[ "$days" =~ ^[0-9]+$ && "$days" -ge 1 && "$days" -le 3650 ]] || {
    echo "Retencja diagnostyki wymaga 1–3650 dni." >&2; exit 1;
  }
done
for batch in {1..20}; do
  runuser -u postgres -- psql -d kla_edziennik -v ON_ERROR_STOP=1 \
    -v visit_days="${KLA_RETENTION_VISITS_DAYS:-30}" \
    -v audit_days="${KLA_RETENTION_AUDIT_DAYS:-180}" <<'SQL'
SET lock_timeout = '3s';
SET statement_timeout = '30s';
DELETE FROM "PageVisit" WHERE id IN (
  SELECT id FROM "PageVisit" WHERE "visitedAt" < now() - (:'visit_days' || ' days')::interval
  ORDER BY "visitedAt" LIMIT 5000
);
DELETE FROM "AuditLog" WHERE id IN (
  SELECT id FROM "AuditLog" WHERE "createdAt" < now() - (:'audit_days' || ' days')::interval
  ORDER BY "createdAt" LIMIT 5000
);
DELETE FROM "RateLimit" WHERE id IN (
  SELECT id FROM "RateLimit" WHERE "lastRequest" < (extract(epoch FROM now() - interval '7 days') * 1000)::bigint
  LIMIT 5000
);
SQL
done

delete_archived_files() {
  local purpose="$1" days="$2"
  [[ "$days" =~ ^[0-9]+$ ]] || { echo "Nieprawidłowa retencja: $purpose"; exit 1; }
  [[ "$days" -gt 0 ]] || return 0
  runuser -u postgres -- psql -d kla_edziennik -At -F $'\t' -v purpose="$purpose" -v days="$days" <<'SQL' |
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
      runuser -u postgres -- psql -d kla_edziennik -v ON_ERROR_STOP=1 \
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
