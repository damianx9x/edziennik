#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Uruchom ten skrypt przez instalator lub: sudo ./raspberry/optimize-server.sh WERSJA_POSTGRESQL"
  exit 1
fi

PG_VERSION="${1:-}"
[[ "$PG_VERSION" =~ ^[0-9]+$ ]] || { echo "Brak prawidłowej wersji PostgreSQL."; exit 1; }
PG_CONF_DIR="/etc/postgresql/$PG_VERSION/main/conf.d"
[[ -d "/etc/postgresql/$PG_VERSION/main" ]] || { echo "Nie znaleziono klastra PostgreSQL $PG_VERSION."; exit 1; }

timedatectl set-timezone Europe/Warsaw
timedatectl set-ntp true

install -d -m 0755 /etc/sysctl.d
printf '%s\n' \
  'fs.file-max = 2097152' \
  'fs.protected_fifos = 2' \
  'fs.protected_hardlinks = 1' \
  'fs.protected_regular = 2' \
  'fs.protected_symlinks = 1' \
  'kernel.dmesg_restrict = 1' \
  'kernel.kptr_restrict = 2' \
  'net.core.somaxconn = 1024' \
  'net.ipv4.conf.all.accept_redirects = 0' \
  'net.ipv4.conf.all.accept_source_route = 0' \
  'net.ipv4.conf.all.send_redirects = 0' \
  'net.ipv4.conf.default.accept_redirects = 0' \
  'net.ipv4.conf.default.accept_source_route = 0' \
  'net.ipv4.tcp_syncookies = 1' \
  'vm.dirty_background_bytes = 67108864' \
  'vm.dirty_bytes = 268435456' \
  'vm.vfs_cache_pressure = 75' \
  > /etc/sysctl.d/90-kla-server.conf
sysctl --system >/dev/null

install -d -m 0755 /etc/systemd/journald.conf.d
printf '%s\n' \
  '[Journal]' \
  'Compress=yes' \
  'SystemMaxUse=256M' \
  'RuntimeMaxUse=64M' \
  'MaxRetentionSec=14day' \
  'RateLimitIntervalSec=30s' \
  'RateLimitBurst=1000' \
  > /etc/systemd/journald.conf.d/50-kla.conf

ADMIN_USER="${SUDO_USER:-}"
[[ "$ADMIN_USER" =~ ^[a-z_][a-z0-9_-]*$ ]] || {
  echo "Nie udało się bezpiecznie ustalić użytkownika administracyjnego."
  exit 1
}
install -d -m 0755 /etc/ssh/sshd_config.d
printf '%s\n' \
  'PermitRootLogin no' \
  'PasswordAuthentication yes' \
  'KbdInteractiveAuthentication no' \
  'X11Forwarding no' \
  'MaxAuthTries 4' \
  'LoginGraceTime 30' \
  'ClientAliveInterval 300' \
  'ClientAliveCountMax 2' \
  "AllowUsers $ADMIN_USER" \
  > /etc/ssh/sshd_config.d/50-kla.conf
sshd -t

install -d -m 0755 "$PG_CONF_DIR"
printf '%s\n' \
  "listen_addresses = '127.0.0.1'" \
  'max_connections = 40' \
  'shared_buffers = 512MB' \
  'effective_cache_size = 1536MB' \
  'maintenance_work_mem = 128MB' \
  'work_mem = 8MB' \
  'wal_compression = on' \
  'checkpoint_completion_target = 0.9' \
  'checkpoint_timeout = 15min' \
  'max_wal_size = 1GB' \
  'random_page_cost = 1.1' \
  'effective_io_concurrency = 100' \
  'default_statistics_target = 100' \
  'jit = off' \
  'track_io_timing = on' \
  'password_encryption = scram-sha-256' \
  'log_min_duration_statement = -1' \
  'log_connections = off' \
  'log_disconnections = off' \
  > "$PG_CONF_DIR/90-kla.conf"
chmod 0644 "$PG_CONF_DIR/90-kla.conf"

sed -i \
  -e 's/^#\?MaxThreads .*/MaxThreads 2/' \
  -e 's/^#\?MaxScanSize .*/MaxScanSize 25M/' \
  -e 's/^#\?MaxFileSize .*/MaxFileSize 25M/' \
  -e 's/^#\?StreamMaxLength .*/StreamMaxLength 25M/' \
  /etc/clamav/clamd.conf

systemctl restart systemd-journald
systemctl reload ssh
echo "Optymalizacja Raspberry Pi została zastosowana."
