#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
bash -n "$ROOT"/raspberry/*.sh

required_files=(
  raspberry/install.sh
  raspberry/install-local-demo.sh
  raspberry/install-public-demo.sh
  raspberry/local-url.sh
  raspberry/optimize-server.sh
  raspberry/START_LOCAL_DEMO_PI4B.md
  raspberry/vault-create.sh
  raspberry/vault-create-partition.sh
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
grep -q -- '--local-demo' "$ROOT/raspberry/install.sh"
grep -q -- '--public-demo' "$ROOT/raspberry/install.sh"
grep -q 'KLA_DEPLOYMENT_MODE' "$ROOT/raspberry/install.sh"
grep -q 'KLA_ALLOW_DEMO_RESET' "$ROOT/raspberry/install.sh"
grep -q '192.168.0.0/16' "$ROOT/raspberry/install.sh"
grep -q '__LISTEN__' "$ROOT/raspberry/nginx/kla.conf"
grep -q '__FORWARDED_PROTO__' "$ROOT/raspberry/nginx/kla.conf"
LOCAL_NGINX="$(sed -e 's|__SERVER_NAME__|_|g' -e 's|__LISTEN__|0.0.0.0:8080|g' -e 's|__FORWARDED_PROTO__|http|g' "$ROOT/raspberry/nginx/kla.conf")"
PRODUCTION_NGINX="$(sed -e 's|__SERVER_NAME__|_|g' -e 's|__LISTEN__|127.0.0.1:8080|g' -e 's|__FORWARDED_PROTO__|https|g' "$ROOT/raspberry/nginx/kla.conf")"
grep -q 'listen 0.0.0.0:8080 default_server;' <<<"$LOCAL_NGINX"
grep -q 'X-Forwarded-Proto http' <<<"$LOCAL_NGINX"
grep -q 'listen 127.0.0.1:8080 default_server;' <<<"$PRODUCTION_NGINX"
grep -Fq '127.0.0.1:3100' "$ROOT/raspberry/install.sh"
grep -q 'X-Forwarded-Proto https' <<<"$PRODUCTION_NGINX"
! grep -q '__' <<<"$LOCAL_NGINX"
! grep -q '__' <<<"$PRODUCTION_NGINX"
grep -q 'RequiresMountsFor=/srv/kla-vault' "$ROOT/raspberry/systemd/edziennik-kla.service"
grep -q 'edziennik-kla-restore --test' "$ROOT/raspberry/backup.sh"
grep -q 'StrictHostKeyChecking=yes' "$ROOT/raspberry/backup.sh"
grep -q 'SZYFRUJ \$PARTITION' "$ROOT/raspberry/vault-create-partition.sh"
grep -q 'KLA_DATA' "$ROOT/raspberry/vault-create-partition.sh"
grep -q 'shared_buffers = 512MB' "$ROOT/raspberry/optimize-server.sh"
grep -q 'PermitRootLogin no' "$ROOT/raspberry/optimize-server.sh"
grep -q 'MemoryMax=2700M' "$ROOT/raspberry/systemd/edziennik-kla.service"
grep -q 'noatime,nodiratime' "$ROOT/raspberry/unlock.sh"
grep -q 'NODE_OPTIONS=--max-old-space-size=2048' "$ROOT/raspberry/install.sh"
grep -q 'npm run db:generate' "$ROOT/raspberry/install.sh"
grep -q 'npm ci --include=dev' "$ROOT/raspberry/install.sh"
grep -q 'npm ci --include=dev' "$ROOT/raspberry/update.sh"
grep -q 'chmod 0644.*90-kla.conf' "$ROOT/raspberry/optimize-server.sh"

echo "Pakiet Raspberry: składnia i zabezpieczenia są kompletne."
