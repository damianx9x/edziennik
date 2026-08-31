#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

[[ ${EUID} -eq 0 ]] || { echo "Odmowa: wymagane kontrolowane sudo." >&2; exit 1; }
ACTION="${1:-status-json}"
VAULT=/srv/kla-vault
ENV_FILE="$VAULT/secrets/edziennik.env"
BACKUP_USB_ENV=/etc/kla/backup-usb.env
BACKUP_POLICY_ENV=/etc/kla/backup-policy.env
BACKUP_SFTP_ENV=/etc/kla/backup-sftp.env
PUBLIC_MODE_FILE="$VAULT/config/public-presentation-mode"

case "$ACTION" in
  status-json)
    python3 - <<'PY'
import json, os, shutil, subprocess, time
def service(name):
    return subprocess.run(["systemctl", "is-active", "--quiet", name]).returncode == 0
def enabled(name):
    return subprocess.run(["systemctl", "is-enabled", "--quiet", name]).returncode == 0
def systemd_property(name, prop):
    try:
        return subprocess.check_output(["systemctl", "show", "-p", prop, "--value", name], text=True, timeout=2).strip()
    except (OSError, subprocess.SubprocessError):
        return ""
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
policy = {"frequency": "daily", "retentionDays": 30}
for line in read("/etc/kla/backup-policy.env").splitlines():
    if line.startswith("KLA_BACKUP_FREQUENCY="): policy["frequency"] = line.split("=", 1)[1].strip("'\"")
    if line.startswith("KLA_BACKUP_RETENTION_DAYS="):
        try: policy["retentionDays"] = int(line.split("=", 1)[1].strip("'\""))
        except ValueError: pass
temperature = read("/sys/class/thermal/thermal_zone0/temp")
try:
    throttled_raw = subprocess.check_output(["vcgencmd", "get_throttled"], text=True, timeout=2).strip().split("=", 1)[-1]
    throttled_value = int(throttled_raw, 16)
except (OSError, ValueError, subprocess.SubprocessError):
    throttled_raw, throttled_value = "unknown", None
controllers = read("/sys/fs/cgroup/cgroup.controllers").split()
memory_controller_enabled = "memory" in controllers or os.path.isdir("/sys/fs/cgroup/memory")
try:
    vault_source = subprocess.check_output(["findmnt", "-n", "-o", "SOURCE", "/srv/kla-vault"], text=True, timeout=2).strip()
    vault_rota_raw = subprocess.check_output(["lsblk", "-ndo", "ROTA", vault_source], text=True, timeout=2).strip().splitlines()[0]
    vault_rotational = vault_rota_raw == "1"
except (OSError, IndexError, subprocess.SubprocessError):
    vault_rotational = None
try:
    release = json.loads(read("/opt/kla/current/KLA_RELEASE_METADATA.json", "{}"))
except json.JSONDecodeError:
    release = {}
vault_mounted = subprocess.run(["mountpoint", "-q", "/srv/kla-vault"]).returncode == 0
crypttab = read("/etc/crypttab")
fstab = read("/etc/fstab")
auto_unlock_ready = (
    os.path.isfile("/etc/kla/vault-auto-unlock.key")
    and "/etc/kla/vault-auto-unlock.key" in crypttab
    and "/srv/kla-vault" in fstab
)
manager_config = read("/etc/systemd/system.conf") + "\n"
manager_dir = "/etc/systemd/system.conf.d"
if os.path.isdir(manager_dir):
    manager_config += "\n".join(read(os.path.join(manager_dir, name)) for name in os.listdir(manager_dir))
journal_config = read("/etc/systemd/journald.conf") + "\n"
journal_dir = "/etc/systemd/journald.conf.d"
if os.path.isdir(journal_dir):
    journal_config += "\n".join(read(os.path.join(journal_dir, name)) for name in os.listdir(journal_dir))
startup_protection = {
  "vaultMounted": vault_mounted,
  "autoUnlockReady": auto_unlock_ready,
  "hardwareWatchdog": "RuntimeWatchdogSec=" in manager_config,
  "persistentJournal": os.path.isdir("/var/log/journal") and "Storage=persistent" in journal_config,
  "applicationRestart": systemd_property("edziennik-kla.service", "Restart") == "always",
  "tunnelRestart": systemd_property("cloudflared.service", "Restart") in {"always", "on-failure"},
  "healthTimer": enabled("edziennik-kla-health.timer") and service("edziennik-kla-health.timer"),
  "backupTimer": enabled("edziennik-kla-backup.timer") and service("edziennik-kla-backup.timer"),
}
print(json.dumps({
  "available": True,
  "hostname": read("/etc/hostname", "raspberrypi"),
  "uptimeSeconds": int(float(read("/proc/uptime", "0").split()[0])),
  "temperatureC": round(int(temperature or 0) / 1000, 1),
  "throttledHex": throttled_raw,
  "currentThrottling": None if throttled_value is None else bool(throttled_value & 0xF),
  "memoryControllerEnabled": memory_controller_enabled,
  "vaultRotational": vault_rotational,
  "load": list(os.getloadavg()),
  "memory": {"total": mem.get("MemTotal", 0), "available": mem.get("MemAvailable", 0)},
  "rootDisk": disk("/"), "vaultDisk": disk("/srv/kla-vault"),
  "services": {name: service(name) for name in ["edziennik-kla", "postgresql", "nginx", "cloudflared", "clamav-daemon"]},
  "latestBackupAt": latest, "usbBackupPath": usb_target,
  "sftpConfigured": os.path.isfile("/etc/kla/backup-sftp.env"),
  "backupPolicy": policy,
  "autoUnlockEnabled": auto_unlock_ready,
  "startupProtection": startup_protection,
  "emailConfigured": any(line.startswith("EMAIL_PROVIDER=") and not line.endswith("=disabled") for line in read("/srv/kla-vault/secrets/edziennik.env").splitlines()),
  "publicPresentationMode": read("/srv/kla-vault/config/public-presentation-mode", next((line.split("=", 1)[1].strip("'\"").lower() for line in read("/srv/kla-vault/secrets/edziennik.env").splitlines() if line.startswith("KLA_PUBLIC_PRESENTATION_MODE=")), "product")).lower(),
  "release": release
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
  benchmark-readonly)
    exec /usr/local/sbin/kla-benchmark-readonly
    ;;
  restart-app)
    systemd-run --quiet --unit="kla-panel-restart-$(date +%s)" --on-active=3s \
      /usr/bin/systemctl restart edziennik-kla
    echo "Restart aplikacji został zaplanowany. Strona wróci automatycznie w ciągu kilkunastu sekund."
    ;;
  set-backup-policy)
    PAYLOAD="$(mktemp)"
    trap 'rm -f "$PAYLOAD"' EXIT
    cat > "$PAYLOAD"
    read -r FREQUENCY RETENTION_DAYS < <(python3 - "$PAYLOAD" <<'PY'
import json, sys
with open(sys.argv[1], encoding="utf-8") as handle: data = json.load(handle)
frequency = str(data.get("frequency", ""))
retention = int(data.get("retentionDays", 0))
if frequency not in {"daily", "weekly", "manual"}: raise SystemExit("Niepoprawna częstotliwość kopii.")
if retention not in {14, 30, 90}: raise SystemExit("Niepoprawny okres przechowywania.")
print(frequency, retention)
PY
    )
    printf 'KLA_BACKUP_FREQUENCY=%q\nKLA_BACKUP_RETENTION_DAYS=%q\n' "$FREQUENCY" "$RETENTION_DAYS" > "$BACKUP_POLICY_ENV"
    chmod 600 "$BACKUP_POLICY_ENV"
    install -d -m 755 /etc/systemd/system/edziennik-kla-backup.timer.d
    case "$FREQUENCY" in
      daily) ON_CALENDAR='*-*-* 03:15:00' ;;
      weekly) ON_CALENDAR='Mon *-*-* 03:15:00' ;;
      manual) ON_CALENDAR='' ;;
    esac
    if [[ -n "$ON_CALENDAR" ]]; then
      printf '[Timer]\nOnCalendar=\nOnCalendar=%s\n' "$ON_CALENDAR" > /etc/systemd/system/edziennik-kla-backup.timer.d/schedule.conf
      systemctl daemon-reload
      systemctl enable edziennik-kla-backup.timer >/dev/null
      systemctl restart edziennik-kla-backup.timer
    else
      rm -f /etc/systemd/system/edziennik-kla-backup.timer.d/schedule.conf
      systemctl daemon-reload
      systemctl disable --now edziennik-kla-backup.timer >/dev/null
    fi
    echo "Harmonogram kopii został zapisany."
    ;;
  sftp-prepare)
    PAYLOAD="$(mktemp)"
    SCAN="$(mktemp)"
    trap 'rm -f "$PAYLOAD" "$SCAN"' EXIT
    cat > "$PAYLOAD"
    read -r HOST PORT USERNAME REMOTE_PATH < <(python3 - "$PAYLOAD" <<'PY'
import json, re, sys
with open(sys.argv[1], encoding="utf-8") as handle: data = json.load(handle)
host = str(data.get("host", "")).strip(); port = int(data.get("port", 0))
username = str(data.get("username", "")).strip(); path = str(data.get("remotePath", "")).strip()
if not re.fullmatch(r"[A-Za-z0-9.-]+", host): raise SystemExit("Niepoprawny adres SFTP.")
if not 1 <= port <= 65535: raise SystemExit("Niepoprawny port SFTP.")
if not re.fullmatch(r"[A-Za-z0-9._-]+", username): raise SystemExit("Niepoprawny login SFTP.")
if not re.fullmatch(r"[A-Za-z0-9._/-]+", path) or path.startswith("/") or ".." in path.split("/"): raise SystemExit("Niepoprawny folder SFTP.")
print(host, port, username, path)
PY
    )
    KEY="$VAULT/secrets/sftp-backup-key"
    [[ -f "$KEY" ]] || ssh-keygen -q -t ed25519 -N '' -C 'kla-backup' -f "$KEY"
    chmod 600 "$KEY"
    ssh-keyscan -T 10 -p "$PORT" -H "$HOST" > "$SCAN" 2>/dev/null
    [[ -s "$SCAN" ]] || { echo "Serwer SFTP nie odpowiedział. Sprawdź adres, port i zaporę." >&2; exit 1; }
    FINGERPRINT="$(ssh-keygen -lf "$SCAN" -E sha256 | head -n1)"
    PUBLIC_KEY="$(cat "$KEY.pub")"
    python3 - "$HOST" "$PORT" "$USERNAME" "$REMOTE_PATH" "$FINGERPRINT" "$PUBLIC_KEY" <<'PY'
import json, sys
host, port, username, path, fingerprint, public_key = sys.argv[1:]
print(json.dumps({"host": host, "port": int(port), "username": username, "remotePath": path, "fingerprint": fingerprint, "publicKey": public_key}, ensure_ascii=False))
PY
    ;;
  sftp-confirm)
    PAYLOAD="$(mktemp)"
    SCAN="$(mktemp)"
    trap 'rm -f "$PAYLOAD" "$SCAN"' EXIT
    cat > "$PAYLOAD"
    eval "$(python3 - "$PAYLOAD" <<'PY'
import json, re, shlex, sys
with open(sys.argv[1], encoding="utf-8") as handle: data = json.load(handle)
host = str(data.get("host", "")).strip(); port = int(data.get("port", 0))
username = str(data.get("username", "")).strip(); path = str(data.get("remotePath", "")).strip()
fingerprint = str(data.get("fingerprint", "")).strip()
if not re.fullmatch(r"[A-Za-z0-9.-]+", host) or not 1 <= port <= 65535: raise SystemExit("Niepoprawny serwer SFTP.")
if not re.fullmatch(r"[A-Za-z0-9._-]+", username): raise SystemExit("Niepoprawny login SFTP.")
if not re.fullmatch(r"[A-Za-z0-9._/-]+", path) or path.startswith("/") or ".." in path.split("/"): raise SystemExit("Niepoprawny folder SFTP.")
for name, value in [("HOST", host), ("PORT", str(port)), ("USERNAME", username), ("REMOTE_PATH", path), ("EXPECTED_FINGERPRINT", fingerprint)]:
    print(f"{name}={shlex.quote(value)}")
PY
    )"
    KEY="$VAULT/secrets/sftp-backup-key"
    [[ -f "$KEY" ]] || { echo "Brak przygotowanego klucza SFTP." >&2; exit 1; }
    ssh-keyscan -T 10 -p "$PORT" -H "$HOST" > "$SCAN" 2>/dev/null
    [[ -s "$SCAN" ]] || { echo "Serwer SFTP nie odpowiedział." >&2; exit 1; }
    ACTUAL_FINGERPRINT="$(ssh-keygen -lf "$SCAN" -E sha256 | head -n1)"
    [[ "$ACTUAL_FINGERPRINT" == "$EXPECTED_FINGERPRINT" ]] || { echo "Odcisk serwera zmienił się. Konfiguracja została przerwana." >&2; exit 1; }
    printf 'cd %s\nquit\n' "$REMOTE_PATH" | sftp -q -b - -P "$PORT" -i "$KEY" \
      -oBatchMode=yes -oIdentitiesOnly=yes -oStrictHostKeyChecking=yes \
      -oUserKnownHostsFile="$SCAN" "$USERNAME@$HOST" || { echo "Nie udało się wejść do folderu. Dodaj pokazany klucz publiczny do konta SFTP i sprawdź ścieżkę." >&2; exit 1; }
    install -m 600 "$SCAN" "$VAULT/secrets/sftp-known-hosts"
    printf 'KLA_SFTP_HOST=%q\nKLA_SFTP_PORT=%q\nKLA_SFTP_USER=%q\nKLA_SFTP_PATH=%q\n' \
      "$HOST" "$PORT" "$USERNAME" "$REMOTE_PATH" > "$BACKUP_SFTP_ENV"
    chmod 600 "$BACKUP_SFTP_ENV"
    echo "Zewnętrzny backup SFTP został włączony i połączenie przeszło test."
    ;;
  sftp-clear)
    rm -f "$BACKUP_SFTP_ENV"
    echo "Wyłączono wysyłkę kopii na SFTP. Klucz pozostaje w sejfie do ponownej konfiguracji."
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
  import-prepare)
    IMPORT_ID="${2:-}"
    [[ "$IMPORT_ID" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$ ]] || {
      echo "Nieprawidłowy identyfikator importu." >&2; exit 2;
    }
    IMPORT_DIR="$VAULT/imports"
    SOURCE="$IMPORT_DIR/$IMPORT_ID.part"
    META="$IMPORT_DIR/$IMPORT_ID.json"
    find /dev/shm -maxdepth 1 -type f -name 'kla-import-key.*' -mmin +5 -delete 2>/dev/null || true
    find "$IMPORT_DIR" -maxdepth 1 -type d -name '.inspect.*' -mmin +60 -exec rm -rf -- {} + 2>/dev/null || true
    find "$IMPORT_DIR" -maxdepth 1 -type f \( -name '*.part' -o -name '*.json' \) -mmin +1440 -delete 2>/dev/null || true
    [[ -f "$SOURCE" && -f "$META" ]] || { echo "Przesłany plik wygasł albo nie istnieje." >&2; exit 1; }
    exec 8>/run/lock/kla-full-import.lock
    flock -n 8 || { echo "Inna kopia jest właśnie sprawdzana. Spróbuj ponownie za chwilę." >&2; exit 3; }
    KEY_FILE="$(mktemp /dev/shm/kla-import-key.XXXXXX)"
    INSPECT_DIR="$(mktemp -d "$IMPORT_DIR/.inspect.XXXXXX")"
    trap 'shred -u "$KEY_FILE" 2>/dev/null || rm -f "$KEY_FILE"; rm -rf "$INSPECT_DIR"' EXIT
    IFS= read -r RECOVERY_KEY
    [[ "$RECOVERY_KEY" =~ ^AGE-SECRET-KEY-1[A-Z0-9]+$ ]] || { echo "Klucz odzyskiwania ma nieprawidłowy format." >&2; exit 2; }
    printf '%s\n' "$RECOVERY_KEY" > "$KEY_FILE"
    chmod 600 "$KEY_FILE"
    age -d -i "$KEY_FILE" "$SOURCE" | /usr/local/sbin/kla-safe-archive outer "$INSPECT_DIR" \
      || { echo "Nie udało się otworzyć kopii. Sprawdź plik i właściwy klucz odzyskiwania." >&2; exit 1; }
    pg_restore --list "$INSPECT_DIR/database.dump" >/dev/null
    SCAN_DIR="$INSPECT_DIR/private-files.scan"
    /usr/local/sbin/kla-safe-archive private "$INSPECT_DIR/private-files.tar.gz" "$SCAN_DIR"
    clamdscan --fdpass --no-summary "$SCAN_DIR" >/dev/null \
      || { echo "Skan antywirusowy zatrzymał import kopii." >&2; exit 1; }
    CREATED_AT="$(sed -n 's/^created_at=//p' "$INSPECT_DIR/manifest.txt" | head -n1)"
    SOURCE_COMMIT="$(sed -n 's/^app_commit=//p' "$INSPECT_DIR/manifest.txt" | head -n1)"
    [[ "$CREATED_AT" =~ ^[0-9]{8}T[0-9]{6}Z$ ]] || CREATED_AT="nieznany"
    [[ "$SOURCE_COMMIT" =~ ^[A-Za-z0-9._-]{1,80}$ ]] || SOURCE_COMMIT="nieznany"
    RECIPIENT="$(sed -n 's/^Public key: //p' "$VAULT/secrets/backup-recipient.txt")"
    [[ -n "$RECIPIENT" ]] || { echo "Serwer nie ma aktywnego klucza szyfrowania kopii." >&2; exit 1; }
    PREPARED="$VAULT/backups/kla-import-$IMPORT_ID.tar.age"
    age -d -i "$KEY_FILE" "$SOURCE" | age -r "$RECIPIENT" -o "$PREPARED"
    chmod 600 "$PREPARED"
    SHA256="$(sha256sum "$PREPARED" | awk '{print $1}')"
    printf '%s  %s\n' "$SHA256" "$(basename "$PREPARED")" > "$PREPARED.sha256"
    /usr/local/sbin/edziennik-kla-restore --test "$PREPARED" >/dev/null
    SIZE="$(stat -c '%s' "$PREPARED")"
    rm -f "$SOURCE"
    python3 - "$IMPORT_ID" "$CREATED_AT" "$SOURCE_COMMIT" "$SIZE" "$SHA256" <<'PY'
import json, sys
identifier, created_at, commit, size, checksum = sys.argv[1:]
print(json.dumps({"id": identifier, "createdAt": created_at, "sourceCommit": commit, "size": int(size), "sha256": checksum}, ensure_ascii=False))
PY
    ;;
  import-restore)
    IMPORT_ID="${2:-}"
    [[ "$IMPORT_ID" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$ ]] || {
      echo "Nieprawidłowy identyfikator importu." >&2; exit 2;
    }
    PREPARED="$VAULT/backups/kla-import-$IMPORT_ID.tar.age"
    [[ -f "$PREPARED" && -f "$PREPARED.sha256" ]] || { echo "Najpierw prześlij i sprawdź kopię." >&2; exit 1; }
    systemd-run --quiet --unit="kla-import-restore-$(date +%s)" --on-active=4s \
      /usr/local/sbin/edziennik-kla-restore --confirmed "$PREPARED"
    echo "Odtworzenie zostało zaplanowane. System wykona własną kopię bezpieczeństwa, przełączy dane i sam sprawdzi aplikację."
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
  set-public-mode)
    MODE="${2:-}"
    [[ "$MODE" == "school" || "$MODE" == "product" ]] || { echo "Niepoprawny tryb wizytówki." >&2; exit 2; }
    install -d -m 750 -o root -g kla "$(dirname "$PUBLIC_MODE_FILE")"
    exec 8>/run/lock/kla-public-presentation.lock
    flock -x 8
    TEMP_MODE="$(mktemp "$(dirname "$PUBLIC_MODE_FILE")/.public-mode.XXXXXX")"
    trap 'rm -f "$TEMP_MODE"' EXIT
    printf '%s\n' "$MODE" > "$TEMP_MODE"
    chown root:kla "$TEMP_MODE"
    chmod 640 "$TEMP_MODE"
    python3 - "$TEMP_MODE" <<'PY'
import os, sys
with open(sys.argv[1], "rb") as handle: os.fsync(handle.fileno())
PY
    mv -f "$TEMP_MODE" "$PUBLIC_MODE_FILE"
    trap - EXIT
    echo "Tryb publicznej wizytówki został przełączony. Panel, konta i prawdziwa baza nie zostały zmienione."
    ;;
  *)
    echo "Niedozwolona operacja panelu serwera." >&2
    exit 2
    ;;
esac
