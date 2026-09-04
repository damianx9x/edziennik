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
AUDIT_RESULT="$TEMP_DIR/npm-audit.json"
if [[ -n "${KLA_NPM_AUDIT_RESULT_FILE:-}" ]]; then
  [[ -f "$KLA_NPM_AUDIT_RESULT_FILE" ]] || {
    echo "Nie znaleziono wskazanego raportu audytu npm."; exit 1;
  }
  cp "$KLA_NPM_AUDIT_RESULT_FILE" "$AUDIT_RESULT"
else
  (cd "$PROJECT_DIR" && npm audit --omit=dev --json > "$AUDIT_RESULT") || true
fi
node - "$STAGE/package.json" "$AUDIT_RESULT" "$STAGE/KLA_RELEASE_METADATA.json" "$COMMIT" <<'NODE'
const fs = require("node:fs");
const crypto = require("node:crypto");
const path = require("node:path");
const [packagePath, auditPath, outputPath, commit] = process.argv.slice(2);
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const audit = JSON.parse(fs.readFileSync(auditPath, "utf8"));
if (!audit.metadata?.vulnerabilities) {
  throw new Error(
    "Nie udało się potwierdzić audytu npm. Pakiet Raspberry nie powstanie bez prawidłowego wyniku rejestru.",
  );
}
const values = audit.metadata?.vulnerabilities ?? {};
const vulnerabilities = {
  total: Number(values.total ?? 0),
  critical: Number(values.critical ?? 0),
  high: Number(values.high ?? 0),
  moderate: Number(values.moderate ?? 0),
  low: Number(values.low ?? 0),
};
if (vulnerabilities.critical > 0 || vulnerabilities.high > 0) {
  throw new Error("Wydanie ma krytyczne albo wysokie podatności zależności.");
}
fs.writeFileSync(outputPath, `${JSON.stringify({
  version: packageJson.version,
  commit,
  lockfileSha256: crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(path.dirname(packagePath), "package-lock.json")))
    .digest("hex"),
  auditedAt: new Date().toISOString(),
  vulnerabilities,
}, null, 2)}\n`, { mode: 0o600 });
NODE
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
