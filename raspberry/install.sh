#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

MODE="production"
if [[ "${1:-}" == "--local-demo" ]]; then
  MODE="local-demo"
  shift
elif [[ "${1:-}" == "--public-demo" ]]; then
  MODE="public-demo"
  shift
fi
[[ $# -eq 0 ]] || {
  echo "Użycie: sudo ./raspberry/install.sh [--local-demo|--public-demo]"
  exit 1
}

if [[ ${EUID} -ne 0 ]]; then echo "Uruchom: sudo ./raspberry/install.sh [--local-demo|--public-demo]"; exit 1; fi
[[ "$(dpkg --print-architecture)" == "arm64" ]] || { echo "Wymagany jest Raspberry Pi OS 64-bit (arm64)."; exit 1; }
grep -qi 'Raspberry Pi' /proc/device-tree/model 2>/dev/null || { echo "Ten instalator jest przeznaczony dla Raspberry Pi."; exit 1; }

# Niektóre obudowy Seagate z tym kontrolerem gubią zapisy w trybie UAS na Pi 4.
# Konfigurujemy bezpieczniejszy sterownik przed jakąkolwiek zmianą partycji.
if lsusb 2>/dev/null | grep -q '0bc2:ab26' \
  && lsusb -t 2>/dev/null | grep -q 'Driver=uas' \
  && ! grep -q 'usb-storage.quirks=0bc2:ab26:u' /boot/firmware/cmdline.txt; then
  python3 - <<'PY'
from pathlib import Path
path = Path("/boot/firmware/cmdline.txt")
text = path.read_text(encoding="utf-8").strip()
path.write_text(f"{text} usb-storage.quirks=0bc2:ab26:u\n", encoding="utf-8")
PY
  echo "Wykryto dysk Seagate wymagający bezpieczniejszego sterownika USB."
  echo "Ustawienie zapisano przed formatowaniem. Uruchom ponownie Raspberry i włącz instalator jeszcze raz."
  exit 75
fi
hostnamectl set-hostname kingslanguageacademy

APP_ROOT=/opt/kla
APP_DIR="$APP_ROOT/current"
ENV_DIR=/etc/kla
VAULT=/srv/kla-vault
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTROL_USER="${SUDO_USER:-}"
[[ -n "$CONTROL_USER" && "$CONTROL_USER" != "root" ]] || { echo "Uruchom instalator przez sudo ze zwykłego konta."; exit 1; }

local_ipv4() {
  ip -o -4 addr show scope global \
    | awk '$2 !~ /^(docker|br-|veth)/ {split($4, parts, "/"); print parts[1]; exit}'
}

echo "Dostępne zewnętrzne dyski:"
lsblk -o NAME,PATH,SIZE,TYPE,FSTYPE,LABEL,PARTLABEL,MODEL,TRAN
if [[ "$MODE" == "public-demo" ]]; then
  if [[ -n "${KLA_INSTALL_VAULT_PARTITION:-}" ]]; then
    VAULT_PARTITION="$KLA_INSTALL_VAULT_PARTITION"
  else
    read -r -p "Podaj NOWĄ partycję KLA_DATA (np. /dev/sda3): " VAULT_PARTITION
  fi
else
  read -r -p "Podaj pusty dysk danych USB na zaszyfrowany sejf (SSD zalecany; np. /dev/sda): " VAULT_DEVICE
fi

if [[ "$MODE" == "local-demo" ]]; then
  LOCAL_IP="$(local_ipv4)"
  [[ -n "$LOCAL_IP" ]] || { echo "Nie znaleziono adresu sieci lokalnej. Podłącz Ethernet lub Wi-Fi i spróbuj ponownie."; exit 1; }
  APP_URL="http://${LOCAL_IP}:8080"
  INSTALL_DEMO="t"
  DEMO_PASSWORD="$(openssl rand -base64 18 | tr -d '/+=')"
  echo
  echo "TRYB LOKALNEGO DEMO: powstanie nowa, fikcyjna baza danych."
  echo "Adres do testów po instalacji: $APP_URL"
  echo "Ten tryb nie nadaje się do prawdziwych danych ani dokumentów."
elif [[ "$MODE" == "public-demo" ]]; then
  APP_URL="https://demo.kingslanguageacademy.pl"
  INSTALL_DEMO="n"
  echo
  echo "PUBLICZNY PILOT: pusta baza i kreator pierwszego uruchomienia pod $APP_URL."
  echo "Ta konfiguracja nie jest przeznaczona do prawdziwych danych."
  if [[ -n "${KLA_INSTALL_TUNNEL_TOKEN_FILE:-}" ]]; then
    [[ "$KLA_INSTALL_TUNNEL_TOKEN_FILE" == /run/* && -f "$KLA_INSTALL_TUNNEL_TOKEN_FILE" ]] || { echo "Plik tokenu tunelu musi być w pamięci /run."; exit 1; }
    TUNNEL_TOKEN="$(cat "$KLA_INSTALL_TUNNEL_TOKEN_FILE")"
  else
    read -r -s -p "Token istniejącego tunelu Cloudflare dla demo.kingslanguageacademy.pl: " TUNNEL_TOKEN
    echo
  fi
  [[ "$TUNNEL_TOKEN" == eyJ* ]] || { echo "Nie rozpoznano tokenu tunelu Cloudflare."; exit 1; }
else
  read -r -p "Publiczny adres HTTPS aplikacji (np. https://edziennik.example.pl): " APP_URL
  [[ "$APP_URL" =~ ^https://[A-Za-z0-9.-]+$ ]] || { echo "Wymagany jest publiczny adres HTTPS bez ścieżki."; exit 1; }
  read -r -s -p "Token istniejącego tunelu Cloudflare dla tego adresu: " TUNNEL_TOKEN
  echo
  [[ "$TUNNEL_TOKEN" == eyJ* ]] || { echo "Nie rozpoznano tokenu tunelu Cloudflare."; exit 1; }
  read -r -p "Wgrać wyłącznie fikcyjne dane testowe? [t/N]: " INSTALL_DEMO
fi

if [[ "$MODE" != "local-demo" && ! "$INSTALL_DEMO" =~ ^[TtYy]$ ]]; then
  echo "Poczta może używać dowolnego SMTP albo Resend. Możesz ustawić ją później z panelu na Macu."
  if [[ "${KLA_INSTALL_EMAIL_LATER:-}" == "1" ]]; then
    EMAIL_CHOICE="p"
  else
    read -r -p "Poczta: [S]MTP / [R]esend / [P]óźniej: " EMAIL_CHOICE
  fi
  case "${EMAIL_CHOICE,,}" in
    s)
      EMAIL_PROVIDER=smtp
      read -r -p "Host SMTP: " SMTP_HOST
      read -r -p "Port SMTP (465 albo 587): " SMTP_PORT
      [[ "$SMTP_PORT" == "465" || "$SMTP_PORT" == "587" ]] || { echo "Dozwolony port: 465 lub 587."; exit 1; }
      read -r -p "Login SMTP: " SMTP_USER
      read -r -s -p "Hasło SMTP: " SMTP_PASSWORD
      echo
      read -r -p "Nadawca (np. eDziennik King's <noreply@domena.pl>): " EMAIL_FROM
      ;;
    r)
      EMAIL_PROVIDER=resend
      read -r -s -p "Klucz API Resend: " RESEND_API_KEY
      echo
      [[ "$RESEND_API_KEY" == re_* ]] || { echo "Nie rozpoznano klucza API Resend."; exit 1; }
      read -r -p "Zweryfikowany nadawca: " EMAIL_FROM
      ;;
    p|"") EMAIL_PROVIDER="" ;;
    *) echo "Nieznany wybór."; exit 1 ;;
  esac
  [[ -z "${EMAIL_PROVIDER:-}" || "${EMAIL_FROM:-}" == *"@"* ]] || { echo "Niepoprawny adres nadawcy."; exit 1; }
  BOOTSTRAP_CODE="$(openssl rand -base64 32 | tr -d '/+=')"
  BOOTSTRAP_TOKEN_HASH="$(printf '%s' "$BOOTSTRAP_CODE" | sha256sum | awk '{print $1}')"
  if [[ -n "${KLA_BOOTSTRAP_CODE_OUTPUT:-}" ]]; then
    [[ "$KLA_BOOTSTRAP_CODE_OUTPUT" == /run/* ]] || { echo "Plik kodu instalacyjnego musi być w pamięci /run."; exit 1; }
    printf '%s\n' "$BOOTSTRAP_CODE" > "$KLA_BOOTSTRAP_CODE_OUTPUT"
    chown root:root "$KLA_BOOTSTRAP_CODE_OUTPUT"
    chmod 600 "$KLA_BOOTSTRAP_CODE_OUTPUT"
  fi
fi

if [[ "$MODE" != "local-demo" && -f /usr/share/keyrings/cloudflare-main.gpg ]]; then
  chmod 0644 /usr/share/keyrings/cloudflare-main.gpg
fi
apt-get update
apt-get full-upgrade -y
apt-get install -y --no-install-recommends age avahi-daemon ca-certificates clamav clamav-daemon clamdscan cryptsetup curl fail2ban gnupg nginx openssh-client parted postgresql postgresql-client rsync unattended-upgrades ufw
if [[ "$MODE" != "local-demo" ]]; then
  install -d -m 0755 /usr/share/keyrings
  curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg > /usr/share/keyrings/cloudflare-main.gpg
  chmod 0644 /usr/share/keyrings/cloudflare-main.gpg
  echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" > /etc/apt/sources.list.d/cloudflared.list
  apt-get update
  apt-get install -y --no-install-recommends cloudflared
fi
if ! command -v node >/dev/null || [[ "$(node -p 'Number(process.versions.node.split(".")[0])')" -lt 22 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

systemctl stop edziennik-kla postgresql 2>/dev/null || true
if [[ "$MODE" == "public-demo" ]]; then
  "$SOURCE_DIR/raspberry/vault-create-partition.sh" "$VAULT_PARTITION"
else
  "$SOURCE_DIR/raspberry/vault-create.sh" "$VAULT_DEVICE"
fi

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
PG_CHECKSUMS="/usr/lib/postgresql/$PG_VERSION/bin/pg_checksums"
if [[ -x "$PG_CHECKSUMS" ]]; then
  if ! CHECKSUM_RESULT="$("$PG_CHECKSUMS" --check -D "$PG_SOURCE" 2>&1)"; then
    if grep -qi 'not enabled' <<<"$CHECKSUM_RESULT"; then
      "$PG_CHECKSUMS" --enable -D "$PG_SOURCE"
    else
      echo "$CHECKSUM_RESULT"
      echo "Nie udało się sprawdzić sum kontrolnych PostgreSQL."
      exit 1
    fi
  fi
fi
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
if [[ "$MODE" == "local-demo" ]] && sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname = 'kla_edziennik'" | grep -q 1; then
  echo ""
  echo "Na tym sejfie istnieje już baza kla_edziennik."
  read -r -p "Aby utworzyć NOWE czyste demo wpisz: USUN STARE DEMO: " RESET_CONFIRM
  [[ "$RESET_CONFIRM" == "USUN STARE DEMO" ]] || { echo "Odmowa: nie usuwam istniejącej bazy."; exit 1; }
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'kla_edziennik' AND pid <> pg_backend_pid();"
  sudo -u postgres dropdb kla_edziennik
fi
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
NODE_OPTIONS=--max-old-space-size=1408
PORT=3000
HOSTNAME=127.0.0.1
DATABASE_URL=postgresql://kla_app:${DB_PASSWORD}@127.0.0.1:5432/kla_edziennik?schema=public
KLA_DATABASE_POOL_MAX=5
BETTER_AUTH_SECRET=${AUTH_SECRET}
BETTER_AUTH_URL=${APP_URL}
NEXT_PUBLIC_APP_URL=${APP_URL}
NEXT_PUBLIC_APP_RELEASE=raspberry
KLA_DEPLOYMENT_MODE=${MODE}
KLA_REQUIRE_DIRECTOR_MFA=1
KLA_ALLOW_INSECURE_DEMO_CREDENTIALS=0
KLA_ALLOW_DEMO_RESET=$([[ "$MODE" == "production" ]] && echo 0 || echo 1)
KLA_PUBLIC_PRESENTATION_MODE_FILE=$VAULT/config/public-presentation-mode
KLA_PUBLIC_SCHOOL_SLUG=$([[ "$INSTALL_DEMO" =~ ^[TtYy]$ ]] && echo kings-language-academy-demo || echo kings-language-academy)
KLA_PRIVATE_FILES_DIR=$VAULT/private-files
FILE_STORAGE_PROVIDER=local
KLA_MALWARE_SCAN_MODE=required
KLA_CLAMAV_SOCKET=/run/clamav/clamd.ctl
KLA_MONITORING_PROVIDER=systemd
KLA_BACKUP_PROVIDER=age-local
LOG_LEVEL=info
MESSAGE_REFRESH_MS=8000
SMS_PROVIDER=disabled
KLA_BUG_REPORT_EMAIL=damianx9x@me.com
NEXT_PUBLIC_SUPPORT_EMAIL=damianx9x@me.com
KLA_BOOTSTRAP_TOKEN_HASH=${BOOTSTRAP_TOKEN_HASH:-}
ENV
printf 'EMAIL_PROVIDER=%q\nRESEND_API_KEY=%q\nEMAIL_FROM=%q\nSMTP_HOST=%q\nSMTP_PORT=%q\nSMTP_USER=%q\nSMTP_PASSWORD=%q\n' \
  "${EMAIL_PROVIDER:-}" "${RESEND_API_KEY:-}" "${EMAIL_FROM:-}" \
  "${SMTP_HOST:-}" "${SMTP_PORT:-}" "${SMTP_USER:-}" "${SMTP_PASSWORD:-}" \
  >> "$VAULT/secrets/edziennik.env"
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
cat > "$ENV_DIR/backup-policy.env" <<'ENV'
KLA_BACKUP_FREQUENCY=daily
KLA_BACKUP_RETENTION_DAYS=30
ENV
chmod 600 "$ENV_DIR/backup-policy.env"

"$SOURCE_DIR/raspberry/optimize-server.sh" "$PG_VERSION"
sed -i 's/^#\?LocalSocket .*/LocalSocket \/run\/clamav\/clamd.ctl/' /etc/clamav/clamd.conf
systemctl enable --now clamav-freshclam clamav-daemon
for _ in {1..30}; do [[ -S /run/clamav/clamd.ctl ]] && break; sleep 2; done
[[ -S /run/clamav/clamd.ctl ]] || { echo "ClamAV nie uruchomił skanera. Instalacja zatrzymana."; exit 1; }

sudo -u kla bash -lc "cd '$APP_DIR.new' && set -a && source '$ENV_DIR/edziennik.env' && set +a && npm ci --include=dev && npm run db:generate && npm run check && npm run db:migrate:deploy && npm run build"
if [[ "$INSTALL_DEMO" =~ ^[TtYy]$ ]]; then
  DEMO_PASSWORD="${DEMO_PASSWORD:-$(openssl rand -base64 18 | tr -d '/+=')}"
  sudo -u kla bash -lc "cd '$APP_DIR.new' && set -a && source '$ENV_DIR/edziennik.env' && set +a && KLA_DEMO_PASSWORD='$DEMO_PASSWORD' npm run db:seed:demo"
fi
if [[ -d "$APP_DIR" ]]; then rm -rf "$APP_ROOT/previous"; mv "$APP_DIR" "$APP_ROOT/previous"; fi
mv "$APP_DIR.new" "$APP_DIR"
chown -R kla:kla "$APP_DIR"

install -m 644 "$SOURCE_DIR"/raspberry/systemd/* /etc/systemd/system/
install -m 755 "$SOURCE_DIR/raspberry/healthcheck.sh" /usr/local/sbin/edziennik-kla-health
install -m 755 "$SOURCE_DIR/raspberry/safe-archive.py" /usr/local/sbin/kla-safe-archive
install -m 755 "$SOURCE_DIR/raspberry/benchmark-readonly.sh" /usr/local/sbin/kla-benchmark-readonly
install -m 755 "$SOURCE_DIR/raspberry/backup.sh" /usr/local/sbin/edziennik-kla-backup
install -m 755 "$SOURCE_DIR/raspberry/restore.sh" /usr/local/sbin/edziennik-kla-restore
install -m 755 "$SOURCE_DIR/raspberry/retention.sh" /usr/local/sbin/edziennik-kla-retention
install -m 755 "$SOURCE_DIR/raspberry/restore-test-latest.sh" /usr/local/sbin/edziennik-kla-restore-test-latest
install -m 755 "$SOURCE_DIR/raspberry/print-recovery-key.sh" /usr/local/sbin/edziennik-kla-print-recovery-key
install -m 755 "$SOURCE_DIR/raspberry/unlock.sh" /usr/local/sbin/kla-unlock
install -m 755 "$SOURCE_DIR/raspberry/enable-auto-unlock.sh" /usr/local/sbin/kla-enable-auto-unlock
install -m 755 "$SOURCE_DIR/raspberry/status.sh" /usr/local/bin/kla-status
install -m 755 "$SOURCE_DIR/raspberry/local-url.sh" /usr/local/sbin/kla-local-url
install -m 755 "$SOURCE_DIR/raspberry/optimize-server.sh" /usr/local/sbin/kla-optimize-server
install -m 755 "$SOURCE_DIR/raspberry/runtime-guards.sh" /usr/local/sbin/kla-runtime-guards
install -m 755 "$SOURCE_DIR/raspberry/startup-audit.sh" /usr/local/sbin/kla-startup-audit
install -m 755 "$SOURCE_DIR/raspberry/configure-sftp-backup.sh" /usr/local/sbin/kla-configure-sftp-backup
install -m 755 "$SOURCE_DIR/raspberry/update.sh" /usr/local/sbin/kla-update
install -m 755 "$SOURCE_DIR/raspberry/control.sh" /usr/local/sbin/kla-control
install -m 755 "$SOURCE_DIR/raspberry/web-control.sh" /usr/local/sbin/kla-web-control
install -m 755 "$SOURCE_DIR/raspberry/web-control-daemon.py" /usr/local/sbin/kla-web-control-daemon
install -d -m 750 -o root -g kla /srv/kla-vault/config /srv/kla-vault/release-uploads
printf '%s\n' "${KLA_PUBLIC_PRESENTATION_MODE:-product}" > /srv/kla-vault/config/public-presentation-mode
chown root:kla /srv/kla-vault/config/public-presentation-mode
chmod 640 /srv/kla-vault/config/public-presentation-mode
install -m 644 -o root -g root "$SOURCE_DIR/deployment/release-signing.pub" /etc/kla/release-signing.pub
rm -f /etc/sudoers.d/kla-web-control
printf '%s\n' "$CONTROL_USER" > /etc/kla/control-user
chmod 600 /etc/kla/control-user
printf '%s ALL=(root) NOPASSWD: /usr/local/sbin/kla-control *\n' "$CONTROL_USER" > /etc/sudoers.d/kla-control
chmod 440 /etc/sudoers.d/kla-control
visudo -cf /etc/sudoers.d/kla-control >/dev/null
CONTROL_GROUP="$(id -gn "$CONTROL_USER")"
chmod 711 "$VAULT"
install -d -m 700 -o "$CONTROL_USER" -g "$CONTROL_GROUP" "$VAULT/control-incoming"
install -d -m 700 -o kla -g kla "$VAULT/imports"

if [[ ! -f "$VAULT/secrets/backup-age.key" ]]; then
  age-keygen -o "$VAULT/secrets/backup-age.key" 2> "$VAULT/secrets/backup-recipient.txt"
  chmod 600 "$VAULT/secrets/backup-age.key" "$VAULT/secrets/backup-recipient.txt"
fi

if [[ "$MODE" == "local-demo" ]]; then
  sed -e 's|__SERVER_NAME__|_|g' -e 's|__LISTEN__|0.0.0.0:8080|g' -e 's|__FORWARDED_PROTO__|http|g' \
    "$SOURCE_DIR/raspberry/nginx/kla.conf" > /etc/nginx/sites-available/kla
else
  sed -e 's|__SERVER_NAME__|_|g' -e 's|__LISTEN__|127.0.0.1:8080|g' -e 's|__FORWARDED_PROTO__|https|g' \
    "$SOURCE_DIR/raspberry/nginx/kla.conf" > /etc/nginx/sites-available/kla
  sed -i '/listen 127\.0\.0\.1:8080 default_server;/a\  listen 127.0.0.1:3100;' /etc/nginx/sites-available/kla
fi
ln -sfn /etc/nginx/sites-available/kla /etc/nginx/sites-enabled/kla
rm -f /etc/nginx/sites-enabled/default
nginx -t
if [[ "$MODE" != "local-demo" ]]; then
  cloudflared service uninstall >/dev/null 2>&1 || true
  cloudflared service install "$TUNNEL_TOKEN"
  unset TUNNEL_TOKEN
  systemctl enable cloudflared
elif systemctl list-unit-files cloudflared.service --no-legend 2>/dev/null | grep -q cloudflared; then
  systemctl disable --now cloudflared || true
fi
ufw default deny incoming
ufw default allow outgoing
ufw allow from 10.0.0.0/8 to any port 22 proto tcp
ufw allow from 172.16.0.0/12 to any port 22 proto tcp
ufw allow from 192.168.0.0/16 to any port 22 proto tcp
ufw allow 5353/udp
if [[ "$MODE" == "local-demo" ]]; then
  ufw allow from 10.0.0.0/8 to any port 8080 proto tcp
  ufw allow from 172.16.0.0/12 to any port 8080 proto tcp
  ufw allow from 192.168.0.0/16 to any port 8080 proto tcp
fi
ufw --force enable
systemctl enable avahi-daemon fail2ban unattended-upgrades nginx kla-web-control edziennik-kla-health.timer edziennik-kla-backup.timer edziennik-kla-retention.timer edziennik-kla-restore-test.timer edziennik-kla-email-queue.timer
systemctl daemon-reload
systemctl restart nginx postgresql clamav-daemon
systemctl restart avahi-daemon
[[ "$MODE" != "local-demo" ]] && systemctl restart cloudflared
systemctl enable --now kla-web-control edziennik-kla edziennik-kla-health.timer edziennik-kla-backup.timer edziennik-kla-retention.timer edziennik-kla-restore-test.timer edziennik-kla-email-queue.timer

echo
echo "GOTOWE. Otwórz: $APP_URL"
echo "Start bez obsługi po zaniku prądu: sudo kla-enable-auto-unlock (świadomie zapisuje klucz root-only na karcie systemowej)"
echo "Stan urządzenia: sudo kla-status"
echo "Backup SFTP: sudo kla-configure-sftp-backup"
if [[ -n "${DEMO_PASSWORD:-}" ]]; then
  echo "Konta demo: kinga, dyrektor, wykladowca, rodzic, uczen"
  echo "Jednorazowe hasło fikcyjnych kont demo: $DEMO_PASSWORD"
  echo "Zapisz je teraz w menedżerze haseł. Nie jest zapisywane w pakiecie ani repozytorium."
fi
if [[ -n "${BOOTSTRAP_CODE:-}" ]]; then
  if [[ -n "${KLA_BOOTSTRAP_CODE_OUTPUT:-}" ]]; then
    echo "Jednorazowy kod pierwszego uruchomienia zapisano tymczasowo w pamięci RAM do bezpiecznego odbioru."
  else
    echo "Jednorazowy kod pierwszego uruchomienia: $BOOTSTRAP_CODE"
    echo "Zapisz go teraz w menedżerze haseł. Serwer przechowuje wyłącznie jego hash."
  fi
  echo "Otwórz: $APP_URL/pierwsze-uruchomienie"
fi
if [[ "$MODE" == "local-demo" ]]; then
  echo "Po zmianie adresu IP uruchom: sudo kla-local-url"
fi
