#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

[[ ${EUID} -eq 0 ]] || { echo "Uruchom przez kontrolowane sudo." >&2; exit 1; }
source /etc/kla/vault.conf

KEY_FILE=/etc/kla/vault-auto-unlock.key
MAPPER="${KLA_VAULT_MAPPER:-kla-data}"
DEVICE="${KLA_VAULT_DEVICE:-}"
[[ -b "$DEVICE" ]] || DEVICE="$(cryptsetup status "$MAPPER" | sed -n 's/^[[:space:]]*device:[[:space:]]*//p' | head -n1)"
[[ -b "$DEVICE" ]] || { echo "Nie udało się ustalić partycji sejfu." >&2; exit 1; }
cryptsetup status "$MAPPER" >/dev/null 2>&1 || { echo "Sejf musi być teraz odblokowany." >&2; exit 1; }

if [[ ! -f "$KEY_FILE" ]]; then
  TEMP_KEY="$(mktemp /etc/kla/vault-auto-unlock.XXXXXX)"
  TEMP_VOLUME_KEY="$(mktemp /dev/shm/kla-volume-key.XXXXXX)"
  trap 'rm -f "${TEMP_KEY:-}" "${TEMP_VOLUME_KEY:-}"' EXIT
  openssl rand 64 > "$TEMP_KEY"
  chmod 600 "$TEMP_KEY"
  ACTIVE_KEY="$(dmsetup table --showkeys "$MAPPER" | awk '$3 == "crypt" {print $5; exit}')"
  if [[ "$ACTIVE_KEY" =~ ^[0-9a-fA-F]{64,}$ && $((${#ACTIVE_KEY} % 2)) -eq 0 ]]; then
    python3 - "$ACTIVE_KEY" "$TEMP_VOLUME_KEY" <<'PY'
import binascii, sys
with open(sys.argv[2], "wb") as handle:
    handle.write(binascii.unhexlify(sys.argv[1]))
PY
    chmod 600 "$TEMP_VOLUME_KEY"
    cryptsetup luksAddKey "$DEVICE" "$TEMP_KEY" --volume-key-file "$TEMP_VOLUME_KEY"
  elif [[ "$ACTIVE_KEY" =~ ^:[0-9]+:([A-Za-z0-9_-]+):(.+)$ ]]; then
    KEYRING_SPEC="%${BASH_REMATCH[1]}:${BASH_REMATCH[2]}"
    cryptsetup luksAddKey "$DEVICE" --volume-key-keyring "$KEYRING_SPEC" --new-keyfile "$TEMP_KEY"
  elif [[ -t 0 ]]; then
    echo "Jednorazowo wpisz dotychczasowe hasło sejfu. Nie będzie zapisane."
    cryptsetup luksAddKey "$DEVICE" --new-keyfile "$TEMP_KEY"
  else
    echo "System wymaga jednorazowego potwierdzenia hasłem sejfu. Uruchom tę akcję w interaktywnym Terminalu." >&2
    exit 1
  fi
  install -m 600 -o root -g root "$TEMP_KEY" "$KEY_FILE"
fi

cryptsetup open --test-passphrase --key-file "$KEY_FILE" "$DEVICE"
CRYPT_UUID="$(cryptsetup luksUUID "$DEVICE")"
FILESYSTEM_UUID="$(blkid -s UUID -o value "/dev/mapper/$MAPPER")"
[[ -n "$CRYPT_UUID" && -n "$FILESYSTEM_UUID" ]] || { echo "Brak UUID sejfu lub systemu plików." >&2; exit 1; }

sed -i '/^[[:space:]]*kla-data[[:space:]]/d' /etc/crypttab 2>/dev/null || true
printf 'kla-data UUID=%s %s luks,nofail\n' "$CRYPT_UUID" "$KEY_FILE" >> /etc/crypttab
sed -i '\|[[:space:]]/srv/kla-vault[[:space:]]|d' /etc/fstab
printf 'UUID=%s /srv/kla-vault ext4 noatime,nodiratime,nofail,x-systemd.device-timeout=30 0 2\n' "$FILESYSTEM_UUID" >> /etc/fstab
systemctl daemon-reload
echo "Automatyczne odblokowanie po zaniku prądu jest aktywne. Klucz znajduje się na karcie systemowej root-only."
echo "Uwaga: kradzież całego Raspberry razem z dyskiem osłabia ochronę LUKS; pełne eksporty nadal wymagają osobnego klucza age."
