#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SIGNING_KEY="${KLA_RELEASE_SIGNING_KEY:-$HOME/.ssh/kla_release_signing_ed25519}"
OUTPUT_DIR="$PROJECT_DIR/outputs"
TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/kla-raspberry.XXXXXX")"
STAGE="$TEMP_DIR/edziennik-kla"
trap 'rm -rf "$TEMP_DIR"' EXIT

[[ -z "$(git -C "$PROJECT_DIR" status --porcelain --untracked-files=normal)" ]] || {
  echo "Repozytorium ma niezapisane zmiany. Pakiet powstaje tylko z zatwierdzonego commita."
  exit 1
}
[[ -f "$SIGNING_KEY" ]] || { echo "Brak prywatnego klucza podpisu wydania: $SIGNING_KEY"; exit 1; }
[[ "$(chmod 600 "$SIGNING_KEY" && ssh-keygen -y -f "$SIGNING_KEY" | cut -d' ' -f1-2)" == "$(cut -d' ' -f1-2 "$PROJECT_DIR/deployment/release-signing.pub")" ]] || {
  echo "Prywatny klucz nie pasuje do zaufanego klucza wydania."; exit 1;
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
ssh-keygen -Y sign -q -f "$SIGNING_KEY" -n kla-release "$STAGE/KLA_RELEASE_MANIFEST.sha256"
COPYFILE_DISABLE=1 tar --no-xattrs -C "$TEMP_DIR" -czf "$OUTPUT_DIR/edziennik-kla-raspberry-source.tar.gz" edziennik-kla
shasum -a 256 "$OUTPUT_DIR/edziennik-kla-raspberry-source.tar.gz" \
  > "$OUTPUT_DIR/edziennik-kla-raspberry-source.tar.gz.sha256"
echo "Gotowy pakiet Raspberry: $OUTPUT_DIR/edziennik-kla-raspberry-source.tar.gz"
