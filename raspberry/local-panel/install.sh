#!/usr/bin/env bash
set -Eeuo pipefail
[[ $EUID != 0 ]] || { echo 'Uruchom jako użytkownik pulpitu, bez sudo.'; exit 1; }
SOURCE="$(cd "$(dirname "$0")" && pwd)"
TARGET="$HOME/.local/share/kla-local-panel"
command -v chromium >/dev/null
command -v python3 >/dev/null
mkdir -p "$TARGET" "$HOME/.config/systemd/user" "$HOME/.config/autostart" "$HOME/.local/share/applications"
if [[ -d "$TARGET/current" ]]; then
  cp -a "$TARGET/current" "$TARGET/previous-$(date +%s)"
fi
mkdir -p "$TARGET/current"
for file in server.py index.html panel.js panel.css open.sh; do install -m 700 "$SOURCE/$file" "$TARGET/current/$file"; done
python3 - "$TARGET" <<'PY'
from pathlib import Path
import sys
target = Path(sys.argv[1])
home = Path.home()
# systemd escapes are not shell escapes. Reject unusual installation paths.
if any(c in str(target) for c in '\n\r"%\\'):
    raise SystemExit('Nieobsługiwana ścieżka instalacji.')
unit = '''[Unit]
Description=KLA local control panel
[Service]
Type=simple
ExecStart=/usr/bin/python3 "%s/current/server.py"
Restart=on-failure
RestartSec=3
UMask=0077
[Install]
WantedBy=default.target
''' % target
(home / '.config/systemd/user/kla-local-panel.service').write_text(unit)
desktop = '''[Desktop Entry]
Type=Application
Name=KLA — serwer
Comment=Lokalny panel kontroli Raspberry
Exec="%s/current/open.sh"
Icon=network-server
Terminal=false
Categories=System;
''' % target
for folder in ('.config/autostart', '.local/share/applications'):
    (home / folder / 'kla-local-panel.desktop').write_text(desktop)
desktop_dir = home / 'Desktop'
if desktop_dir.is_dir():
    entry = desktop_dir / 'kla-local-panel.desktop'
    entry.write_text(desktop)
    entry.chmod(0o755)
PY
systemctl --user daemon-reload
systemctl --user enable kla-local-panel.service
systemctl --user restart kla-local-panel.service
echo 'Panel zainstalowany. Otwórz KLA — serwer z menu lub pulpitu. Autostart działa po zalogowaniu pulpitu.'
