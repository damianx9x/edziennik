#!/usr/bin/env bash
set -Eeuo pipefail
if [[ ${EUID} -ne 0 ]]; then echo "Uruchom przez sudo."; exit 1; fi
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_ROOT=/opt/kla
NEW="$APP_ROOT/current.new"
rm -rf "$NEW"
install -d -o kla -g kla "$NEW"
rsync -a --delete --exclude '.git' --exclude '.next' --exclude 'node_modules' --exclude '.env' --exclude 'outputs' --exclude 'tmp' --exclude '.data' "$SOURCE_DIR/" "$NEW/"
chown -R kla:kla "$NEW"
sudo -u kla bash -lc "cd '$NEW' && set -a && source /etc/kla/edziennik.env && set +a && npm ci && npm run check && npm run build"
/usr/local/sbin/edziennik-kla-backup
sudo -u kla bash -lc "cd '$NEW' && set -a && source /etc/kla/edziennik.env && set +a && npm run db:migrate:deploy"
systemctl stop edziennik-kla
rm -rf "$APP_ROOT/previous"
mv "$APP_ROOT/current" "$APP_ROOT/previous"
mv "$NEW" "$APP_ROOT/current"
systemctl start edziennik-kla
/usr/local/sbin/edziennik-kla-health
echo "Aktualizacja zakończona. Poprzednia wersja: $APP_ROOT/previous"
