#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

if [[ ${EUID} -ne 0 ]]; then echo "Uruchom: sudo ./raspberry/install.sh"; exit 1; fi
[[ "$(dpkg --print-architecture)" == "arm64" ]] || { echo "Wymagany jest Raspberry Pi OS 64-bit (arm64)."; exit 1; }
grep -qi 'Raspberry Pi' /proc/device-tree/model 2>/dev/null || { echo "Ten instalator jest przeznaczony dla Raspberry Pi."; exit 1; }

APP_ROOT=/opt/kla
APP_DIR="$APP_ROOT/current"
ENV_DIR=/etc/kla
VAULT=/srv/kla-vault
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Dostępne zewnętrzne dyski:"
lsblk -dpo NAME,SIZE,MODEL,TRAN,TYPE | awk '$NF == "disk" {print}'
read -r -p "Podaj dysk SSD na zaszyfrowany sejf (np. /dev/sda): " VAULT_DEVICE
read -r -p "Publiczny adres HTTPS aplikacji (np. https://edziennik.example.pl): " APP_URL
[[ "$APP_URL" =~ ^https://[A-Za-z0-9.-]+$ ]] || { echo "Wymagany jest publiczny adres HTTPS bez ścieżki."; exit 1; }
read -r -s -p "Token istniejącego tunelu Cloudflare dla tego adresu: " TUNNEL_TOKEN
echo
[[ "$TUNNEL_TOKEN" == eyJ* ]] || { echo "Nie rozpoznano tokenu tunelu Cloudflare."; exit 1; }
read -r -p "Wgrać wyłącznie fikcyjne dane testowe? [t/N]: " INSTALL_DEMO

install -d -m 0755 /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg > /usr/share/keyrings/cloudflare-main.gpg
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" > /etc/apt/sources.list.d/cloudflared.list
apt-get update
apt-get full-upgrade -y
apt-get install -y --no-install-recommends age ca-certificates clamav clamav-daemon cloudflared cryptsetup curl fail2ban gnupg nginx openssh-client parted postgresql postgresql-client rsync unattended-upgrades ufw
if ! command -v node >/dev/null || [[ "$(node -p 'Number(process.versions.node.split(".")[0])')" -lt 22 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

systemctl stop edziennik-kla postgresql 2>/dev/null || true
"$SOURCE_DIR/raspberry/vault-create.sh" "$VAULT_DEVICE"

id -u kla >/dev/null 2>&1 || useradd --system --create-home --home-dir /var/lib/kla --shell /usr/sbin/nologin kla
usermod -a -G clamav kla
install -d -o kla -g kla "$APP_ROOT"
install -d -m 750 -o root -g kla "$ENV_DIR"
chown kla:kla "$VAULT/private-files"
chmod 700 "$VAULT/private-files"
chown root:kla "$VAULT/secrets"
chmod 750 "$VAULT/secrets"

PG_VERSION="$(pg_lsclusters --no-header | awk 'NR == 1 {print $1}')"
[[ -n "$PG_VERSION" ]] || { echo "Nie znaleziono PostgreSQL."; exit 1; }
systemctl stop postgresql
PG_SOURCE="/var/lib/postgresql/$PG_VERSION/main"
PG_TARGET="$VAULT/postgresql/$PG_VERSION/main"
install -d -m 700 -o postgres -g postgres "$PG_TARGET"
rsync -aHAX "$PG_SOURCE/" "$PG_TARGET/"
chown -R postgres:postgres "$VAULT/postgresql"
chmod 700 "$PG_TARGET"
sed -i "s|^[#[:space:]]*data_directory[[:space:]]*=.*|data_directory = '$PG_TARGET'|" "/etc/postgresql/$PG_VERSION/main/postgresql.conf"
install -d /etc/systemd/system/postgresql.service.d
printf '%s\n' '[Unit]' "RequiresMountsFor=$VAULT" "ConditionPathIsMountPoint=$VAULT" > /etc/systemd/system/postgresql.service.d/kla-vault.conf
install -d "/etc/systemd/system/postgresql@$PG_VERSION-main.service.d"
printf '%s\n' '[Unit]' "RequiresMountsFor=$VAULT" "ConditionPathIsMountPoint=$VAULT" > "/etc/systemd/system/postgresql@$PG_VERSION-main.service.d/kla-vault.conf"
systemctl daemon-reload
systemctl start postgresql

DB_PASSWORD="$(openssl rand -hex 24)"
AUTH_SECRET="$(openssl rand -base64 48 | tr -d '\n')"
sudo -u postgres psql -v ON_ERROR_STOP=1 --set=db_password="$DB_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE kla_app LOGIN PASSWORD %L', :'db_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'kla_app')\gexec
SELECT format('ALTER ROLE kla_app PASSWORD %L', :'db_password')
WHERE EXISTS (SELECT FROM pg_roles WHERE rolname = 'kla_app')\gexec
SELECT 'CREATE DATABASE kla_edziennik OWNER kla_app'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'kla_edziennik')\gexec
SQL

rm -rf "$APP_DIR.new"
install -d -o kla -g kla "$APP_DIR.new"
rsync -a --delete --exclude '.git' --exclude '.next' --exclude 'node_modules' --exclude '.env' --exclude 'outputs' --exclude 'tmp' --exclude '.data' "$SOURCE_DIR/" "$APP_DIR.new/"
chown -R kla:kla "$APP_DIR.new"

cat > "$VAULT/secrets/edziennik.env" <<ENV
NODE_ENV=production
PORT=3000
HOSTNAME=127.0.0.1
DATABASE_URL=postgresql://kla_app:${DB_PASSWORD}@127.0.0.1:5432/kla_edziennik?schema=public
KLA_DATABASE_POOL_MAX=5
BETTER_AUTH_SECRET=${AUTH_SECRET}
BETTER_AUTH_URL=${APP_URL}
NEXT_PUBLIC_APP_URL=${APP_URL}
NEXT_PUBLIC_APP_RELEASE=raspberry
KLA_REQUIRE_DIRECTOR_MFA=1
KLA_ALLOW_INSECURE_DEMO_CREDENTIALS=0
KLA_PUBLIC_SCHOOL_SLUG=kings-language-academy-demo
KLA_PRIVATE_FILES_DIR=$VAULT/private-files
FILE_STORAGE_PROVIDER=local
KLA_MALWARE_SCAN_MODE=required
KLA_CLAMAV_SOCKET=/run/clamav/clamd.ctl
LOG_LEVEL=info
MESSAGE_REFRESH_MS=8000
SMS_PROVIDER=disabled
ENV
chown root:kla "$VAULT/secrets/edziennik.env"
chmod 640 "$VAULT/secrets/edziennik.env"
ln -sfn "$VAULT/secrets/edziennik.env" "$ENV_DIR/edziennik.env"
cat > "$ENV_DIR/retention.env" <<'ENV'
# 0 = nie usuwaj automatycznie, dopóki prawnik/IOD nie zatwierdzi okresu.
KLA_RETENTION_CONTRACT_DAYS=0
KLA_RETENTION_IMPORT_DAYS=30
KLA_RETENTION_MESSAGE_ATTACHMENT_DAYS=0
ENV
chmod 600 "$ENV_DIR/retention.env"

sed -i 's/^#\?LocalSocket .*/LocalSocket \/run\/clamav\/clamd.ctl/' /etc/clamav/clamd.conf
systemctl enable --now clamav-freshclam clamav-daemon
for _ in {1..30}; do [[ -S /run/clamav/clamd.ctl ]] && break; sleep 2; done
[[ -S /run/clamav/clamd.ctl ]] || { echo "ClamAV nie uruchomił skanera. Instalacja zatrzymana."; exit 1; }

sudo -u kla bash -lc "cd '$APP_DIR.new' && set -a && source '$ENV_DIR/edziennik.env' && set +a && npm ci && npm run check && npm run db:migrate:deploy && npm run build"
DEMO_PASSWORD=""
if [[ "$INSTALL_DEMO" =~ ^[TtYy]$ ]]; then
  DEMO_PASSWORD="$(openssl rand -base64 18 | tr -d '/+=')"
  sudo -u kla bash -lc "cd '$APP_DIR.new' && set -a && source '$ENV_DIR/edziennik.env' && set +a && KLA_DEMO_PASSWORD='$DEMO_PASSWORD' npm run db:seed:demo"
fi
if [[ -d "$APP_DIR" ]]; then rm -rf "$APP_ROOT/previous"; mv "$APP_DIR" "$APP_ROOT/previous"; fi
mv "$APP_DIR.new" "$APP_DIR"
chown -R kla:kla "$APP_DIR"

install -m 644 "$SOURCE_DIR"/raspberry/systemd/* /etc/systemd/system/
install -m 755 "$SOURCE_DIR/raspberry/healthcheck.sh" /usr/local/sbin/edziennik-kla-health
install -m 755 "$SOURCE_DIR/raspberry/backup.sh" /usr/local/sbin/edziennik-kla-backup
install -m 755 "$SOURCE_DIR/raspberry/restore.sh" /usr/local/sbin/edziennik-kla-restore
install -m 755 "$SOURCE_DIR/raspberry/retention.sh" /usr/local/sbin/edziennik-kla-retention
install -m 755 "$SOURCE_DIR/raspberry/restore-test-latest.sh" /usr/local/sbin/edziennik-kla-restore-test-latest
install -m 755 "$SOURCE_DIR/raspberry/print-recovery-key.sh" /usr/local/sbin/edziennik-kla-print-recovery-key
install -m 755 "$SOURCE_DIR/raspberry/unlock.sh" /usr/local/sbin/kla-unlock
install -m 755 "$SOURCE_DIR/raspberry/status.sh" /usr/local/bin/kla-status
install -m 755 "$SOURCE_DIR/raspberry/configure-sftp-backup.sh" /usr/local/sbin/kla-configure-sftp-backup
install -m 755 "$SOURCE_DIR/raspberry/update.sh" /usr/local/sbin/kla-update

if [[ ! -f "$VAULT/secrets/backup-age.key" ]]; then
  age-keygen -o "$VAULT/secrets/backup-age.key" 2> "$VAULT/secrets/backup-recipient.txt"
  chmod 600 "$VAULT/secrets/backup-age.key" "$VAULT/secrets/backup-recipient.txt"
fi

sed 's|__SERVER_NAME__|_|g' "$SOURCE_DIR/raspberry/nginx/kla.conf" > /etc/nginx/sites-available/kla
ln -sfn /etc/nginx/sites-available/kla /etc/nginx/sites-enabled/kla
rm -f /etc/nginx/sites-enabled/default
nginx -t
cloudflared service uninstall >/dev/null 2>&1 || true
cloudflared service install "$TUNNEL_TOKEN"
unset TUNNEL_TOKEN
systemctl enable cloudflared
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw --force enable
systemctl enable fail2ban unattended-upgrades nginx edziennik-kla-health.timer edziennik-kla-backup.timer edziennik-kla-retention.timer edziennik-kla-restore-test.timer
systemctl daemon-reload
systemctl restart nginx postgresql clamav-daemon cloudflared
systemctl enable --now edziennik-kla edziennik-kla-health.timer edziennik-kla-backup.timer edziennik-kla-retention.timer edziennik-kla-restore-test.timer

echo
echo "GOTOWE. Otwórz: $APP_URL"
echo "Po każdym restarcie: sudo kla-unlock"
echo "Stan urządzenia: kla-status"
echo "Backup SFTP: sudo kla-configure-sftp-backup"
if [[ -n "$DEMO_PASSWORD" ]]; then echo "Jednorazowe hasło fikcyjnych kont demo: $DEMO_PASSWORD"; fi
