import importlib.util
import json
from pathlib import Path
import threading
import unittest
import urllib.error
import urllib.request
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('panel', Path(__file__).with_name('server.py'))
panel = importlib.util.module_from_spec(spec)
spec.loader.exec_module(panel)


class PanelTests(unittest.TestCase):
    def test_launcher_uses_dedicated_noninteractive_profile(self):
        launcher = Path(__file__).with_name('open.sh').read_text()
        self.assertIn('--password-store=basic', launcher)
        self.assertIn('--user-data-dir="$HOME/.local/share/kla-local-panel-browser"', launcher)
        self.assertNotIn('--no-sandbox', launcher)

    def setUp(self):
        self.server = panel.ThreadingHTTPServer(('127.0.0.1', 0), panel.Handler)
        self.server.state = panel.State(demo=True)
        self.url = f'http://127.0.0.1:{self.server.server_port}'
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()

    def request(self, path, body=None, auth=True, origin=True, extra=None):
        headers = {'Content-Type': 'application/json'}
        if auth:
            headers['Authorization'] = 'Bearer ' + self.server.state.token
        if origin:
            headers['Origin'] = self.url
        headers.update(extra or {})
        req = urllib.request.Request(self.url + path, headers=headers,
                                     data=json.dumps(body).encode() if body is not None else None)
        try:
            response = urllib.request.urlopen(req, timeout=3)
        except urllib.error.HTTPError as error:
            response = error
        return response.status, response.read()

    def test_status_requires_token(self):
        self.assertEqual(self.request('/api/status', auth=False)[0], 401)
        self.assertEqual(self.request('/api/status')[0], 200)

    def test_rebinding_and_csrf_rejected(self):
        self.assertEqual(self.request('/', extra={'Host': 'attacker.example'})[0], 403)
        body = {'action': 'backup', 'confirmed': True}
        self.assertEqual(self.request('/api/action', body, origin=False)[0], 403)
        self.assertEqual(self.request('/api/action', body, auth=False)[0], 403)

    def test_action_allowlist_confirmation_and_serialization(self):
        for body in ({'action': 'reboot', 'confirmed': True}, {'action': 'backup', 'confirmed': False}, {'action': [], 'confirmed': True}, {'action': 'backup; id', 'confirmed': True}):
            self.assertEqual(self.request('/api/action', body)[0], 400)
        self.server.state.job = {'state': 'running'}
        self.assertEqual(self.request('/api/action', {'action': 'backup', 'confirmed': True})[0], 409)

    def test_demo_action_and_no_token_in_assets(self):
        code, html = self.request('/')
        self.assertEqual(code, 200)
        self.assertNotIn(self.server.state.token.encode(), html)
        self.assertEqual(self.request('/api/action', {'action': 'backup', 'confirmed': True})[0], 202)
        self.assertEqual(self.request('/../../etc/passwd')[0], 404)

    def test_power_reading_does_not_block_operations(self):
        state = panel.State()
        with patch.object(state, 'status', return_value='[UWAGA] zasilanie/temperatura: 0x50005'), patch.object(panel, 'control') as command:
            command.return_value.returncode = 0
            command.return_value.stdout = 'Kopia gotowa'
            state.work('backup')
            command.assert_called_once_with('backup')
            self.assertEqual(state.job['state'], 'done')

    def test_readonly_vault_still_blocks_writes(self):
        state = panel.State()
        with patch.object(state, 'status', return_value='dysk nie pozwala na zapis'), patch.object(panel, 'control') as command:
            state.work('backup')
            command.assert_not_called()
            self.assertEqual(state.job['state'], 'error')


if __name__ == '__main__':
    unittest.main()
