#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Uruchom: sudo ./raspberry/install.sh"
  exit 1
fi

ARCH="$(dpkg --print-architecture)"
if [[ "$ARCH" != "arm64" ]]; then
  echo "Wymagany jest 64-bitowy Raspberry Pi OS (arm64). Wykryto: $ARCH"
  exit 1
fi

APP_ROOT="/opt/kla"
APP_DIR="$APP_ROOT/current"
ENV_DIR="/etc/kla"
BACKUP_DIR="/var/backups/kla"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

read -r -p "Adres aplikacji [http://adres-pi]: " APP_URL
APP_URL="${APP_URL:-http://adres-pi}"
if [[ ! "$APP_URL" =~ ^https?://[A-Za-z0-9.-]+(:[0-9]{1,5})?$ ]]; then
  echo "Adres musi wyglądać jak https://demo.example.pl albo http://192.168.1.20"
  exit 1
fi
read -r -p "Wgrać fikcyjne dane do testów? [t/N]: " INSTALL_DEMO

apt-get update
apt-get install -y ca-certificates curl gnupg nginx postgresql postgresql-client age rsync openssl
if ! command -v node >/dev/null || [[ "$(node -p 'Number(process.versions.node.split(".")[0])')" -lt 22 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

id -u kla >/dev/null 2>&1 || useradd --system --create-home --home-dir /var/lib/kla --shell /usr/sbin/nologin kla
install -d -o kla -g kla "$APP_ROOT" "$BACKUP_DIR"
install -d -m 750 -o root -g kla "$ENV_DIR"

DB_PASSWORD="$(openssl rand -hex 24)"
AUTH_SECRET="$(openssl rand -base64 48 | tr -d '\n')"
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'kla_app') THEN
    CREATE ROLE kla_app LOGIN PASSWORD '$DB_PASSWORD';
  ELSE
    ALTER ROLE kla_app PASSWORD '$DB_PASSWORD';
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE kla_edziennik OWNER kla_app'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'kla_edziennik')\gexec
SQL

rm -rf "$APP_DIR.new"
install -d -o kla -g kla "$APP_DIR.new"
rsync -a --delete \
  --exclude '.git' --exclude '.next' --exclude 'node_modules' --exclude '.env' \
  --exclude 'outputs' --exclude 'tmp' --exclude '.data' \
  "$SOURCE_DIR/" "$APP_DIR.new/"
chown -R kla:kla "$APP_DIR.new"

cat > "$ENV_DIR/edziennik.env" <<ENV
NODE_ENV=production
PORT=3000
HOSTNAME=127.0.0.1
DATABASE_URL=postgresql://kla_app:${DB_PASSWORD}@127.0.0.1:5432/kla_edziennik?schema=public
KLA_DATABASE_POOL_MAX=5
BETTER_AUTH_SECRET=${AUTH_SECRET}
BETTER_AUTH_URL="${APP_URL}"
NEXT_PUBLIC_APP_URL="${APP_URL}"
NEXT_PUBLIC_APP_RELEASE=raspberry
KLA_REQUIRE_DIRECTOR_MFA=1
KLA_ALLOW_INSECURE_DEMO_CREDENTIALS=0
KLA_PUBLIC_SCHOOL_SLUG=kings-language-academy-demo
KLA_PRIVATE_FILES_DIR=/var/lib/kla/private-files
FILE_STORAGE_PROVIDER=local
LOG_LEVEL=info
MESSAGE_REFRESH_MS=8000
SMS_PROVIDER=disabled
ENV
chmod 640 "$ENV_DIR/edziennik.env"
install -d -o kla -g kla /var/lib/kla/private-files

sudo -u kla bash -lc "cd '$APP_DIR.new' && set -a && source '$ENV_DIR/edziennik.env' && set +a && npm ci && npm run db:migrate:deploy && npm run build"
DEMO_PASSWORD=""
if [[ "$INSTALL_DEMO" =~ ^[TtYy]$ ]]; then
  DEMO_PASSWORD="$(openssl rand -base64 18 | tr -d '/+=')"
  sudo -u kla bash -lc "cd '$APP_DIR.new' && set -a && source '$ENV_DIR/edziennik.env' && set +a && KLA_DEMO_PASSWORD='$DEMO_PASSWORD' npm run db:seed:demo"
fi
if [[ -d "$APP_DIR" ]]; then
  rm -rf "$APP_ROOT/previous"
  mv "$APP_DIR" "$APP_ROOT/previous"
fi
mv "$APP_DIR.new" "$APP_DIR"
chown -R kla:kla "$APP_DIR"

install -m 644 "$SOURCE_DIR/raspberry/systemd/edziennik-kla.service" /etc/systemd/system/
install -m 644 "$SOURCE_DIR/raspberry/systemd/edziennik-kla-health.service" /etc/systemd/system/
install -m 644 "$SOURCE_DIR/raspberry/systemd/edziennik-kla-health.timer" /etc/systemd/system/
install -m 644 "$SOURCE_DIR/raspberry/systemd/edziennik-kla-backup.service" /etc/systemd/system/
install -m 644 "$SOURCE_DIR/raspberry/systemd/edziennik-kla-backup.timer" /etc/systemd/system/
install -m 755 "$SOURCE_DIR/raspberry/healthcheck.sh" /usr/local/sbin/edziennik-kla-health
install -m 755 "$SOURCE_DIR/raspberry/backup.sh" /usr/local/sbin/edziennik-kla-backup
install -m 755 "$SOURCE_DIR/raspberry/restore.sh" /usr/local/sbin/edziennik-kla-restore
install -m 755 "$SOURCE_DIR/raspberry/print-recovery-key.sh" /usr/local/sbin/edziennik-kla-print-recovery-key

if [[ ! -f "$ENV_DIR/backup.agekey" ]]; then
  age-keygen -o "$ENV_DIR/backup.agekey" 2> "$ENV_DIR/backup-recipient.txt"
  chmod 600 "$ENV_DIR/backup.agekey"
  chmod 640 "$ENV_DIR/backup-recipient.txt"
fi

sed "s|__SERVER_NAME__|_|g" "$SOURCE_DIR/raspberry/nginx/kla.conf" > /etc/nginx/sites-available/kla
ln -sfn /etc/nginx/sites-available/kla /etc/nginx/sites-enabled/kla
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl daemon-reload
systemctl enable --now edziennik-kla.service edziennik-kla-health.timer edziennik-kla-backup.timer nginx

echo
echo "Gotowe. Otwórz: $APP_URL"
echo "Status: sudo systemctl status edziennik-kla --no-pager"
echo "Klucz odzyskiwania: sudo edziennik-kla-print-recovery-key"
if [[ -n "$DEMO_PASSWORD" ]]; then
  echo "Konta demo: dyrektor / wykladowca / rodzic / uczen"
  echo "Jednorazowe hasło demo: $DEMO_PASSWORD"
  echo "Zapisz je w menedżerze haseł; instalator nie zapisuje go w pliku."
fi
echo "Nie uruchamiaj danych demo na serwerze z prawdziwymi danymi."
