#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

if [[ ${EUID} -ne 0 ]]; then
  echo "Uruchom: sudo ./raspberry/vault-create-partition.sh /dev/sdXN"
  exit 1
fi

PARTITION="${1:-}"
[[ -b "$PARTITION" ]] || { echo "Wskaż nową partycję, np. /dev/sda3."; exit 1; }
[[ "$(lsblk -dnro TYPE "$PARTITION")" == "part" ]] || {
  echo "Odmowa: wymagany jest numer partycji, nie cały dysk."
  exit 1
}

ROOT_SOURCE="$(findmnt -nro SOURCE /)"
ROOT_PARENT="/dev/$(lsblk -nro PKNAME "$ROOT_SOURCE" 2>/dev/null | head -n1)"
PART_PARENT="/dev/$(lsblk -nro PKNAME "$PARTITION")"
[[ "$PART_PARENT" != "$ROOT_PARENT" ]] || {
  echo "ODMOWA: wybrano partycję dysku systemowego Raspberry Pi."
  exit 1
}
findmnt -rn -S "$PARTITION" | grep -q . && {
  echo "Odmowa: partycja jest zamontowana. Odmontuj ją i spróbuj ponownie."
  exit 1
}

PARTITION_SIZE_BYTES="$(lsblk -bdnro SIZE "$PARTITION")"
(( PARTITION_SIZE_BYTES >= 40 * 1024 * 1024 * 1024 )) || {
  echo "Partycja KLA musi mieć co najmniej 40 GiB."
  exit 1
}
PARTITION_NAME="$(lsblk -dnro PARTLABEL,LABEL "$PARTITION" | xargs)"
[[ "${PARTITION_NAME^^}" == *KLA_DATA* ]] || {
  echo "Odmowa: partycja musi mieć etykietę KLA_DATA."
  echo "To zabezpieczenie przed wybraniem istniejącej partycji z danymi."
  exit 1
}

echo
lsblk -o NAME,PATH,SIZE,FSTYPE,LABEL,PARTLABEL,MODEL,TRAN "$PARTITION" "$PART_PARENT"
echo "Zaszyfrowana zostanie WYŁĄCZNIE nowa partycja $PARTITION."
echo "Pozostałe partycje na $PART_PARENT nie zostaną zmienione."
read -r -p "Wpisz dokładnie SZYFRUJ $PARTITION: " CONFIRM
[[ "$CONFIRM" == "SZYFRUJ $PARTITION" ]] || { echo "Anulowano."; exit 1; }

read -r -s -p "Ustal hasło odblokowania sejfu (min. 16 znaków): " PASSPHRASE
echo
read -r -s -p "Powtórz hasło: " PASSPHRASE_CONFIRM
echo
[[ "$PASSPHRASE" == "$PASSPHRASE_CONFIRM" ]] || { echo "Hasła są różne."; exit 1; }
[[ ${#PASSPHRASE} -ge 16 ]] || { echo "Hasło musi mieć co najmniej 16 znaków."; exit 1; }

RECOVERY_KEY="$(openssl rand -base64 48 | tr -d '\n')"
TEMP_KEY="$(mktemp /dev/shm/kla-recovery.XXXXXX)"
trap 'rm -f "$TEMP_KEY"; unset PASSPHRASE PASSPHRASE_CONFIRM RECOVERY_KEY' EXIT
printf '%s' "$RECOVERY_KEY" > "$TEMP_KEY"

wipefs --all "$PARTITION"
printf '%s' "$PASSPHRASE" | cryptsetup luksFormat --type luks2 --batch-mode --key-file - "$PARTITION"
printf '%s' "$PASSPHRASE" | cryptsetup luksOpen --key-file - "$PARTITION" kla-data
printf '%s' "$PASSPHRASE" | cryptsetup luksAddKey --key-file - "$PARTITION" "$TEMP_KEY"
mkfs.ext4 -L KLA_VAULT /dev/mapper/kla-data
install -d -m 700 /srv/kla-vault
mount /dev/mapper/kla-data /srv/kla-vault
install -d -m 700 /srv/kla-vault/{postgresql,private-files,backups,secrets,restore-tests}
chown -R root:root /srv/kla-vault

UUID="$(cryptsetup luksUUID "$PARTITION")"
install -d -m 700 /etc/kla
printf 'KLA_LUKS_UUID=%s\nKLA_VAULT_DEVICE=%s\nKLA_VAULT_MAPPER=kla-data\nKLA_VAULT_MOUNT=/srv/kla-vault\n' \
  "$UUID" "$PARTITION" > /etc/kla/vault.conf
chmod 600 /etc/kla/vault.conf

clear || true
echo "================================================================"
echo "KLUCZ ODZYSKIWANIA SEJFU KLA — POKAZANY TYLKO TERAZ"
echo
echo "$RECOVERY_KEY"
echo
echo "Zapisz go w menedżerze haseł i na papierze poza Raspberry Pi."
echo "================================================================"
read -r -p "Po zapisaniu klucza wpisz MAM KOPIE: " SAVED
[[ "$SAVED" == "MAM KOPIE" ]] || {
  echo "Instalacja przerwana. Sejf istnieje, ale nie zapisano aplikacji."
  exit 1
}

echo "Szyfrowany sejf jest gotowy: /srv/kla-vault"
