#!/usr/bin/env bash
set -Eeuo pipefail
mountpoint -q /srv/kla-vault || exit 0
if ! curl --fail --silent --show-error --max-time 10 http://127.0.0.1:3000/ >/dev/null; then
  logger -t edziennik-kla "Kontrola HTTP nie przeszła; restartuję usługę."
  systemctl restart edziennik-kla
  sleep 3
  curl --fail --silent --show-error --max-time 10 http://127.0.0.1:3000/ >/dev/null
fi
