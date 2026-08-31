#!/usr/bin/env bash
set -Eeuo pipefail

[[ ${EUID} -eq 0 ]] || {
  echo "Uruchom przez instalator albo kontrolowaną aktualizację." >&2
  exit 1
}

# Zachowaj historię potrzebną do diagnozy nagłego zaniku zasilania.
install -d -m 2755 -o root -g systemd-journal /var/log/journal
install -d -m 0755 /etc/systemd/journald.conf.d
cat > /etc/systemd/journald.conf.d/50-kla.conf <<'EOF'
[Journal]
Storage=persistent
Compress=yes
SystemMaxUse=256M
RuntimeMaxUse=64M
MaxRetentionSec=14day
RateLimitIntervalSec=30s
RateLimitBurst=1000
EOF

# Watchdog sprzętowy odzyskuje całe urządzenie po zawieszeniu kernela lub PID 1.
install -d -m 0755 /etc/systemd/system.conf.d
if [[ -c /dev/watchdog || -c /dev/watchdog0 ]]; then
  cat > /etc/systemd/system.conf.d/50-kla-watchdog.conf <<'EOF'
[Manager]
RuntimeWatchdogSec=30s
RebootWatchdogSec=5min
EOF
fi

# Polityka tunelu pozostaje w lokalnym drop-inie mimo aktualizacji pakietu.
if systemctl list-unit-files cloudflared.service --no-legend 2>/dev/null | grep -q '^cloudflared.service'; then
  install -d -m 0755 /etc/systemd/system/cloudflared.service.d
  cat > /etc/systemd/system/cloudflared.service.d/50-kla-restart.conf <<'EOF'
[Unit]
StartLimitIntervalSec=120s
StartLimitBurst=10

[Service]
Restart=always
RestartSec=5s
EOF
fi

systemctl daemon-reload
systemctl daemon-reexec
systemctl restart systemd-journald
systemctl try-restart cloudflared.service >/dev/null 2>&1 || true

echo "Trwałe logi, sprzętowy watchdog i polityka restartu tunelu są aktywne."
