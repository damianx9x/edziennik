#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

[[ ${EUID} -eq 0 ]] || { echo "Odmowa: wymagane kontrolowane sudo." >&2; exit 1; }
ACTION="${1:-status-json}"
VAULT=/srv/kla-vault
ENV_FILE="$VAULT/secrets/edziennik.env"
BACKUP_USB_ENV=/etc/kla/backup-usb.env

case "$ACTION" in
  status-json)
    python3 - <<'PY'
import json, os, shutil, subprocess, time
def service(name):
    return subprocess.run(["systemctl", "is-active", "--quiet", name]).returncode == 0
def disk(path):
    try:
        value = shutil.disk_usage(path)
        return {"total": value.total, "used": value.used, "free": value.free}
    except OSError:
        return None
def read(path, fallback=""):
    try:
        with open(path, encoding="utf-8") as handle: return handle.read().strip()
    except OSError: return fallback
latest = ""
backup_dir = "/srv/kla-vault/backups"
if os.path.isdir(backup_dir):
    files = [os.path.join(backup_dir, f) for f in os.listdir(backup_dir) if f.endswith(".tar.age")]
    if files: latest = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(os.path.getmtime(max(files, key=os.path.getmtime))))
mem = {}
for line in read("/proc/meminfo").splitlines():
    if ":" in line:
        key, value = line.split(":", 1); mem[key] = int(value.strip().split()[0]) * 1024
usb_target = ""
for line in read("/etc/kla/backup-usb.env").splitlines():
    if line.startswith("KLA_USB_BACKUP_PATH="): usb_target = line.split("=", 1)[1].strip("'\"")
temperature = read("/sys/class/thermal/thermal_zone0/temp")
print(json.dumps({
  "available": True,
  "hostname": read("/etc/hostname", "raspberrypi"),
  "uptimeSeconds": int(float(read("/proc/uptime", "0").split()[0])),
  "temperatureC": round(int(temperature or 0) / 1000, 1),
  "load": list(os.getloadavg()),
  "memory": {"total": mem.get("MemTotal", 0), "available": mem.get("MemAvailable", 0)},
  "rootDisk": disk("/"), "vaultDisk": disk("/srv/kla-vault"),
  "services": {name: service(name) for name in ["edziennik-kla", "postgresql", "nginx", "cloudflared", "clamav-daemon"]},
  "latestBackupAt": latest, "usbBackupPath": usb_target,
  "autoUnlockEnabled": os.path.isfile("/etc/kla/vault-auto-unlock.key"),
  "emailConfigured": any(line.startswith("EMAIL_PROVIDER=") and not line.endswith("=disabled") for line in read("/srv/kla-vault/secrets/edziennik.env").splitlines())
}, ensure_ascii=False))
PY
    ;;
  storage-json)
    lsblk --json --bytes --output NAME,PATH,TYPE,SIZE,FSTYPE,LABEL,MOUNTPOINTS,TRAN,RM,HOTPLUG
    ;;
  set-backup-usb)
    TARGET="${2:-}"
    [[ -n "$TARGET" ]] || { echo "Wybierz zamontowany dysk USB." >&2; exit 2; }
    TARGET="$(realpath -e -- "$TARGET")"
    [[ "$TARGET" == /media/* || "$TARGET" == /mnt/* ]] || { echo "Dozwolony jest wyłącznie zamontowany nośnik w /media lub /mnt." >&2; exit 2; }
    mountpoint -q -- "$TARGET" || { echo "Wybrane miejsce nie jest punktem montowania." >&2; exit 2; }
    [[ "$TARGET" != "$VAULT" ]] || { echo "Backup musi być na innym nośniku niż sejf danych." >&2; exit 2; }
    install -d -m 700 "$TARGET/kla-encrypted-backups"
    printf 'KLA_USB_BACKUP_PATH=%q\n' "$TARGET" > "$BACKUP_USB_ENV"
    chmod 600 "$BACKUP_USB_ENV"
    echo "Dysk USB został ustawiony. Kolejna kopia trafi także na ten nośnik."
    ;;
  clear-backup-usb)
    rm -f "$BACKUP_USB_ENV"
    echo "Wyłączono dodatkową kopię na USB. Kopia w sejfie nadal działa."
    ;;
  backup-now)
    exec /usr/local/sbin/edziennik-kla-backup --test-restore
    ;;
  recovery-key-once)
    exec /usr/local/sbin/edziennik-kla-print-recovery-key
    ;;
  export-create)
    EXPORT_ID="${2:-}"
    [[ "$EXPORT_ID" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$ ]] || {
      echo "Nieprawidłowy identyfikator eksportu." >&2
      exit 2
    }
    exec 8>/run/lock/kla-full-export.lock
    flock -n 8 || { echo "Inny pełny eksport jest już przygotowywany. Poczekaj kilka minut." >&2; exit 3; }
    EXPORT_DIR=/srv/kla-vault/exports
    install -d -m 750 -o root -g kla "$EXPORT_DIR"
    find "$EXPORT_DIR" -maxdepth 1 -type f \( -name 'kla-full-export-*.tar.age' -o -name 'kla-full-export-*.sha256' \) -mmin +1440 -delete
    RECENT_EXPORT="$(find "$EXPORT_DIR" -maxdepth 1 -type f -name 'kla-full-export-*.tar.age' -mmin -5 -print -quit)"
    [[ -z "$RECENT_EXPORT" ]] || { echo "Pełny eksport utworzono przed chwilą. Pobierz poprzedni plik albo odczekaj 5 minut." >&2; exit 4; }
    FREE_BYTES="$(df --output=avail -B1 /srv/kla-vault | tail -n1 | tr -d ' ')"
    [[ "$FREE_BYTES" =~ ^[0-9]+$ && "$FREE_BYTES" -ge 1073741824 ]] || {
      echo "Za mało wolnego miejsca na bezpieczne przygotowanie eksportu (wymagane 1 GB)." >&2
      exit 5
    }
    /usr/local/sbin/edziennik-kla-backup >/dev/null
    LATEST="$(find /srv/kla-vault/backups -maxdepth 1 -type f -name 'kla-*.tar.age' -print | sort | tail -n1)"
    [[ -n "$LATEST" && -f "$LATEST" ]] || { echo "Nie znaleziono gotowej kopii." >&2; exit 1; }
    EXPORT_NAME="kla-full-export-$EXPORT_ID.tar.age"
    EXPORT_PATH="$EXPORT_DIR/$EXPORT_NAME"
    install -m 440 -o root -g kla "$LATEST" "$EXPORT_PATH"
    SHA256="$(sha256sum "$EXPORT_PATH" | awk '{print $1}')"
    printf '%s  %s\n' "$SHA256" "$EXPORT_NAME" > "$EXPORT_DIR/kla-full-export-$EXPORT_ID.sha256"
    chown root:kla "$EXPORT_DIR/kla-full-export-$EXPORT_ID.sha256"
    chmod 440 "$EXPORT_DIR/kla-full-export-$EXPORT_ID.sha256"
    SIZE="$(stat -c '%s' "$EXPORT_PATH")"
    EXPIRES="$(date -u -d '+24 hours' +'%Y-%m-%dT%H:%M:%SZ')"
    printf '{"id":"%s","filename":"%s","size":%s,"sha256":"%s","expiresAt":"%s"}\n' "$EXPORT_ID" "$EXPORT_NAME" "$SIZE" "$SHA256" "$EXPIRES"
    ;;
  set-smtp)
    PAYLOAD="$(mktemp)"
    trap 'rm -f "$PAYLOAD"' EXIT
    cat > "$PAYLOAD"
    python3 - "$PAYLOAD" "$ENV_FILE" <<'PY'
import json, os, shlex, sys, tempfile
payload_path, env_path = sys.argv[1:]
with open(payload_path, encoding="utf-8") as handle: data = json.load(handle)
host = str(data.get("host", "")).strip()
port = str(data.get("port", "")).strip()
user = str(data.get("user", "")).strip()
password = str(data.get("password", ""))
sender = str(data.get("from", "")).strip()
if not host or any(ch not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-" for ch in host): raise SystemExit("Niepoprawny host SMTP.")
if port not in {"465", "587"}: raise SystemExit("Dozwolony port SMTP: 465 albo 587.")
if not user or not password or "@" not in sender: raise SystemExit("Uzupełnij nadawcę, login i hasło SMTP.")
keys = {"EMAIL_PROVIDER", "EMAIL_FROM", "RESEND_API_KEY", "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD"}
with open(env_path, encoding="utf-8") as handle: lines = [line for line in handle if line.split("=", 1)[0] not in keys]
values = {"EMAIL_PROVIDER":"smtp", "EMAIL_FROM":sender, "RESEND_API_KEY":"", "SMTP_HOST":host, "SMTP_PORT":port, "SMTP_USER":user, "SMTP_PASSWORD":password}
directory = os.path.dirname(env_path)
fd, temp_path = tempfile.mkstemp(prefix="smtp.", dir=directory, text=True)
with os.fdopen(fd, "w", encoding="utf-8") as handle:
    handle.writelines(lines)
    for key, value in values.items(): handle.write(f"{key}={shlex.quote(value)}\n")
os.chmod(temp_path, 0o640); os.chown(temp_path, 0, __import__('grp').getgrnam('kla').gr_gid); os.replace(temp_path, env_path)
PY
    systemd-run --quiet --unit="kla-app-restart-$(date +%s)" --on-active=4s \
      /usr/bin/systemctl restart edziennik-kla
    echo "SMTP zapisano. Aplikacja wczyta ustawienia za kilka sekund."
    ;;
  set-sms-gate)
    PAYLOAD="$(mktemp)"
    trap 'rm -f "$PAYLOAD"' EXIT
    cat > "$PAYLOAD"
    python3 - "$PAYLOAD" "$ENV_FILE" <<'PY'
import json, os, shlex, sys, tempfile, grp
payload_path, env_path = sys.argv[1:]
with open(payload_path, encoding="utf-8") as handle: data = json.load(handle)
username = str(data.get("username", "")).strip(); password = str(data.get("password", ""))
if not username or not password: raise SystemExit("Podaj login i hasło wygenerowane w aplikacji SMS Gateway for Android.")
keys = {"SMS_PROVIDER", "SMS_GATE_URL", "SMS_GATE_USERNAME", "SMS_GATE_PASSWORD"}
with open(env_path, encoding="utf-8") as handle: lines = [line for line in handle if line.split("=", 1)[0] not in keys]
values = {"SMS_PROVIDER":"sms-gate", "SMS_GATE_URL":"https://api.sms-gate.app/3rdparty/v1/messages", "SMS_GATE_USERNAME":username, "SMS_GATE_PASSWORD":password}
fd, temp_path = tempfile.mkstemp(prefix="sms.", dir=os.path.dirname(env_path), text=True)
with os.fdopen(fd, "w", encoding="utf-8") as handle:
    handle.writelines(lines)
    for key, value in values.items(): handle.write(f"{key}={shlex.quote(value)}\n")
os.chmod(temp_path, 0o640); os.chown(temp_path, 0, grp.getgrnam('kla').gr_gid); os.replace(temp_path, env_path)
PY
    systemd-run --quiet --unit="kla-app-restart-$(date +%s)" --on-active=4s \
      /usr/bin/systemctl restart edziennik-kla
    echo "Bramka SMS została włączona. Aplikacja wczyta ustawienia za kilka sekund; wiadomości wysyła telefon z Androidem i aktywną kartą SIM."
    ;;
  *)
    echo "Niedozwolona operacja panelu serwera." >&2
    exit 2
    ;;
esac
