#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

if [[ ${EUID} -ne 0 ]]; then
  echo "Uruchom: sudo ./raspberry/vault-create.sh /dev/sdX"
  exit 1
fi

DEVICE="${1:-}"
[[ -b "$DEVICE" ]] || { echo "Wskaż cały zewnętrzny dysk, np. /dev/sda."; exit 1; }
[[ "$(lsblk -dnro TYPE "$DEVICE")" == "disk" ]] || { echo "To nie jest cały dysk."; exit 1; }

ROOT_SOURCE="$(findmnt -nro SOURCE /)"
ROOT_PARENT="/dev/$(lsblk -nro PKNAME "$ROOT_SOURCE" 2>/dev/null | head -n1)"
if [[ "$DEVICE" == "$ROOT_SOURCE" || "$DEVICE" == "$ROOT_PARENT" ]]; then
  echo "ODMOWA: wybrano dysk systemowy Raspberry Pi. Nic nie zmieniono."
  exit 1
fi

if lsblk -nrpo MOUNTPOINT "$DEVICE" | grep -qE '/.+'; then
  echo "Na wybranym dysku są zamontowane partycje. Odmontuj je i spróbuj ponownie."
  exit 1
fi

echo
lsblk -dpo NAME,SIZE,MODEL,TRAN "$DEVICE"
echo "UWAGA: wszystkie dane z $DEVICE zostaną bezpowrotnie usunięte."
read -r -p "Wpisz dokładnie USUN DANE Z $DEVICE: " CONFIRM
[[ "$CONFIRM" == "USUN DANE Z $DEVICE" ]] || { echo "Anulowano."; exit 1; }

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

wipefs --all "$DEVICE"
parted --script "$DEVICE" mklabel gpt mkpart KLA-VAULT 1MiB 100%
partprobe "$DEVICE"
udevadm settle
PARTITION="$(lsblk -nrpo NAME,TYPE "$DEVICE" | awk '$2 == "part" {print $1; exit}')"
[[ -b "$PARTITION" ]] || { echo "Nie udało się utworzyć partycji."; exit 1; }

printf '%s' "$PASSPHRASE" | cryptsetup luksFormat --type luks2 --batch-mode --key-file - "$PARTITION"
printf '%s' "$PASSPHRASE" | cryptsetup luksOpen --key-file - "$PARTITION" kla-data
printf '%s' "$PASSPHRASE" | cryptsetup luksAddKey --key-file - "$PARTITION" "$TEMP_KEY"
mkfs.ext4 -L KLA_VAULT /dev/mapper/kla-data
# Rodzic katalogu pozwala przejść wyłącznie do znanej ścieżki. Nie pozwala go
# listować; właściwe dane i sekrety pozostają w podkatalogach root-only 0700.
install -d -m 711 /srv/kla-vault
mount /dev/mapper/kla-data /srv/kla-vault
install -d -m 700 /srv/kla-vault/{postgresql,private-files,backups,secrets,restore-tests}
chown -R root:root /srv/kla-vault
chmod 711 /srv/kla-vault

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
echo "Nie rób zdjęcia telefonem i nie wysyłaj go e-mailem."
echo "================================================================"
read -r -p "Po zapisaniu klucza wpisz MAM KOPIE: " SAVED
[[ "$SAVED" == "MAM KOPIE" ]] || {
  echo "Instalacja przerwana. Sejf istnieje, ale nie zapisano aplikacji."
  exit 1
}

echo "Szyfrowany sejf jest gotowy: /srv/kla-vault"
