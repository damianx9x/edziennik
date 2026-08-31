#!/usr/bin/env python3
"""Fail-closed archive validation used before any privileged extraction."""

from __future__ import annotations

import hashlib
import pathlib
import shutil
import stat
import sys
import tarfile

MAX_BACKUP_BYTES = 50 * 1024 * 1024 * 1024
MAX_PRIVATE_FILES = 200_000


def safe_relative(name: str) -> pathlib.PurePosixPath:
    value = pathlib.PurePosixPath(name)
    if value.is_absolute() or not value.parts or ".." in value.parts:
        raise SystemExit("Archiwum zawiera niedozwoloną ścieżkę.")
    return value


def write_regular(archive: tarfile.TarFile, member: tarfile.TarInfo, target: pathlib.Path) -> None:
    source = archive.extractfile(member)
    if source is None:
        raise SystemExit("Nie udało się odczytać pliku z archiwum.")
    target.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    with target.open("xb") as destination:
        shutil.copyfileobj(source, destination, length=1024 * 1024)
    target.chmod(0o600)


def extract_outer(destination: pathlib.Path) -> None:
    allowed_files = {
        pathlib.PurePosixPath("database.dump"),
        pathlib.PurePosixPath("private-files.tar.gz"),
        pathlib.PurePosixPath("manifest.txt"),
        pathlib.PurePosixPath("continuity/edziennik.env"),
        pathlib.PurePosixPath("continuity/vault.conf"),
    }
    required = {
        pathlib.PurePosixPath("database.dump"),
        pathlib.PurePosixPath("private-files.tar.gz"),
        pathlib.PurePosixPath("manifest.txt"),
    }
    seen: set[pathlib.PurePosixPath] = set()
    total = 0
    destination.mkdir(mode=0o700, parents=True, exist_ok=True)
    with tarfile.open(fileobj=sys.stdin.buffer, mode="r|*") as archive:
        for member in archive:
            path = safe_relative(member.name)
            if member.isdir() and path == pathlib.PurePosixPath("continuity"):
                (destination / "continuity").mkdir(mode=0o700, exist_ok=True)
                continue
            if not member.isfile() or path not in allowed_files or path in seen:
                raise SystemExit("Kopia zawiera niedozwolony albo powtórzony element.")
            total += max(member.size, 0)
            if total > MAX_BACKUP_BYTES:
                raise SystemExit("Kopia po rozpakowaniu przekracza bezpieczny limit.")
            write_regular(archive, member, destination.joinpath(*path.parts))
            seen.add(path)
    if not required.issubset(seen):
        raise SystemExit("Kopia nie zawiera kompletu wymaganych danych.")


def extract_private(source_path: pathlib.Path, destination: pathlib.Path) -> None:
    root = pathlib.PurePosixPath("private-files")
    total = 0
    count = 0
    destination.mkdir(mode=0o700, parents=True, exist_ok=True)
    with tarfile.open(source_path, mode="r:gz") as archive:
        for member in archive:
            path = safe_relative(member.name)
            if path != root and root not in path.parents:
                raise SystemExit("Magazyn plików ma niedozwoloną ścieżkę.")
            count += 1
            total += max(member.size, 0)
            if count > MAX_PRIVATE_FILES or total > MAX_BACKUP_BYTES:
                raise SystemExit("Magazyn plików przekracza bezpieczny limit.")
            relative = pathlib.PurePosixPath(*path.parts[1:])
            target = destination.joinpath(*relative.parts)
            if member.isdir():
                target.mkdir(mode=0o700, parents=True, exist_ok=True)
            elif member.isfile():
                write_regular(archive, member, target)
            else:
                raise SystemExit("Magazyn zawiera niedozwolony typ pliku.")


def validate_release(root: pathlib.Path) -> None:
    manifest_path = root / "KLA_RELEASE_MANIFEST.sha256"
    signature_path = root / "KLA_RELEASE_MANIFEST.sha256.sig"
    if not manifest_path.is_file() or not signature_path.is_file():
        raise SystemExit("Paczka nie zawiera podpisanego manifestu.")
    listed: dict[pathlib.PurePosixPath, str] = {}
    for raw in manifest_path.read_text(encoding="utf-8").splitlines():
        if len(raw) < 68 or raw[64:66] != "  ":
            raise SystemExit("Manifest wydania ma nieprawidłowy format.")
        digest, name = raw[:64], raw[66:]
        if any(character not in "0123456789abcdef" for character in digest):
            raise SystemExit("Manifest wydania ma nieprawidłową sumę.")
        path = safe_relative(name.removeprefix("./"))
        if path in listed:
            raise SystemExit("Manifest zawiera powtórzoną ścieżkę.")
        listed[path] = digest
    actual: set[pathlib.PurePosixPath] = set()
    for candidate in root.rglob("*"):
        relative = pathlib.PurePosixPath(candidate.relative_to(root).as_posix())
        mode = candidate.lstat().st_mode
        if stat.S_ISDIR(mode):
            continue
        if not stat.S_ISREG(mode):
            raise SystemExit("Paczka zawiera niedozwolony typ pliku.")
        if relative not in {
            pathlib.PurePosixPath("KLA_RELEASE_MANIFEST.sha256"),
            pathlib.PurePosixPath("KLA_RELEASE_MANIFEST.sha256.sig"),
        }:
            actual.add(relative)
    if actual != set(listed):
        raise SystemExit("Zawartość paczki nie jest dokładnie zgodna z podpisanym manifestem.")
    for path, expected in listed.items():
        hasher = hashlib.sha256()
        with root.joinpath(*path.parts).open("rb") as source:
            for chunk in iter(lambda: source.read(1024 * 1024), b""):
                hasher.update(chunk)
        digest = hasher.hexdigest()
        if digest != expected:
            raise SystemExit(f"Niezgodna suma pliku: {path}")


def main() -> None:
    if len(sys.argv) < 3:
        raise SystemExit("Użycie: safe-archive.py outer CEL | private ARCHIWUM CEL | release KATALOG")
    mode, path = sys.argv[1], pathlib.Path(sys.argv[2])
    if mode == "outer":
        if len(sys.argv) != 3:
            raise SystemExit("Tryb outer wymaga katalogu docelowego.")
        extract_outer(path)
    elif mode == "private":
        if len(sys.argv) != 4:
            raise SystemExit("Tryb private wymaga archiwum i katalogu docelowego.")
        extract_private(path, pathlib.Path(sys.argv[3]))
    elif mode == "release":
        if len(sys.argv) != 3:
            raise SystemExit("Tryb release wymaga katalogu paczki.")
        validate_release(path)
    else:
        raise SystemExit("Nieznany tryb walidacji archiwum.")


if __name__ == "__main__":
    main()
