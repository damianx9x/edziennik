#!/usr/bin/env python3
"""Validated, root-owned application maintenance policy; no shell interpolation."""
import json
import os
from pathlib import Path
import subprocess
import sys

POLICY = Path('/etc/kla/restart-policy.json')
TIMER = Path('/etc/systemd/system/edziennik-kla-planned-restart.timer')
DEFAULT = {'frequency': 'off', 'hour': 3, 'minute': 30}


def validate(data):
    if not isinstance(data, dict) or set(data) != set(DEFAULT):
        raise ValueError('Nieprawidłowe pola harmonogramu.')
    if data['frequency'] not in ('off', 'daily', 'weekly'):
        raise ValueError('Wybierz wyłączony, codziennie albo co tydzień.')
    if type(data['hour']) is not int or not 0 <= data['hour'] <= 23:
        raise ValueError('Godzina musi być liczbą od 0 do 23.')
    if type(data['minute']) is not int or not 0 <= data['minute'] <= 59:
        raise ValueError('Minuty muszą być liczbą od 0 do 59.')
    return data


def timer_content(data):
    validate(data)
    day = 'Sun' if data['frequency'] == 'weekly' else '*-*-*'
    return ('[Unit]\nDescription=KLA planned application restart\n\n[Timer]\n'
            f'OnCalendar={day} {data["hour"]:02}:{data["minute"]:02}:00 Europe/Warsaw\n'
            'Persistent=false\nAccuracySec=1min\n'
            'Unit=edziennik-kla-planned-restart.service\n\n'
            '[Install]\nWantedBy=timers.target\n')


def read_policy():
    try:
        return validate(json.loads(POLICY.read_text()))
    except (OSError, ValueError, TypeError):
        return dict(DEFAULT)


def main():
    if len(sys.argv) == 2 and sys.argv[1] == 'status':
        print(json.dumps(read_policy()))
        return
    if os.geteuid() != 0 or sys.argv[1:] != ['configure']:
        raise SystemExit('Wymagane kontrolowane polecenie administratora.')
    data = validate(json.loads(sys.stdin.read(4097)))
    POLICY.parent.mkdir(mode=0o750, parents=True, exist_ok=True)
    old_policy = POLICY.read_bytes() if POLICY.exists() else None
    old_timer = TIMER.read_bytes() if TIMER.exists() else None
    was_enabled = subprocess.run(['systemctl', 'is-enabled', '--quiet', TIMER.name]).returncode == 0
    try:
        TIMER.write_text(timer_content(data))
        TIMER.chmod(0o644)
        subprocess.run(['systemctl', 'daemon-reload'], check=True)
        subprocess.run(['systemctl', 'disable', '--now', TIMER.name], check=True)
        if data['frequency'] != 'off':
            subprocess.run(['systemctl', 'enable', '--now', TIMER.name], check=True)
        temporary = POLICY.with_suffix('.tmp')
        temporary.write_text(json.dumps(data) + '\n')
        temporary.chmod(0o600)
        temporary.replace(POLICY)
    except (OSError, subprocess.SubprocessError):
        subprocess.run(['systemctl', 'disable', '--now', TIMER.name], check=False)
        if old_timer is None:
            TIMER.unlink(missing_ok=True)
        else:
            TIMER.write_bytes(old_timer)
        if old_policy is not None:
            POLICY.write_bytes(old_policy)
        subprocess.run(['systemctl', 'daemon-reload'], check=False)
        if was_enabled:
            subprocess.run(['systemctl', 'enable', '--now', TIMER.name], check=False)
        raise
    print('Harmonogram restartu aplikacji zapisany. Strefa czasu: Polska. Baza i Raspberry nie są restartowane.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, TypeError, OSError, subprocess.SubprocessError):
        raise SystemExit('Nie udało się zapisać harmonogramu. Sprawdź pola i stan usług.')
