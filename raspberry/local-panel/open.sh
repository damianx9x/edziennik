#!/usr/bin/env bash
set -Eeuo pipefail
systemctl --user start kla-local-panel.service
LAUNCH="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/kla-local-panel/open.html"
for attempt in {1..30}; do
  if [[ -s "$LAUNCH" ]] && curl -fsS --max-time 2 http://127.0.0.1:8765/ >/dev/null; then
    # Dedicated console profile has no saved passwords. Avoid a first-run
    # desktop keyring prompt blocking unattended startup; never use this
    # profile for school login or general browsing.
    exec /usr/bin/chromium --app="file://$LAUNCH" --start-maximized --no-first-run --password-store=basic --user-data-dir="$HOME/.local/share/kla-local-panel-browser"
  fi
  sleep 1
done
notify-send 'KLA — serwer' 'Panel nie wystartował. Sprawdź: systemctl --user status kla-local-panel' || true
exit 1
