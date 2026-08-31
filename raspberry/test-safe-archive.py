#!/usr/bin/env python3
"""Regression tests for privileged KLA archive validation."""

from __future__ import annotations

import hashlib
import io
import pathlib
import subprocess
import sys
import tarfile
import tempfile


HELPER = pathlib.Path(__file__).with_name("safe-archive.py")


def run(*arguments: str, stdin: bytes | None = None, ok: bool = True) -> None:
    result = subprocess.run(
        [sys.executable, str(HELPER), *arguments],
        input=stdin,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if ok and result.returncode != 0:
        raise AssertionError(result.stderr.decode("utf-8", errors="replace"))
    if not ok and result.returncode == 0:
        raise AssertionError("Niebezpieczne archiwum zostało zaakceptowane.")


def add_bytes(archive: tarfile.TarFile, name: str, content: bytes) -> None:
    member = tarfile.TarInfo(name)
    member.size = len(content)
    archive.addfile(member, io.BytesIO(content))


def outer_archive(member_name: str = "database.dump") -> bytes:
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w:gz") as archive:
        add_bytes(archive, member_name, b"database")
        add_bytes(archive, "private-files.tar.gz", b"private")
        add_bytes(archive, "manifest.txt", b"created_at=20260830T120000Z\n")
    return buffer.getvalue()


def main() -> None:
    with tempfile.TemporaryDirectory(prefix="kla-safe-archive-") as temporary:
        root = pathlib.Path(temporary)

        run("outer", str(root / "valid-outer"), stdin=outer_archive())
        run("outer", str(root / "traversal"), stdin=outer_archive("../database.dump"), ok=False)

        private = root / "private.tar.gz"
        with tarfile.open(private, mode="w:gz") as archive:
            add_bytes(archive, "private-files/materials/test.txt", b"safe")
        run("private", str(private), str(root / "valid-private"))

        malicious_private = root / "private-malicious.tar.gz"
        with tarfile.open(malicious_private, mode="w:gz") as archive:
            add_bytes(archive, "private-files/../../etc/shadow", b"unsafe")
        run("private", str(malicious_private), str(root / "unsafe-private"), ok=False)

        release = root / "release"
        release.mkdir()
        payload = release / "package.json"
        payload.write_text('{"name":"kla"}\n', encoding="utf-8")
        digest = hashlib.sha256(payload.read_bytes()).hexdigest()
        (release / "KLA_RELEASE_MANIFEST.sha256").write_text(
            f"{digest}  package.json\n", encoding="utf-8"
        )
        (release / "KLA_RELEASE_MANIFEST.sha256.sig").write_text("test", encoding="utf-8")
        run("release", str(release))
        (release / "not-in-manifest.txt").write_text("blocked", encoding="utf-8")
        run("release", str(release), ok=False)

    print("Walidacja archiwów: bezpieczne przypadki przyjęte, złośliwe odrzucone.")


if __name__ == "__main__":
    main()
