#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Uruchom aktualizację przez: sudo ./raspberry/update.sh"
  exit 1
fi

SCRIPT_PACKAGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -f "$SCRIPT_PACKAGE_DIR/package-lock.json" ]]; then
  SOURCE_DIR="$SCRIPT_PACKAGE_DIR"
else
  SOURCE_DIR="${1:-$(pwd)}"
  SOURCE_DIR="$(cd "$SOURCE_DIR" && pwd)"
fi
APP_ROOT=/opt/kla
CURRENT="$APP_ROOT/current"
PREVIOUS="$APP_ROOT/previous"
NEW="$APP_ROOT/current.new"
FAILED="$APP_ROOT/failed-update"
LOCK_FILE=/run/lock/edziennik-kla-update.lock
NGINX_CONFIG=/etc/nginx/sites-available/kla
NGINX_CONFIG_BACKUP=/etc/nginx/sites-available/kla.pre-update
switched=0

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "Inna aktualizacja już trwa. Poczekaj na jej zakończenie."
  exit 1
fi
exec 8>/run/lock/kla-maintenance.lock
flock -n 8 || { echo "Trwa backup, import albo odtwarzanie. Aktualizacja nie została rozpoczęta."; exit 1; }

[[ -d "$CURRENT" ]] || { echo "Brak działającej instalacji w $CURRENT."; exit 1; }
[[ -f "$SOURCE_DIR/package-lock.json" ]] || { echo "Paczka nie zawiera package-lock.json."; exit 1; }
[[ -f "$SOURCE_DIR/KLA_RELEASE_COMMIT" ]] || { echo "Paczka nie ma identyfikatora wydania."; exit 1; }
[[ -f "$SOURCE_DIR/KLA_RELEASE_MANIFEST.sha256" ]] || { echo "Paczka nie ma manifestu integralności."; exit 1; }
[[ -f "$SOURCE_DIR/KLA_RELEASE_MANIFEST.sha256.sig" ]] || { echo "Paczka nie ma podpisu wydania."; exit 1; }
[[ -s /etc/kla/release-signing.pub ]] || { echo "Brak zaufanego klucza podpisu wydania."; exit 1; }
[[ "$(stat -c '%u' /etc/kla/release-signing.pub)" == "0" ]] || { echo "Klucz podpisu nie należy do roota."; exit 1; }
[[ $((8#$(stat -c '%a' /etc/kla/release-signing.pub) & 8#022)) -eq 0 ]] || { echo "Klucz podpisu ma zbyt szerokie uprawnienia zapisu."; exit 1; }
ALLOWED_SIGNERS="$(mktemp)"
trap 'rm -f "$ALLOWED_SIGNERS"' EXIT
printf 'kla-release %s\n' "$(cut -d' ' -f1-2 /etc/kla/release-signing.pub)" > "$ALLOWED_SIGNERS"
ssh-keygen -Y verify -f "$ALLOWED_SIGNERS" -I kla-release -n kla-release \
  -s "$SOURCE_DIR/KLA_RELEASE_MANIFEST.sha256.sig" < "$SOURCE_DIR/KLA_RELEASE_MANIFEST.sha256" >/dev/null
rm -f "$ALLOWED_SIGNERS"
trap - EXIT
python3 "$SOURCE_DIR/raspberry/safe-archive.py" release "$SOURCE_DIR"
EXPECTED_COMMIT="$(tr -d '\r\n' < "$SOURCE_DIR/KLA_RELEASE_COMMIT")"
[[ "$EXPECTED_COMMIT" =~ ^[0-9a-f]{40}$ ]] || { echo "Nieprawidłowy identyfikator wydania."; exit 1; }
# Od tego wydania dyrektor zawsze kończy konfigurację MFA przed dostępem do
# prawdziwych danych. Aktualizacja nie zmienia hasła ani istniejącego konta.
ENV_FILE=/srv/kla-vault/secrets/edziennik.env
[[ -r "$ENV_FILE" ]] || { echo "Brak prywatnej konfiguracji aplikacji."; exit 1; }
MFA_ENV="$(mktemp /srv/kla-vault/secrets/mfa-policy.XXXXXX)"
grep -vE '^(KLA_REQUIRE_DIRECTOR_MFA|KLA_BUG_REPORT_EMAIL|NEXT_PUBLIC_SUPPORT_EMAIL)=' "$ENV_FILE" > "$MFA_ENV"
printf 'KLA_REQUIRE_DIRECTOR_MFA=1\nKLA_BUG_REPORT_EMAIL=damianx9x@me.com\nNEXT_PUBLIC_SUPPORT_EMAIL=damianx9x@me.com\n' >> "$MFA_ENV"
chown root:kla "$MFA_ENV"
chmod 640 "$MFA_ENV"
mv "$MFA_ENV" "$ENV_FILE"

# Aktualizacja aplikacji nie modyfikuje systemu operacyjnego, hosta ani
# parametrów PostgreSQL. Takie zmiany należą wyłącznie do instalatora i
# osobnego, świadomie uruchamianego narzędzia serwisowego.

cleanup() {
  rm -rf -- "$NEW"
}

rollback() {
  local exit_code=$?
  if [[ "$switched" -eq 1 && -d "$PREVIOUS" ]]; then
    echo "Nowa wersja nie przeszła kontroli. Przywracam poprzedni kod..."
    systemctl stop edziennik-kla || true
    rm -rf -- "$FAILED"
    if [[ -d "$CURRENT" ]]; then mv "$CURRENT" "$FAILED"; fi
    mv "$PREVIOUS" "$CURRENT"
    systemctl start edziennik-kla
    for _ in {1..30}; do
      if curl --fail --silent --show-error --max-time 5 \
        http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
        echo "Poprzednia wersja znów działa. Nieudany kod: $FAILED"
        break
      fi
      sleep 2
    done
  fi
  if [[ -f "$NGINX_CONFIG_BACKUP" ]]; then
    install -m 644 "$NGINX_CONFIG_BACKUP" "$NGINX_CONFIG"
    nginx -t >/dev/null 2>&1 && systemctl reload nginx || true
  fi
  cleanup
  exit "$exit_code"
}
trap rollback ERR INT TERM
trap cleanup EXIT

rm -rf -- "$NEW"
install -d -o kla -g kla "$NEW"
rsync -a --delete \
  --exclude '.git' --exclude '.next' --exclude 'node_modules' \
  --exclude '.env' --exclude 'outputs' --exclude 'tmp' --exclude '.data' \
  "$SOURCE_DIR/" "$NEW/"
chown -R kla:kla "$NEW"

echo "Sprawdzam i buduję nową wersję bez wyłączania aplikacji..."
runuser -u kla -- bash -c "cd '$NEW' && npm ci --include=dev"
# Plik sekretów pozostaje root-only. Root wczytuje go do środowiska tylko na
# czas kompilacji i migracji, zamiast poluzowywać uprawnienia na dysku.
set -a
source "$ENV_FILE"
set +a
runuser -u kla --preserve-environment -- bash -c \
  "cd '$NEW' && npm run db:generate && npm run check && npm run build"

# Next.js nie dołącza publicznych assetów do standalone automatycznie. Build
# jest gotowy do wdrożenia dopiero wtedy, gdy każdemu plikowi źródłowemu CSS/JS
# odpowiada plik w katalogu uruchomieniowym.
STATIC_SOURCE_COUNT="$(find "$NEW/.next/static" -type f | wc -l | tr -d ' ')"
STATIC_RUNTIME_COUNT="$(find "$NEW/.next/standalone/.next/static" -type f | wc -l | tr -d ' ')"
if [[ "$STATIC_SOURCE_COUNT" -eq 0 || "$STATIC_SOURCE_COUNT" -ne "$STATIC_RUNTIME_COUNT" ]]; then
  echo "Niekompletne zasoby przeglądarki: źródło=$STATIC_SOURCE_COUNT, runtime=$STATIC_RUNTIME_COUNT."
  false
fi

echo "Tworzę i sprawdzam szyfrowaną kopię przed migracją..."
KLA_MAINTENANCE_LOCK_HELD=1 /usr/local/sbin/edziennik-kla-backup --test-restore

# Migracje muszą być rozszerzające. Kontroluje je security:check, dzięki czemu
# poprzedni kod może wrócić nawet wtedy, gdy nowa wersja nie wystartuje.
echo "Stosuję migracje bazy..."
runuser -u kla --preserve-environment -- bash -c \
  "cd '$NEW' && npm run db:migrate:deploy"

echo "Przełączam aplikację..."
systemctl stop edziennik-kla
rm -rf -- "$PREVIOUS" "$FAILED"
mv "$CURRENT" "$PREVIOUS"
mv "$NEW" "$CURRENT"
switched=1
install -m 644 "$CURRENT"/raspberry/systemd/* /etc/systemd/system/
install -m 755 "$CURRENT/raspberry/healthcheck.sh" /usr/local/sbin/edziennik-kla-health
install -m 755 "$CURRENT/raspberry/safe-restart.sh" /usr/local/sbin/kla-safe-restart
install -m 755 "$CURRENT/raspberry/restart-policy.py" /usr/local/sbin/kla-restart-policy
install -m 755 "$CURRENT/raspberry/prepare-memory-limits.py" /usr/local/sbin/kla-prepare-memory-limits
install -m 755 "$CURRENT/raspberry/safe-archive.py" /usr/local/sbin/kla-safe-archive
install -m 755 "$CURRENT/raspberry/benchmark-readonly.sh" /usr/local/sbin/kla-benchmark-readonly
install -m 755 "$CURRENT/raspberry/backup.sh" /usr/local/sbin/edziennik-kla-backup
install -m 755 "$CURRENT/raspberry/restore.sh" /usr/local/sbin/edziennik-kla-restore
install -m 755 "$CURRENT/raspberry/retention.sh" /usr/local/sbin/edziennik-kla-retention
install -m 755 "$CURRENT/raspberry/restore-test-latest.sh" /usr/local/sbin/edziennik-kla-restore-test-latest
install -m 755 "$CURRENT/raspberry/print-recovery-key.sh" /usr/local/sbin/edziennik-kla-print-recovery-key
install -m 755 "$CURRENT/raspberry/unlock.sh" /usr/local/sbin/kla-unlock
install -m 755 "$CURRENT/raspberry/enable-auto-unlock.sh" /usr/local/sbin/kla-enable-auto-unlock
install -m 755 "$CURRENT/raspberry/status.sh" /usr/local/bin/kla-status
install -m 755 "$CURRENT/raspberry/local-url.sh" /usr/local/sbin/kla-local-url
install -m 755 "$CURRENT/raspberry/optimize-server.sh" /usr/local/sbin/kla-optimize-server
install -m 755 "$CURRENT/raspberry/runtime-guards.sh" /usr/local/sbin/kla-runtime-guards
install -m 755 "$CURRENT/raspberry/startup-audit.sh" /usr/local/sbin/kla-startup-audit
install -m 755 "$CURRENT/raspberry/configure-sftp-backup.sh" /usr/local/sbin/kla-configure-sftp-backup
install -m 755 "$CURRENT/raspberry/update.sh" /usr/local/sbin/kla-update
install -m 755 "$CURRENT/raspberry/control.sh" /usr/local/sbin/kla-control
install -m 755 "$CURRENT/raspberry/web-control.sh" /usr/local/sbin/kla-web-control
install -m 755 "$CURRENT/raspberry/web-control-daemon.py" /usr/local/sbin/kla-web-control-daemon
/usr/local/sbin/kla-runtime-guards
rm -f /etc/sudoers.d/kla-web-control
install -d -m 750 -o root -g kla /srv/kla-vault/config /srv/kla-vault/release-uploads
if [[ ! -f /srv/kla-vault/config/public-presentation-mode ]]; then
  MODE_VALUE="$(grep '^KLA_PUBLIC_PRESENTATION_MODE=' "$ENV_FILE" | tail -n1 | cut -d= -f2- | tr -d "'\"" || true)"
  [[ "$MODE_VALUE" == "school" || "$MODE_VALUE" == "product" ]] || MODE_VALUE=product
  printf '%s\n' "$MODE_VALUE" > /srv/kla-vault/config/public-presentation-mode
  chown root:kla /srv/kla-vault/config/public-presentation-mode
  chmod 640 /srv/kla-vault/config/public-presentation-mode
fi
if ! grep -q '^KLA_PUBLIC_PRESENTATION_MODE_FILE=' "$ENV_FILE"; then
  printf '%s\n' 'KLA_PUBLIC_PRESENTATION_MODE_FILE=/srv/kla-vault/config/public-presentation-mode' >> "$ENV_FILE"
fi
if [[ ! -f /etc/kla/release-signing.pub ]]; then
  install -m 644 -o root -g root "$CURRENT/deployment/release-signing.pub" /etc/kla/release-signing.pub
fi
if [[ ! -f /etc/kla/control-user && -n "${SUDO_USER:-}" && "$SUDO_USER" != "root" ]]; then
  printf '%s\n' "$SUDO_USER" > /etc/kla/control-user
  chmod 600 /etc/kla/control-user
fi
if [[ -f /etc/kla/control-user ]]; then
  CONTROL_USER="$(cat /etc/kla/control-user)"
  [[ "$CONTROL_USER" =~ ^[A-Za-z_][A-Za-z0-9_-]*$ ]] || { echo "Niepoprawny użytkownik panelu sterowania."; false; }
  printf '%s ALL=(root) NOPASSWD: /usr/local/sbin/kla-control *\n' "$CONTROL_USER" > /etc/sudoers.d/kla-control
  chmod 440 /etc/sudoers.d/kla-control
  visudo -cf /etc/sudoers.d/kla-control >/dev/null
  CONTROL_GROUP="$(id -gn "$CONTROL_USER")"
  chmod 711 /srv/kla-vault
  install -d -m 700 -o "$CONTROL_USER" -g "$CONTROL_GROUP" /srv/kla-vault/control-incoming
  install -d -m 700 -o kla -g kla /srv/kla-vault/imports
fi

# Aktualizacja odświeża reverse proxy razem z kodem. Poprawki wydajności i
# ochrony ruchu nie wymagają dzięki temu ponownej instalacji urządzenia.
if [[ "${KLA_DEPLOYMENT_MODE:-production}" == "local-demo" ]]; then
  [[ ! -f "$NGINX_CONFIG" ]] || install -m 644 "$NGINX_CONFIG" "$NGINX_CONFIG_BACKUP"
  sed -e 's|__SERVER_NAME__|_|g' -e 's|__LISTEN__|0.0.0.0:8080|g' -e 's|__FORWARDED_PROTO__|http|g' \
    "$CURRENT/raspberry/nginx/kla.conf" > "$NGINX_CONFIG"
else
  [[ ! -f "$NGINX_CONFIG" ]] || install -m 644 "$NGINX_CONFIG" "$NGINX_CONFIG_BACKUP"
  sed -e 's|__SERVER_NAME__|_|g' -e 's|__LISTEN__|127.0.0.1:8080|g' -e 's|__FORWARDED_PROTO__|https|g' \
    "$CURRENT/raspberry/nginx/kla.conf" > "$NGINX_CONFIG"
  sed -i '/listen 127\.0\.0\.1:8080 default_server;/a\  listen 127.0.0.1:3100;' "$NGINX_CONFIG"
fi
ln -sfn "$NGINX_CONFIG" /etc/nginx/sites-enabled/kla
nginx -t
systemctl reload nginx
systemctl daemon-reload
systemctl enable kla-web-control edziennik-kla edziennik-kla-health.timer edziennik-kla-backup.timer edziennik-kla-retention.timer edziennik-kla-restore-test.timer edziennik-kla-email-queue.timer
systemctl restart kla-web-control
systemctl restart edziennik-kla-health.timer edziennik-kla-backup.timer edziennik-kla-retention.timer edziennik-kla-restore-test.timer edziennik-kla-email-queue.timer
if [[ -f /etc/kla/backup-policy.env ]]; then
  source /etc/kla/backup-policy.env
  if [[ "${KLA_BACKUP_FREQUENCY:-daily}" == "manual" ]]; then
    systemctl disable --now edziennik-kla-backup.timer >/dev/null
  fi
fi
systemctl start edziennik-kla

verify_browser_assets() {
  local html asset
  local -a assets=()
  html="$(curl --fail --silent --show-error --max-time 8 http://127.0.0.1:3000/)" || return 1
  mapfile -t assets < <(
    printf '%s' "$html" \
      | grep -oE '/_next/static/[^"[:space:]]+\.(css|js)' \
      | sort -u \
      | awk 'NR <= 12'
  )
  [[ "${#assets[@]}" -gt 0 ]] || return 1
  for asset in "${assets[@]}"; do
    curl --fail --silent --show-error --max-time 8 \
      "http://127.0.0.1:3000${asset}" >/dev/null || return 1
  done
}

for attempt in {1..45}; do
  if curl --fail --silent --show-error --max-time 5 \
    http://127.0.0.1:3000/api/health >/dev/null 2>&1 \
    && verify_browser_assets; then
    rm -f "$NGINX_CONFIG_BACKUP"
    switched=0
    trap - ERR INT TERM
    echo "Aktualizacja zakończona. Poprzednia wersja: $PREVIOUS"
    exit 0
  fi
  if [[ "$attempt" -eq 45 ]]; then
    echo "Nowa wersja nie osiągnęła stanu gotowości z kompletnym CSS/JS."
    false
  fi
  sleep 2
done
