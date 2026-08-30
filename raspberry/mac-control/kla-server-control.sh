#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

CONFIG_DIR="$HOME/.config/kla-server"
CONFIG_FILE="$CONFIG_DIR/control.env"
DEFAULT_KEY="$HOME/.ssh/kla_raspberry_ed25519"
mkdir -p "$CONFIG_DIR"

KLA_HOST="kingslanguageacademy.local"
KLA_PORT="22"
KLA_USER="icex"
KLA_KEY="$DEFAULT_KEY"
if [[ -f "$CONFIG_FILE" ]]; then
  # Plik jest tworzony wyłącznie przez ten skrypt i zawiera po jednej wartości.
  source "$CONFIG_FILE"
fi

build_connection_options() {
  SSH_OPTIONS=(
    -i "$KLA_KEY"
    -p "$KLA_PORT"
    -o BatchMode=yes
    -o ConnectTimeout=5
    -o ServerAliveInterval=15
    -o ServerAliveCountMax=3
    -o StrictHostKeyChecking=accept-new
  )
  SCP_OPTIONS=(
    -i "$KLA_KEY"
    -P "$KLA_PORT"
    -o BatchMode=yes
    -o ConnectTimeout=5
    -o ServerAliveInterval=15
    -o ServerAliveCountMax=3
    -o StrictHostKeyChecking=accept-new
  )
}

is_kla_host() {
  local candidate="$1"
  ssh "${SSH_OPTIONS[@]}" "$KLA_USER@$candidate" '[[ "$(hostname)" == "kingslanguageacademy" ]]' >/dev/null 2>&1
}

discover_host() {
  local configured_host="$KLA_HOST" interface local_ip subnet candidate
  build_connection_options
  if is_kla_host "$configured_host"; then
    return 0
  fi
  if [[ "$configured_host" != "kingslanguageacademy.local" ]] && is_kla_host "kingslanguageacademy.local"; then
    KLA_HOST="kingslanguageacademy.local"
    build_connection_options
    return 0
  fi

  interface="$(route -n get default 2>/dev/null | awk '/interface:/{print $2; exit}')"
  local_ip="$(ipconfig getifaddr "$interface" 2>/dev/null || true)"
  [[ "$local_ip" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] || {
    echo "Nie mogę ustalić sieci lokalnej. Użyj w panelu: Ustaw połączenie."
    exit 3
  }
  subnet="${local_ip%.*}"
  echo "Szukam Raspberry w sieci $subnet.0/24…"
  for candidate in $(jot 254 1 | xargs -P 32 -I % sh -c "/usr/bin/nc -z -G 1 '$subnet.%' '$KLA_PORT' >/dev/null 2>&1 && echo '$subnet.%'"); do
    if is_kla_host "$candidate"; then
      KLA_HOST="$candidate"
      build_connection_options
      save_config "$KLA_HOST" "$KLA_PORT" "$KLA_USER" "$KLA_KEY" >/dev/null
      echo "Raspberry odnalezione pod adresem $KLA_HOST. Zapisałem nowy adres."
      return 0
    fi
  done
  echo "Nie znaleziono serwera KLA w tej sieci. Sprawdź zasilanie i kabel, potem spróbuj ponownie."
  exit 3
}

save_config() {
  local host="$1" port="$2" user="$3" key="$4"
  [[ "$host" =~ ^[A-Za-z0-9._-]+$ ]] || { echo "Niepoprawna nazwa hosta."; exit 2; }
  [[ "$port" =~ ^[0-9]{1,5}$ ]] && ((port >= 1 && port <= 65535)) || { echo "Niepoprawny port."; exit 2; }
  [[ "$user" =~ ^[A-Za-z_][A-Za-z0-9_-]*$ ]] || { echo "Niepoprawny użytkownik."; exit 2; }
  [[ -f "$key" ]] || { echo "Nie znaleziono klucza SSH: $key"; exit 2; }
  chmod 600 "$key"
  printf 'KLA_HOST=%q\nKLA_PORT=%q\nKLA_USER=%q\nKLA_KEY=%q\n' "$host" "$port" "$user" "$key" > "$CONFIG_FILE"
  chmod 600 "$CONFIG_FILE"
  echo "Ustawienia zapisane."
}

build_connection_options

remote() {
  [[ -f "$KLA_KEY" ]] || { echo "Brak klucza SSH: $KLA_KEY"; exit 2; }
  discover_host
  ssh "${SSH_OPTIONS[@]}" "$KLA_USER@$KLA_HOST" "$@"
}

ACTION="${1:-status}"
case "$ACTION" in
  configure)
    save_config "${2:-$KLA_HOST}" "${3:-$KLA_PORT}" "${4:-$KLA_USER}" "${5:-$KLA_KEY}"
    ;;
  test)
    remote 'printf "Połączenie SSH działa. Host: "; hostname'
    ;;
  status|start|stop|restart|backup|restore-test|logs|refresh-operations|optimize-now|benchmark-readonly)
    remote "sudo /usr/local/sbin/kla-control $ACTION"
    ;;
  auto-unlock-enable)
    discover_host
    exec ssh -t "${SSH_OPTIONS[@]}" "$KLA_USER@$KLA_HOST" "sudo /usr/local/sbin/kla-control auto-unlock-enable"
    ;;
  unlock)
    discover_host
    exec ssh -t "${SSH_OPTIONS[@]}" "$KLA_USER@$KLA_HOST" "sudo kla-unlock"
    ;;
  local-preview)
    discover_host
    pkill -f "ssh.*127.0.0.1:3100.*$KLA_HOST" 2>/dev/null || true
    ssh -fN "${SSH_OPTIONS[@]}" -L 3100:127.0.0.1:3100 "$KLA_USER@$KLA_HOST"
    open "http://127.0.0.1:3100"
    echo "Lokalny podgląd działa pod http://127.0.0.1:3100"
    ;;
  public-preview)
    open "https://demo.kingslanguageacademy.pl"
    ;;
  email-config)
    discover_host
    echo "Wybierz dostawcę: 1 = zwykły SMTP, 2 = Resend"
    read -r -p "Wybór: " PROVIDER_CHOICE
    read -r -p "Nadawca (np. eDziennik King's <noreply@domena.pl>): " EMAIL_FROM_VALUE
    [[ "$EMAIL_FROM_VALUE" == *"@"* ]] || { echo "Niepoprawny nadawca."; exit 2; }
    TEMP_EMAIL="$(mktemp "${TMPDIR:-/tmp}/kla-email.XXXXXX")"
    trap 'rm -f "$TEMP_EMAIL"' EXIT
    if [[ "$PROVIDER_CHOICE" == "1" ]]; then
      read -r -p "Host SMTP: " SMTP_HOST_VALUE
      read -r -p "Port SMTP (465 lub 587): " SMTP_PORT_VALUE
      read -r -p "Login SMTP: " SMTP_USER_VALUE
      read -r -s -p "Hasło SMTP: " SMTP_PASSWORD_VALUE
      echo
      printf '%s\n' \
        "EMAIL_PROVIDER=smtp" "EMAIL_FROM=$EMAIL_FROM_VALUE" \
        "SMTP_HOST=$SMTP_HOST_VALUE" "SMTP_PORT=$SMTP_PORT_VALUE" \
        "SMTP_USER=$SMTP_USER_VALUE" "SMTP_PASSWORD=$SMTP_PASSWORD_VALUE" \
        > "$TEMP_EMAIL"
    elif [[ "$PROVIDER_CHOICE" == "2" ]]; then
      read -r -s -p "Klucz API Resend: " RESEND_KEY
      echo
      printf '%s\n' \
        "EMAIL_PROVIDER=resend" "EMAIL_FROM=$EMAIL_FROM_VALUE" \
        "RESEND_API_KEY=$RESEND_KEY" > "$TEMP_EMAIL"
    else
      echo "Nieznany wybór."
      exit 2
    fi
    chmod 600 "$TEMP_EMAIL"
    scp "${SCP_OPTIONS[@]}" "$TEMP_EMAIL" "$KLA_USER@$KLA_HOST:/srv/kla-vault/control-incoming/email.env"
    remote "chmod 600 /srv/kla-vault/control-incoming/email.env && sudo /usr/local/sbin/kla-control email-config"
    ;;
  bootstrap-code)
    CODE="$(remote "sudo /usr/local/sbin/kla-control bootstrap-code" | tail -n1)"
    [[ ${#CODE} -ge 32 ]] || { echo "Serwer nie zwrócił poprawnego kodu."; exit 1; }
    security add-generic-password -U -s "KLA Raspberry First Run Code" -a "$KLA_USER" -w "$CODE" >/dev/null
    echo "Nowy kod zapisano bezpiecznie w Pęku kluczy Maca."
    ;;
  copy-bootstrap-code)
    security find-generic-password -s "KLA Raspberry First Run Code" -a "$KLA_USER" -w | pbcopy
    echo "Kod pierwszego uruchomienia skopiowano do schowka."
    ;;
  recovery-key-once)
    discover_host
    DESTINATION="${2:-$HOME/Desktop/rasbery serwer/KLA-KLUCZ-ODZYSKIWANIA.txt}"
    install -d -m 700 "$(dirname "$DESTINATION")"
    TEMP_RECOVERY="$(mktemp)"
    trap 'rm -f "$TEMP_RECOVERY"' EXIT
    chmod 600 "$TEMP_RECOVERY"
    remote "sudo /usr/local/sbin/kla-control recovery-key-once" > "$TEMP_RECOVERY"
    [[ "$(grep -c '^AGE-SECRET-KEY-' "$TEMP_RECOVERY")" -eq 1 ]] || { echo "Serwer nie zwrócił prawidłowego jednorazowego klucza."; exit 1; }
    install -m 600 "$TEMP_RECOVERY" "$DESTINATION"
    echo "Jedyna kopia klucza została zapisana: $DESTINATION"
    echo "Skopiuj ten plik także do menedżera haseł i na zaszyfrowany nośnik poza Raspberry."
    ;;
  update)
    discover_host
    PACKAGE="${2:-}"
    [[ -f "$PACKAGE" ]] || { echo "Wybierz istniejącą paczkę .tar.gz."; exit 2; }
    [[ "$PACKAGE" == *.tar.gz ]] || { echo "Aktualizacja wymaga paczki .tar.gz."; exit 2; }
    scp "${SCP_OPTIONS[@]}" "$PACKAGE" "$KLA_USER@$KLA_HOST:/srv/kla-vault/control-incoming/edziennik-kla-raspberry-source.tar.gz"
    remote "sudo /usr/local/sbin/kla-control update"
    ;;
  reboot|poweroff)
    remote "sudo /usr/local/sbin/kla-control $ACTION"
    ;;
  *)
    echo "Nieznana akcja: $ACTION"
    exit 2
    ;;
esac
