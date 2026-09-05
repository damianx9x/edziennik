#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ ${EUID} -eq 0 ]] || exit 1

# Debian 13 split this generator out of the base systemd package.
if [[ ! -x /usr/lib/systemd/system-generators/systemd-cryptsetup-generator ]]; then
  apt-get update
  apt-get install -y --no-install-recommends systemd-cryptsetup
fi
[[ -x /usr/lib/systemd/system-generators/systemd-cryptsetup-generator ]] || { echo 'Brak obsługi crypttab przez systemd.' >&2; exit 1; }

# Preserve installations whose operator deliberately chose manual unlock.
if [[ -f /etc/kla/vault-auto-unlock.key ]] && [[ -f /etc/kla/vault.conf ]]; then
  source /etc/kla/vault.conf
  [[ "${KLA_VAULT_MAPPER:-}" == 'kla-data' && "${KLA_VAULT_MOUNT:-}" == '/srv/kla-vault' ]] || { echo 'Nieznana konfiguracja sejfu — bez zmian.' >&2; exit 1; }
  [[ "$(stat -c '%U:%G:%a' /etc/kla/vault-auto-unlock.key)" == 'root:root:600' ]] || { echo 'Nieprawidłowe uprawnienia klucza startowego.' >&2; exit 1; }
  grep -qE '^kla-data[[:space:]].*/etc/kla/vault-auto-unlock.key[[:space:]]' /etc/crypttab || { echo 'Brak kontrolowanej konfiguracji crypttab.' >&2; exit 1; }
  [[ -f /etc/fstab.kla-before-startup-fix ]] || cp -p /etc/fstab /etc/fstab.kla-before-startup-fix
  # Mapper reference lets systemd attach the cryptsetup dependency explicitly.
  sed -i '\|[[:space:]]/srv/kla-vault[[:space:]]|d' /etc/fstab
  printf '/dev/mapper/kla-data /srv/kla-vault ext4 noatime,nodiratime,nofail,x-systemd.device-timeout=180 0 2\n' >> /etc/fstab
fi
systemctl daemon-reload
echo 'Obsługa szyfrowanego dysku przy starcie została sprawdzona; oczekiwanie do 180 sekund.'
