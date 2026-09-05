#!/usr/bin/env python3
"""Prepare the documented Raspberry memory controller flag; never reboot here."""
import os
from pathlib import Path
import sys


def enabled_cmdline(text):
    tokens = text.split()
    if not tokens or not any(item.startswith('root=') for item in tokens):
        raise ValueError('Nieprawidłowa konfiguracja startowa; pozostawiono bez zmian.')
    # Append after firmware defaults; preserve every unrelated boot parameter.
    tokens = [item for item in tokens if item != 'cgroup_enable=memory']
    return ' '.join(tokens + ['cgroup_enable=memory']) + '\n'


def main():
    if os.geteuid() != 0 or len(sys.argv) != 1:
        raise SystemExit('Wymagane kontrolowane polecenie administratora.')
    path = Path('/boot/firmware/cmdline.txt')
    before = path.read_text()
    after = enabled_cmdline(before)
    if before != after:
        backup = path.with_name('cmdline.txt.kla-before-memory')
        if not backup.exists():
            backup.write_text(before)
        temporary = path.with_name('cmdline.txt.kla-new')
        temporary.write_text(after)
        temporary.replace(path)
        os.sync()
    print('Kontrola pamięci przygotowana. Wymagany kontrolowany restart Raspberry po kopii i audycie startu.')


if __name__ == '__main__':
    main()
