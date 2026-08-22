#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

if [[ ${EUID} -ne 0 ]]; then echo "Uruchom: sudo kla-configure-sftp-backup"; exit 1; fi
mountpoint -q /srv/kla-vault || { echo "Najpierw: sudo kla-unlock"; exit 1; }

read -r -p "Adres serwera SFTP: " HOST
read -r -p "Port [22]: " PORT
read -r -p "Login SFTP: " USERNAME
read -r -p "Zdalny folder [kla-backups]: " REMOTE_PATH
PORT="${PORT:-22}"
REMOTE_PATH="${REMOTE_PATH:-kla-backups}"
[[ "$HOST" =~ ^[A-Za-z0-9.-]+$ ]] || { echo "Nieprawidłowy adres."; exit 1; }
[[ "$PORT" =~ ^[0-9]{1,5}$ ]] || { echo "Nieprawidłowy port."; exit 1; }
[[ "$USERNAME" =~ ^[A-Za-z0-9._-]+$ ]] || { echo "Nieprawidłowy login."; exit 1; }
[[ "$REMOTE_PATH" =~ ^[A-Za-z0-9._/-]+$ && "$REMOTE_PATH" != /* && "$REMOTE_PATH" != *..* ]] || { echo "Folder musi być ścieżką względną bez '..'."; exit 1; }

KEY=/srv/kla-vault/secrets/sftp-backup-key
[[ -f "$KEY" ]] || ssh-keygen -q -t ed25519 -N '' -C 'kla-backup' -f "$KEY"
chmod 600 "$KEY"
ssh-keyscan -p "$PORT" -H "$HOST" > /srv/kla-vault/secrets/sftp-known-hosts
chmod 600 /srv/kla-vault/secrets/sftp-known-hosts
echo "Odcisk klucza serwera SFTP (porównaj z panelem dostawcy):"
ssh-keygen -lf /srv/kla-vault/secrets/sftp-known-hosts
read -r -p "Jeżeli odcisk jest zgodny, wpisz ZGODNY: " HOST_CONFIRMED
[[ "$HOST_CONFIRMED" == "ZGODNY" ]] || { echo "Nie zapisano konfiguracji SFTP."; exit 1; }
cat > /etc/kla/backup-sftp.env <<EOF
KLA_SFTP_HOST=$HOST
KLA_SFTP_PORT=$PORT
KLA_SFTP_USER=$USERNAME
KLA_SFTP_PATH=$REMOTE_PATH
EOF
chmod 600 /etc/kla/backup-sftp.env

echo
echo "Dodaj poniższy klucz publiczny w panelu konta SFTP (tylko zapis do folderu kopii):"
cat "$KEY.pub"
echo
echo "Potem uruchom test: sudo edziennik-kla-backup --test-restore"
