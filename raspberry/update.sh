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
switched=0

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "Inna aktualizacja już trwa. Poczekaj na jej zakończenie."
  exit 1
fi

[[ -d "$CURRENT" ]] || { echo "Brak działającej instalacji w $CURRENT."; exit 1; }
[[ -f "$SOURCE_DIR/package-lock.json" ]] || { echo "Paczka nie zawiera package-lock.json."; exit 1; }
[[ -f "$SOURCE_DIR/KLA_RELEASE_COMMIT" ]] || { echo "Paczka nie ma identyfikatora wydania."; exit 1; }
[[ -f "$SOURCE_DIR/KLA_RELEASE_MANIFEST.sha256" ]] || { echo "Paczka nie ma manifestu integralności."; exit 1; }
(
  cd "$SOURCE_DIR"
  sha256sum -c KLA_RELEASE_MANIFEST.sha256
)
EXPECTED_COMMIT="$(tr -d '\r\n' < "$SOURCE_DIR/KLA_RELEASE_COMMIT")"
[[ "$EXPECTED_COMMIT" =~ ^[0-9a-f]{40}$ ]] || { echo "Nieprawidłowy identyfikator wydania."; exit 1; }
[[ -f /etc/kla/edziennik.env ]] || { echo "Brak prywatnej konfiguracji aplikacji."; exit 1; }

if ! dpkg-query -W -f='${Status}' avahi-daemon 2>/dev/null | grep -q 'install ok installed'; then
  apt-get update
  apt-get install -y --no-install-recommends avahi-daemon
fi
hostnamectl set-hostname kingslanguageacademy
systemctl enable --now avahi-daemon
if command -v ufw >/dev/null; then ufw allow 5353/udp >/dev/null; fi

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
sudo -u kla bash -lc \
  "cd '$NEW' && set -a && source /etc/kla/edziennik.env && set +a && npm ci && npm install --no-save --package-lock=false \$(node -e 'const p=require(\"./package.json\"); process.stdout.write(Object.entries(p.devDependencies ?? {}).map(([name, version]) => name + \"@\" + version).join(\" \"))') && npm run db:generate && npm run check && npm run build"

echo "Tworzę szyfrowaną kopię przed migracją..."
/usr/local/sbin/edziennik-kla-backup

# Migracje muszą być rozszerzające. Kontroluje je security:check, dzięki czemu
# poprzedni kod może wrócić nawet wtedy, gdy nowa wersja nie wystartuje.
echo "Stosuję migracje bazy..."
sudo -u kla bash -lc \
  "cd '$NEW' && set -a && source /etc/kla/edziennik.env && set +a && npm run db:migrate:deploy"

echo "Przełączam aplikację..."
systemctl stop edziennik-kla
rm -rf -- "$PREVIOUS" "$FAILED"
mv "$CURRENT" "$PREVIOUS"
mv "$NEW" "$CURRENT"
switched=1
install -m 644 "$CURRENT/raspberry/systemd/edziennik-kla.service" /etc/systemd/system/edziennik-kla.service
if [[ ! -f /etc/kla/control-user && -n "${SUDO_USER:-}" && "$SUDO_USER" != "root" ]]; then
  printf '%s\n' "$SUDO_USER" > /etc/kla/control-user
  chmod 600 /etc/kla/control-user
fi
if [[ -f /etc/kla/control-user ]]; then
  CONTROL_USER="$(cat /etc/kla/control-user)"
  [[ "$CONTROL_USER" =~ ^[A-Za-z_][A-Za-z0-9_-]*$ ]] || { echo "Niepoprawny użytkownik panelu sterowania."; false; }
  install -m 755 "$CURRENT/raspberry/control.sh" /usr/local/sbin/kla-control
  printf '%s ALL=(root) NOPASSWD: /usr/local/sbin/kla-control *\n' "$CONTROL_USER" > /etc/sudoers.d/kla-control
  chmod 440 /etc/sudoers.d/kla-control
  visudo -cf /etc/sudoers.d/kla-control >/dev/null
  CONTROL_GROUP="$(id -gn "$CONTROL_USER")"
  install -d -m 700 -o "$CONTROL_USER" -g "$CONTROL_GROUP" /srv/kla-vault/control-incoming
fi
systemctl daemon-reload
systemctl start edziennik-kla

for attempt in {1..45}; do
  if curl --fail --silent --show-error --max-time 5 \
    http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
    switched=0
    trap - ERR INT TERM
    echo "Aktualizacja zakończona. Poprzednia wersja: $PREVIOUS"
    exit 0
  fi
  if [[ "$attempt" -eq 45 ]]; then
    echo "Nowa wersja nie osiągnęła stanu gotowości."
    false
  fi
  sleep 2
done
