#!/usr/bin/env python3
"""Root broker for the explicitly allowlisted KLA web-control operations."""

from __future__ import annotations

import grp
import json
import os
import pathlib
import socketserver
import subprocess

SOCKET_PATH = pathlib.Path("/run/kla-web-control/control.sock")
MAX_REQUEST_BYTES = 256 * 1024
MAX_RESPONSE_BYTES = 256 * 1024
ALLOWED_ACTIONS = {
    "status-json", "storage-json", "set-backup-usb", "clear-backup-usb",
    "backup-now", "benchmark-readonly", "restart-app", "set-backup-policy",
    "sftp-prepare", "sftp-confirm", "sftp-clear", "recovery-key-once",
    "recovery-key-first-run-once",
    "export-create", "import-prepare", "import-restore", "set-smtp",
    "set-sms-gate", "set-public-mode",
}


def timeout_for(action: str) -> int:
    if action == "import-prepare":
        return 300
    if action in {"backup-now", "export-create", "benchmark-readonly"}:
        return 180
    return 25


class Handler(socketserver.StreamRequestHandler):
    def handle(self) -> None:
        raw = self.rfile.readline(MAX_REQUEST_BYTES + 1)
        if not raw or len(raw) > MAX_REQUEST_BYTES or not raw.endswith(b"\n"):
            self.respond(False, "", "Nieprawidłowy rozmiar polecenia.")
            return
        try:
            request = json.loads(raw)
            action = request.get("action")
            arguments = request.get("args", [])
            stdin = request.get("input", "")
            if action not in ALLOWED_ACTIONS:
                raise ValueError("Niedozwolona operacja panelu serwera.")
            if (
                not isinstance(arguments, list)
                or len(arguments) > 4
                or any(not isinstance(value, str) or len(value) > 500 for value in arguments)
                or not isinstance(stdin, str)
                or len(stdin.encode("utf-8")) > 128 * 1024
            ):
                raise ValueError("Nieprawidłowe parametry operacji.")
        except (json.JSONDecodeError, TypeError, ValueError) as error:
            self.respond(False, "", str(error))
            return

        try:
            result = subprocess.run(
                ["/usr/local/sbin/kla-web-control", action, *arguments],
                input=stdin, text=True, stdout=subprocess.PIPE,
                stderr=subprocess.PIPE, timeout=timeout_for(action), check=False,
                env={"PATH": "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"},
            )
            stdout = result.stdout[:MAX_RESPONSE_BYTES]
            stderr = result.stderr[:MAX_RESPONSE_BYTES]
            if len(result.stdout) > MAX_RESPONSE_BYTES or len(result.stderr) > MAX_RESPONSE_BYTES:
                self.respond(False, "", "Narzędzie zwróciło zbyt dużo danych.")
            else:
                self.respond(result.returncode == 0, stdout, stderr)
        except subprocess.TimeoutExpired:
            self.respond(False, "", "Operacja przekroczyła bezpieczny limit czasu.")
        except OSError:
            self.respond(False, "", "Usługa sterowania nie mogła uruchomić operacji.")

    def respond(self, ok: bool, stdout: str, stderr: str) -> None:
        payload = json.dumps({"ok": ok, "stdout": stdout, "stderr": stderr}, ensure_ascii=False)
        self.wfile.write(payload.encode("utf-8") + b"\n")


class Server(socketserver.UnixStreamServer):
    allow_reuse_address = True


def main() -> None:
    SOCKET_PATH.parent.mkdir(mode=0o750, parents=True, exist_ok=True)
    SOCKET_PATH.unlink(missing_ok=True)
    with Server(str(SOCKET_PATH), Handler) as server:
        os.chown(SOCKET_PATH, 0, grp.getgrnam("kla").gr_gid)
        os.chmod(SOCKET_PATH, 0o660)
        server.serve_forever(poll_interval=0.5)


if __name__ == "__main__":
    main()
