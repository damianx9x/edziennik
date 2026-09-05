#!/usr/bin/env python3
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parent


def load(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / f'{name}.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


policy = load('restart-policy')
memory = load('prepare-memory-limits')


class OperationsTest(unittest.TestCase):
    def test_configuration_roundtrip_and_disable(self):
        with tempfile.TemporaryDirectory() as folder:
            directory = Path(folder)
            with patch.object(policy, 'POLICY', directory / 'policy.json'), patch.object(policy, 'TIMER', directory / 'restart.timer'), patch.object(policy.os, 'geteuid', return_value=0), patch.object(policy.sys, 'argv', ['policy', 'configure']), patch.object(policy.subprocess, 'run') as run:
                run.return_value.returncode = 1
                for frequency in ('weekly', 'off'):
                    data = {'frequency': frequency, 'hour': 3, 'minute': 30}
                    with patch.object(policy.sys, 'stdin', io.StringIO(json.dumps(data))), patch.object(policy.sys, 'stdout', io.StringIO()):
                        policy.main()
                    self.assertEqual(policy.read_policy(), data)
                    self.assertEqual((directory / 'policy.json').stat().st_mode & 0o777, 0o600)
                self.assertTrue(any(call.args[0][:3] == ['systemctl', 'disable', '--now'] for call in run.call_args_list))

    def test_timer_no_catch_up_and_explicit_timezone(self):
        text = policy.timer_content({'frequency': 'weekly', 'hour': 3, 'minute': 30})
        self.assertIn('OnCalendar=Sun 03:30:00 Europe/Warsaw', text)
        self.assertIn('Persistent=false', text)
        self.assertNotIn('reboot', text)

    def test_rejects_injection_and_unbounded_values(self):
        for change in ({'frequency': 'daily\nExecStart=reboot'}, {'hour': True}, {'hour': 24}, {'minute': -1}, {'minute': '00'}, {'extra': 1}):
            with self.subTest(change=change), self.assertRaises(ValueError):
                policy.validate({**policy.DEFAULT, **change})

    def test_memory_flag_preserves_root_and_other_arguments(self):
        before = 'root=PARTUUID=example rootwait usb-storage.quirks=0bc2:ab26:u\n'
        after = memory.enabled_cmdline(before)
        self.assertEqual(after, before.strip() + ' cgroup_enable=memory\n')
        self.assertEqual(after, memory.enabled_cmdline(after))
        self.assertTrue(after.endswith('cgroup_enable=memory\n'))
        with self.assertRaises(ValueError):
            memory.enabled_cmdline('')

    def test_watchdog_does_not_touch_services_during_maintenance(self):
        # Execute the actual shell entrypoint with a contended-lock stub.
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder)
            script = (ROOT / 'healthcheck.sh').read_text().replace('/run/lock/kla-maintenance.lock', str(path / 'lock'))
            script = script.replace('flock -n 9', 'false')
            self.assertEqual(subprocess.run(['bash', '-c', script], timeout=3).returncode, 0)

    def test_backup_policy_uses_configured_variable(self):
        self.assertIn('BACKUP_RETENTION_DAYS="${KLA_BACKUP_RETENTION_DAYS:-30}"', (ROOT / 'backup.sh').read_text())
        self.assertIn('KLA_MAINTENANCE_LOCK_HELD=1 /usr/local/sbin/edziennik-kla-health', (ROOT / 'restore.sh').read_text())

    def test_restart_shares_lock_and_has_cooldown(self):
        text = (ROOT / 'safe-restart.sh').read_text()
        self.assertIn('/run/lock/kla-maintenance.lock', text)
        self.assertIn('NOW - LAST < 900', text)
        self.assertIn('sha256sum -c', text)
        self.assertNotIn('systemctl reboot', text)
        self.assertNotIn('systemctl restart postgresql', text)


if __name__ == '__main__':
    unittest.main()
