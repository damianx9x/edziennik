#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
bash -n "$ROOT"/raspberry/*.sh

required_files=(
  raspberry/install.sh
  raspberry/install-local-demo.sh
  raspberry/install-public-demo.sh
  raspberry/local-url.sh
  raspberry/control.sh
  raspberry/mac-control/kla-server-control.sh
  raspberry/mac-control/KLA-Serwer.applescript
  raspberry/optimize-server.sh
  raspberry/benchmark-readonly.sh
  raspberry/runtime-guards.sh
  raspberry/startup-audit.sh
  docs/OPERACJE_RASPBERRY.md
  raspberry/vault-create.sh
  raspberry/vault-create-partition.sh
  raspberry/unlock.sh
  raspberry/backup.sh
  raspberry/safe-archive.py
  raspberry/test-safe-archive.py
  raspberry/web-control-daemon.py
  raspberry/web-control.sh
  raspberry/restore.sh
  raspberry/retention.sh
  raspberry/configure-sftp-backup.sh
  raspberry/enable-auto-unlock.sh
  raspberry/systemd/edziennik-kla.service
  raspberry/systemd/kla-web-control.service
  raspberry/systemd/edziennik-kla-backup.timer
  raspberry/systemd/edziennik-kla-restore-test.timer
  raspberry/systemd/edziennik-kla-email-queue.service
  raspberry/systemd/edziennik-kla-email-queue.timer
  deployment/release-signing.pub
  raspberry/README.md
)
for file in "${required_files[@]}"; do
  [[ -s "$ROOT/$file" ]] || { echo "Brak wymaganego pliku: $file"; exit 1; }
done

for executable in \
  raspberry/install.sh \
  raspberry/optimize-server.sh \
  raspberry/runtime-guards.sh \
  raspberry/vault-create-partition.sh; do
  [[ -x "$ROOT/$executable" ]] || {
    echo "Skrypt instalacyjny nie ma prawa wykonania: $executable"
    exit 1
  }
done

python3 -m py_compile \
  "$ROOT/raspberry/safe-archive.py" \
  "$ROOT/raspberry/test-safe-archive.py" \
  "$ROOT/raspberry/web-control-daemon.py"
python3 "$ROOT/raspberry/test-safe-archive.py"

grep -q 'cryptsetup luksFormat --type luks2' "$ROOT/raspberry/vault-create.sh"
grep -q 'KLA_MALWARE_SCAN_MODE=required' "$ROOT/raspberry/install.sh"
grep -q -- '--local-demo' "$ROOT/raspberry/install.sh"
grep -q -- '--public-demo' "$ROOT/raspberry/install.sh"
grep -q 'KLA_DEPLOYMENT_MODE' "$ROOT/raspberry/install.sh"
grep -q 'KLA_ALLOW_DEMO_RESET' "$ROOT/raspberry/install.sh"
grep -q 'KLA_BOOTSTRAP_TOKEN_HASH' "$ROOT/raspberry/install.sh"
grep -q 'RESEND_API_KEY' "$ROOT/raspberry/install.sh"
grep -q 'Otwórz: \$APP_URL/pierwsze-uruchomienie' "$ROOT/raspberry/install.sh"
grep -q '192.168.0.0/16' "$ROOT/raspberry/install.sh"
grep -q 'avahi-daemon' "$ROOT/raspberry/install.sh"
grep -q '__LISTEN__' "$ROOT/raspberry/nginx/kla.conf"
grep -q '__FORWARDED_PROTO__' "$ROOT/raspberry/nginx/kla.conf"
grep -q 'limit_req_zone.*kla_auth' "$ROOT/raspberry/nginx/kla.conf"
grep -q 'kla_sensitive_auth_key' "$ROOT/raspberry/nginx/kla.conf"
grep -q 'zone=kla_health' "$ROOT/raspberry/nginx/kla.conf"
grep -q 'log_format kla_privacy' "$ROOT/raspberry/nginx/kla.conf"
grep -q 'uri=\$uri' "$ROOT/raspberry/nginx/kla.conf"
! grep -q '\$request_uri' "$ROOT/raspberry/nginx/kla.conf"
[[ "$(grep -c 'add_header X-Content-Type-Options' "$ROOT/raspberry/nginx/kla.conf")" -ge 2 ]]
grep -q 'loopback-read-only' "$ROOT/raspberry/benchmark-readonly.sh"
grep -q 'limit_conn.*kla_connections' "$ROOT/raspberry/nginx/kla.conf"
grep -q 'location \^~ /_next/static/' "$ROOT/raspberry/nginx/kla.conf"
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
grep -q 'runtime-guards.sh' "$ROOT/raspberry/optimize-server.sh"
grep -q 'Storage=persistent' "$ROOT/raspberry/runtime-guards.sh"
grep -q 'RuntimeWatchdogSec=30s' "$ROOT/raspberry/runtime-guards.sh"
grep -q 'Restart=always' "$ROOT/raspberry/runtime-guards.sh"
grep -q 'automatyczne odblokowanie nie jest kompletne' "$ROOT/raspberry/startup-audit.sh"
grep -q 'backup-download-prepare' "$ROOT/raspberry/control.sh"
grep -q 'verified-backup-download' "$ROOT/raspberry/mac-control/kla-server-control.sh"
grep -q 'Audyt startu po zaniku prądu' "$ROOT/raspberry/mac-control/KLA-Serwer.applescript"
grep -q 'PermitRootLogin no' "$ROOT/raspberry/optimize-server.sh"
grep -q 'MemoryMax=1850M' "$ROOT/raspberry/systemd/edziennik-kla.service"
grep -q 'standalone/.next/cache' "$ROOT/raspberry/systemd/edziennik-kla.service"
grep -q 'noatime,nodiratime' "$ROOT/raspberry/unlock.sh"
grep -q 'NODE_OPTIONS=--max-old-space-size=1408' "$ROOT/raspberry/install.sh"
grep -q 'npm run db:generate' "$ROOT/raspberry/install.sh"
grep -q 'npm run db:generate' "$ROOT/raspberry/update.sh"
grep -q 'systemctl daemon-reload' "$ROOT/raspberry/update.sh"
grep -q 'systemctl reload nginx' "$ROOT/raspberry/update.sh"
grep -q 'npm ci --include=dev' "$ROOT/raspberry/install.sh"
grep -q 'runuser -u kla -- bash -c.*npm ci --include=dev' "$ROOT/raspberry/update.sh"
grep -q 'chmod 0644.*90-kla.conf' "$ROOT/raspberry/optimize-server.sh"
grep -q 'NOPASSWD: /usr/local/sbin/kla-control' "$ROOT/raspberry/install.sh"
grep -q 'PasswordAuthentication no' "$ROOT/raspberry/optimize-server.sh"
grep -q 'KLA_RELEASE_MANIFEST.sha256.sig' "$ROOT/raspberry/update.sh"
grep -q 'safe-archive.py.*release' "$ROOT/raspberry/update.sh"
grep -q -- '--test-restore' "$ROOT/raspberry/update.sh"
grep -q 'release-signing.pub' "$ROOT/raspberry/install.sh"
grep -q 'kla-enable-auto-unlock' "$ROOT/raspberry/update.sh"
grep -q 'kla-web-control-daemon' "$ROOT/raspberry/update.sh"
grep -q 'kla-web-control' "$ROOT/raspberry/systemd/kla-web-control.service"
grep -q 'ALLOWED_ACTIONS' "$ROOT/raspberry/web-control-daemon.py"
! grep -q 'kla-web-control \*' "$ROOT/raspberry/install.sh"
! grep -q '/usr/bin/sudo.*kla-web-control' "$ROOT/modules/system-owner/server-control.ts"
grep -q 'edziennik-kla-email-queue.timer' "$ROOT/raspberry/update.sh"
grep -q 'Klucz kernela nie może zostać odczytany przez cryptsetup' "$ROOT/raspberry/enable-auto-unlock.sh"
grep -q 'runuser -u kla --preserve-environment' "$ROOT/raspberry/update.sh"
grep -q 'chmod 711 /srv/kla-vault' "$ROOT/raspberry/update.sh"
grep -q 'refresh-operations' "$ROOT/raspberry/control.sh"
grep -q 'continuity/edziennik.env' "$ROOT/raspberry/backup.sh"
grep -q 'import-prepare)' "$ROOT/raspberry/web-control.sh"
grep -q 'edziennik-kla-restore --test' "$ROOT/raspberry/web-control.sh"
grep -q 'import-restore)' "$ROOT/raspberry/web-control.sh"
grep -q -- '--confirmed' "$ROOT/raspberry/restore.sh"
grep -q 'install -d -m 700 -o kla -g kla.*imports' "$ROOT/raspberry/update.sh"

echo "Pakiet Raspberry: składnia i zabezpieczenia są kompletne."
