#!/usr/bin/env python3
"""Loopback-only console; all privileged work uses existing kla-control policy."""
import argparse
import hmac
import json
import os
import re
from pathlib import Path
import secrets
import subprocess
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ASSETS = Path(__file__).resolve().parent
ACTIONS = {'start', 'safe-restart', 'backup', 'restore-test'}


def control(action):
    return subprocess.run(['/usr/bin/sudo', '-n', '/usr/local/sbin/kla-control', action],
                          capture_output=True, text=True, timeout=1800)


class State:
    def __init__(self, demo=False):
        self.token = 'demo-only-no-server-commands' if demo else secrets.token_urlsafe(32)
        self.demo = demo
        self.lock = threading.Lock()
        self.job = {'state': 'idle', 'message': ''}

    def status(self):
        if self.demo:
            return '[OK] sejf otwarty w trybie zapisu\n[OK] aplikacja i baza odpowiadają\n[OK] automatyczny start\nTemperatura: 52°C\nDANE DEMONSTRACYJNE'
        result = subprocess.run(['/usr/bin/sudo', '-n', '/usr/local/sbin/kla-control', 'status'],
                                capture_output=True, text=True, timeout=45)
        if result.returncode:
            raise RuntimeError('Nie udało się odczytać stanu. Sprawdź uprawnienia kla-control w Terminalu.')
        text = result.stdout[:16000]
        power = re.search(r'zasilanie/temperatura: (0x[0-9a-fA-F]+)', text)
        if power and int(power.group(1), 16) & 1:
            text += '\n[UWAGA] Zbyt niskie napięcie TERAZ — sprawdź zasilacz Raspberry i dysku.\n'
        return text

    def start(self, action):
        with self.lock:
            if self.job['state'] == 'running':
                return False
            self.job = {'state': 'running', 'action': action, 'message': 'Trwa operacja. Nie wyłączaj zasilania.'}
        threading.Thread(target=self.work, args=(action,), daemon=True).start()
        return True

    def work(self, action):
        try:
            if self.demo:
                time.sleep(0.4)
                message = 'Symulacja zakończona. Nie wykonano polecenia na serwerze.'
            else:
                status = self.status()
                # Power readings remain visible in status; they no longer block operations.
                if 'dysk nie pozwala na zapis' in status or 'sejf zamknięty' in status:
                    raise RuntimeError('Najpierw przywróć dostęp do sejfu. Panel nie formatuje dysku ani nie wymusza zapisu. Użyj Terminala: sudo kla-unlock. Przy błędzie dysku sprawdź zasilanie.')
                result = control(action)
                if result.returncode:
                    # Fixed helpers do not return secrets for these four actions.
                    raise RuntimeError((result.stdout + result.stderr)[-8000:] or 'Operacja nie powiodła się. Sprawdź stan serwera.')
                message = result.stdout[-8000:] or 'Polecenie zakończone. Odśwież stan serwera.'
            job = {'state': 'done', 'message': message}
        except subprocess.TimeoutExpired:
            job = {'state': 'error', 'message': 'Przekroczono czas oczekiwania. Polecenie może nadal działać. Sprawdź stan serwera przed ponowieniem.'}
        except Exception as error:
            job = {'state': 'error', 'message': str(error)}
        with self.lock:
            self.job = job


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass  # Never log request URLs/tokens.

    def send(self, code, body, content_type='application/json; charset=utf-8'):
        data = json.dumps(body, ensure_ascii=False).encode() if isinstance(body, dict) else body
        self.send_response(code)
        for key, value in {
            'Content-Type': content_type, 'Content-Length': str(len(data)),
            'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
            'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY',
            'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
        }.items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(data)

    def valid_host(self):
        return self.headers.get('Host') == f'127.0.0.1:{self.server.server_port}'

    def authorized(self):
        return hmac.compare_digest(self.headers.get('Authorization', ''), 'Bearer ' + self.server.state.token)

    def do_GET(self):
        if not self.valid_host():
            return self.send(403, {'error': 'Niedozwolony adres panelu.'})
        if self.path == '/favicon.ico':
            return self.send(204, b'', 'image/x-icon')
        assets = {'/': ('index.html', 'text/html; charset=utf-8'), '/panel.js': ('panel.js', 'text/javascript; charset=utf-8'), '/panel.css': ('panel.css', 'text/css; charset=utf-8')}
        if self.path in assets:
            filename, mime = assets[self.path]
            return self.send(200, (ASSETS / filename).read_bytes(), mime)
        if not self.authorized():
            return self.send(401, {'error': 'Otwórz skrót „KLA — serwer” na pulpicie Raspberry.'})
        if self.path == '/api/job':
            with self.server.state.lock:
                return self.send(200, dict(self.server.state.job))
        if self.path == '/api/status':
            try:
                return self.send(200, {'text': self.server.state.status(), 'demo': self.server.state.demo})
            except Exception:
                return self.send(503, {'error': 'Brak odczytu stanu. Spróbuj ponownie; sprawdź Terminal i kla-control.'})
        return self.send(404, {'error': 'Nie znaleziono.'})

    def do_POST(self):
        if not self.valid_host() or not self.authorized() or self.headers.get('Origin') != f'http://127.0.0.1:{self.server.server_port}':
            return self.send(403, {'error': 'Brak autoryzacji lokalnej.'})
        if self.path != '/api/action' or self.headers.get('Content-Type') != 'application/json':
            return self.send(400, {'error': 'Niepoprawne polecenie.'})
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= 256:
                raise ValueError()
            data = json.loads(self.rfile.read(size))
            if not isinstance(data, dict) or set(data) != {'action', 'confirmed'} or data['action'] not in ACTIONS or data['confirmed'] is not True:
                raise ValueError()
        except (ValueError, TypeError):
            return self.send(400, {'error': 'Niepoprawne polecenie lub brak potwierdzenia.'})
        accepted = self.server.state.start(data['action'])
        return self.send(202 if accepted else 409, {'message': 'Rozpoczęto.' if accepted else 'Inna operacja już trwa.'})


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--demo', action='store_true')
    parser.add_argument('--port', type=int, default=8765)
    args = parser.parse_args()
    runtime = Path(os.environ.get('XDG_RUNTIME_DIR', f'/tmp/kla-panel-{os.getuid()}')) / 'kla-local-panel'
    runtime.mkdir(mode=0o700, parents=True, exist_ok=True)
    if runtime.is_symlink() or runtime.stat().st_uid != os.getuid():
        raise SystemExit('Niebezpieczny katalog sesji.')
    runtime.chmod(0o700)
    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    server.state = State(args.demo)
    # Private ephemeral launch file: token is not exposed in process arguments.
    launch = runtime / 'open.html'
    fd = os.open(launch, os.O_WRONLY | os.O_CREAT | os.O_TRUNC | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, 'w') as out:
        out.write(f'<meta http-equiv="refresh" content="0;url=http://127.0.0.1:{args.port}/#{server.state.token}">')
    try:
        server.serve_forever()
    finally:
        launch.unlink(missing_ok=True)


if __name__ == '__main__':
    main()
