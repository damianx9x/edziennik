#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

[[ ${EUID} -eq 0 ]] || { echo "To polecenie wymaga kontrolowanego sudo."; exit 1; }
ACTION="${1:-status}"
INCOMING=/srv/kla-vault/control-incoming
ARCHIVE="$INCOMING/edziennik-kla-raspberry-source.tar.gz"

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
    if tar -tzf "$ARCHIVE" | grep -Eq '(^/|(^|/)\.\.(/|$))'; then
      echo "Paczka zawiera niedozwoloną ścieżkę."
      exit 1
    fi
    TEMP_UPDATE="$(mktemp -d "$INCOMING/update.XXXXXX")"
    trap 'rm -rf "$TEMP_UPDATE"' EXIT
    tar -xzf "$ARCHIVE" -C "$TEMP_UPDATE"
    SOURCE="$TEMP_UPDATE/edziennik-kla"
    [[ -f "$SOURCE/KLA_RELEASE_MANIFEST.sha256" ]] || { echo "To nie jest podpisana paczka KLA."; exit 1; }
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
    echo "Dozwolone akcje: status, start, stop, restart, backup, restore-test, logs, email-config, bootstrap-code, update, reboot, poweroff."
    exit 2
    ;;
esac
