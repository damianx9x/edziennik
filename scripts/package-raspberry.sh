#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="$PROJECT_DIR/outputs"
TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/kla-raspberry.XXXXXX")"
STAGE="$TEMP_DIR/edziennik-kla"
trap 'rm -rf "$TEMP_DIR"' EXIT

[[ -z "$(git -C "$PROJECT_DIR" status --porcelain --untracked-files=normal)" ]] || {
  echo "Repozytorium ma niezapisane zmiany. Pakiet powstaje tylko z zatwierdzonego commita."
  exit 1
}

COMMIT="$(git -C "$PROJECT_DIR" rev-parse HEAD)"
mkdir -p "$STAGE" "$OUTPUT_DIR"
git -C "$PROJECT_DIR" archive --format=tar "$COMMIT" | tar -xf - -C "$STAGE"
printf '%s\n' "$COMMIT" > "$STAGE/KLA_RELEASE_COMMIT"
(
  cd "$STAGE"
  find . -type f ! -name KLA_RELEASE_MANIFEST.sha256 -print0 \
    | sort -z \
    | xargs -0 sha256sum > KLA_RELEASE_MANIFEST.sha256
)
COPYFILE_DISABLE=1 tar --no-xattrs -C "$TEMP_DIR" -czf "$OUTPUT_DIR/edziennik-kla-raspberry-source.tar.gz" edziennik-kla
shasum -a 256 "$OUTPUT_DIR/edziennik-kla-raspberry-source.tar.gz" \
  > "$OUTPUT_DIR/edziennik-kla-raspberry-source.tar.gz.sha256"
echo "Gotowy pakiet Raspberry: $OUTPUT_DIR/edziennik-kla-raspberry-source.tar.gz"
