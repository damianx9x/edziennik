#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

[[ ${EUID} -eq 0 ]] || { echo "To polecenie wymaga kontrolowanego sudo."; exit 1; }
ACTION="${1:-status}"
INCOMING=/srv/kla-vault/control-incoming
ARCHIVE="$INCOMING/edziennik-kla-raspberry-source.tar.gz"
CURRENT=/opt/kla/current

refresh_operations() {
  [[ -d "$CURRENT/raspberry/systemd" ]] || { echo "Brak plików operacyjnych bieżącego wydania."; exit 1; }
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
  install -m 755 "$CURRENT/raspberry/web-control.sh" /usr/local/sbin/kla-web-control
  install -m 755 "$CURRENT/raspberry/web-control-daemon.py" /usr/local/sbin/kla-web-control-daemon
  install -m 644 -o root -g root "$CURRENT/deployment/release-signing.pub" /etc/kla/release-signing.pub
  /usr/local/sbin/kla-runtime-guards
  systemctl daemon-reload
  systemctl enable --now \
    kla-web-control \
    edziennik-kla-health.timer edziennik-kla-backup.timer \
    edziennik-kla-retention.timer edziennik-kla-restore-test.timer \
    edziennik-kla-email-queue.timer
  echo "Usługi operacyjne wydania zostały zsynchronizowane."
}

case "$ACTION" in
  status)
    exec /usr/local/bin/kla-status
    ;;
  start)
    mountpoint -q /srv/kla-vault || { echo "Sejf jest zamknięty. Najpierw wybierz Odblokuj po restarcie."; exit 2; }
    systemctl start postgresql clamav-daemon nginx edziennik-kla cloudflared
    echo "Serwer został uruchomiony."
    ;;
  stop)
    systemctl stop cloudflared edziennik-kla
    echo "Aplikacja i tunel zostały zatrzymane. Baza pozostała uruchomiona."
    ;;
  restart)
    mountpoint -q /srv/kla-vault || { echo "Sejf jest zamknięty. Najpierw wybierz Odblokuj po restarcie."; exit 2; }
    systemctl restart postgresql clamav-daemon nginx edziennik-kla cloudflared
    echo "Serwer został ponownie uruchomiony."
    ;;
  backup)
    /usr/local/sbin/edziennik-kla-backup
    echo "Szyfrowana kopia została utworzona."
    ;;
  restore-test)
    /usr/local/sbin/edziennik-kla-restore-test-latest
    ;;
  backup-download-prepare)
    mountpoint -q /srv/kla-vault || { echo "Sejf jest zamknięty."; exit 2; }
    LATEST_BACKUP="$(find /srv/kla-vault/backups -maxdepth 1 -type f -name 'kla-*.tar.age' -print | sort | tail -n1)"
    [[ -f "$LATEST_BACKUP" && -f "$LATEST_BACKUP.sha256" ]] || { echo "Brak kompletnej kopii do pobrania."; exit 1; }
    (cd "$(dirname "$LATEST_BACKUP")" && sha256sum -c "$(basename "$LATEST_BACKUP").sha256" >/dev/null)
    CONTROL_USER="$(cat /etc/kla/control-user)"
    DOWNLOAD_DIR="$INCOMING/downloads"
    install -d -m 700 -o "$CONTROL_USER" -g "$CONTROL_USER" "$DOWNLOAD_DIR"
    find "$DOWNLOAD_DIR" -mindepth 1 -maxdepth 1 -type f -delete
    install -m 600 -o "$CONTROL_USER" -g "$CONTROL_USER" \
      "$LATEST_BACKUP" "$LATEST_BACKUP.sha256" "$DOWNLOAD_DIR/"
    basename "$LATEST_BACKUP"
    ;;
  backup-download-cleanup)
    DOWNLOAD_NAME="${2:-}"
    [[ "$DOWNLOAD_NAME" =~ ^kla-[0-9]{8}T[0-9]{6}Z\.tar\.age$ ]] || { echo "Niepoprawna nazwa kopii."; exit 2; }
    rm -f -- "$INCOMING/downloads/$DOWNLOAD_NAME" "$INCOMING/downloads/$DOWNLOAD_NAME.sha256"
    echo "Pliki tymczasowe usunięte z kolejki pobierania."
    ;;
  recovery-key-once)
    exec /usr/local/sbin/edziennik-kla-print-recovery-key
    ;;
  auto-unlock-enable)
    exec /usr/local/sbin/kla-enable-auto-unlock
    ;;
  refresh-operations)
    refresh_operations
    ;;
  optimize-now)
    PG_VERSION="$(pg_lsclusters --no-header | awk 'NR == 1 {print $1}')"
    [[ -n "$PG_VERSION" ]] || { echo "Nie znaleziono PostgreSQL."; exit 1; }
    SUDO_USER="$(cat /etc/kla/control-user)" /usr/local/sbin/kla-optimize-server "$PG_VERSION"
    ;;
  benchmark-readonly)
    exec /usr/local/sbin/kla-benchmark-readonly
    ;;
  startup-audit)
    exec /usr/local/sbin/kla-startup-audit
    ;;
  prepare-memory-limits)
    exec /usr/local/sbin/kla-prepare-memory-limits
    ;;
  logs)
    journalctl -u edziennik-kla -u cloudflared --since "2 hours ago" --no-pager -n 400
    ;;
  email-config)
    EMAIL_INPUT="$INCOMING/email.env"
    [[ -f "$EMAIL_INPUT" ]] || { echo "Brak bezpiecznie przesłanej konfiguracji e-mail."; exit 1; }
    [[ "$(stat -c '%U' "$EMAIL_INPUT")" == "$(cat /etc/kla/control-user)" ]] || { echo "Nieprawidłowy właściciel konfiguracji."; exit 1; }
    PROVIDER="$(sed -n 's/^EMAIL_PROVIDER=//p' "$EMAIL_INPUT" | head -n1)"
    FROM="$(sed -n 's/^EMAIL_FROM=//p' "$EMAIL_INPUT" | head -n1)"
    [[ "$FROM" == *"@"* ]] || { echo "Niepoprawny nadawca."; exit 1; }
    RESEND_KEY="$(sed -n 's/^RESEND_API_KEY=//p' "$EMAIL_INPUT" | head -n1)"
    SMTP_HOST_VALUE="$(sed -n 's/^SMTP_HOST=//p' "$EMAIL_INPUT" | head -n1)"
    SMTP_PORT_VALUE="$(sed -n 's/^SMTP_PORT=//p' "$EMAIL_INPUT" | head -n1)"
    SMTP_USER_VALUE="$(sed -n 's/^SMTP_USER=//p' "$EMAIL_INPUT" | head -n1)"
    SMTP_PASSWORD_VALUE="$(sed -n 's/^SMTP_PASSWORD=//p' "$EMAIL_INPUT" | head -n1)"
    if [[ "$PROVIDER" == "resend" ]]; then
      [[ "$RESEND_KEY" == re_* ]] || { echo "Niepoprawny klucz Resend."; exit 1; }
    elif [[ "$PROVIDER" == "smtp" ]]; then
      [[ "$SMTP_HOST_VALUE" =~ ^[A-Za-z0-9.-]+$ ]] || { echo "Niepoprawny host SMTP."; exit 1; }
      [[ "$SMTP_PORT_VALUE" == "465" || "$SMTP_PORT_VALUE" == "587" ]] || { echo "Dozwolony port SMTP: 465 albo 587."; exit 1; }
      [[ -n "$SMTP_USER_VALUE" && -n "$SMTP_PASSWORD_VALUE" ]] || { echo "Brak loginu albo hasła SMTP."; exit 1; }
    else
      echo "Nieznany dostawca poczty."
      exit 1
    fi
    ENV_FILE=/srv/kla-vault/secrets/edziennik.env
    TEMP_ENV="$(mktemp /srv/kla-vault/secrets/email-config.XXXXXX)"
    grep -vE '^(EMAIL_PROVIDER|EMAIL_FROM|RESEND_API_KEY|SMTP_HOST|SMTP_PORT|SMTP_USER|SMTP_PASSWORD)=' "$ENV_FILE" > "$TEMP_ENV"
    printf 'EMAIL_PROVIDER=%q\nEMAIL_FROM=%q\nRESEND_API_KEY=%q\nSMTP_HOST=%q\nSMTP_PORT=%q\nSMTP_USER=%q\nSMTP_PASSWORD=%q\n' \
      "$PROVIDER" "$FROM" "$RESEND_KEY" "$SMTP_HOST_VALUE" "$SMTP_PORT_VALUE" "$SMTP_USER_VALUE" "$SMTP_PASSWORD_VALUE" >> "$TEMP_ENV"
    chown root:kla "$TEMP_ENV"
    chmod 640 "$TEMP_ENV"
    mv "$TEMP_ENV" "$ENV_FILE"
    rm -f "$EMAIL_INPUT"
    systemctl restart edziennik-kla
    echo "Wysyłka e-mail została skonfigurowana. Ostateczny test wykona link aktywacyjny."
    ;;
  bootstrap-code)
    CODE="$(openssl rand -base64 32 | tr -d '/+=')"
    CODE_HASH="$(printf '%s' "$CODE" | sha256sum | awk '{print $1}')"
    ENV_FILE=/srv/kla-vault/secrets/edziennik.env
    TEMP_ENV="$(mktemp /srv/kla-vault/secrets/bootstrap.XXXXXX)"
    grep -v '^KLA_BOOTSTRAP_TOKEN_HASH=' "$ENV_FILE" > "$TEMP_ENV"
    printf 'KLA_BOOTSTRAP_TOKEN_HASH=%s\n' "$CODE_HASH" >> "$TEMP_ENV"
    chown root:kla "$TEMP_ENV"
    chmod 640 "$TEMP_ENV"
    mv "$TEMP_ENV" "$ENV_FILE"
    systemctl restart edziennik-kla
    printf '%s\n' "$CODE"
    ;;
  update)
    [[ -f "$ARCHIVE" ]] || { echo "Brak przesłanej paczki aktualizacji."; exit 1; }
    [[ "$(stat -c '%U' "$ARCHIVE")" == "$(cat /etc/kla/control-user)" ]] || { echo "Nieprawidłowy właściciel paczki."; exit 1; }
    TEMP_UPDATE="$(mktemp -d "$INCOMING/update.XXXXXX")"
    trap 'rm -rf "$TEMP_UPDATE"' EXIT
    SAFE_ARCHIVE="$TEMP_UPDATE/release.tar.gz"
    install -m 600 -o root -g root "$ARCHIVE" "$SAFE_ARCHIVE"
    python3 - "$SAFE_ARCHIVE" <<'PY'
import pathlib, sys, tarfile
archive = pathlib.Path(sys.argv[1])
with tarfile.open(archive, "r:gz") as package:
    total = 0
    for member in package.getmembers():
        path = pathlib.PurePosixPath(member.name)
        if path.is_absolute() or ".." in path.parts or not path.parts or path.parts[0] != "edziennik-kla":
            raise SystemExit("Paczka zawiera niedozwoloną ścieżkę.")
        if member.issym() or member.islnk() or member.isdev() or member.isfifo():
            raise SystemExit("Paczka zawiera niedozwolony typ pliku.")
        total += max(member.size, 0)
        if total > 2 * 1024 * 1024 * 1024:
            raise SystemExit("Paczka po rozpakowaniu jest za duża.")
PY
    tar --no-same-owner --no-same-permissions -xzf "$SAFE_ARCHIVE" -C "$TEMP_UPDATE"
    SOURCE="$TEMP_UPDATE/edziennik-kla"
    [[ -f "$SOURCE/KLA_RELEASE_MANIFEST.sha256" && -f "$SOURCE/KLA_RELEASE_MANIFEST.sha256.sig" ]] || { echo "To nie jest podpisana paczka KLA."; exit 1; }
    /usr/local/sbin/kla-update "$SOURCE"
    rm -f "$ARCHIVE"
    ;;
  reboot)
    systemctl reboot
    ;;
  poweroff)
    systemctl poweroff
    ;;
  *)
    echo "Dozwolone akcje: status, start, stop, restart, backup, restore-test, backup-download-prepare, backup-download-cleanup, recovery-key-once, auto-unlock-enable, refresh-operations, optimize-now, benchmark-readonly, startup-audit, prepare-memory-limits, logs, email-config, bootstrap-code, update, reboot, poweroff."
    exit 2
    ;;
esac
