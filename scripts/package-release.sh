#!/usr/bin/env bash

set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"

echo "Sprawdzam projekt..."
npm run check
npm run build

release_tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/edziennik-kla-release.XXXXXX")"
release_root="$release_tmp_dir/edziennik-kla"
release_output_dir="$project_dir/outputs"
release_zip="$release_output_dir/edziennik-kla-stage-0.zip"

if [[ -z "$release_tmp_dir" || ! -d "$release_tmp_dir" ]]; then
  echo "Nie udało się utworzyć bezpiecznego katalogu tymczasowego."
  exit 1
fi

mkdir -p "$release_root/.next" "$release_output_dir"
cp -R .next/standalone/. "$release_root/"
cp -R .next/static "$release_root/.next/static"
cp -R public "$release_root/public"
cp scripts/release-start.sh "$release_root/start.sh"
cp DEPLOYMENT_MYDEVIL.md "$release_root/DEPLOYMENT_MYDEVIL.md"
cp BEZPIECZENSTWO_I_RODO.md "$release_root/BEZPIECZENSTWO_I_RODO.md"
cp .env.example "$release_root/.env.example"
chmod +x "$release_root/start.sh"

rm -f -- "$release_zip"
(
  cd "$release_tmp_dir"
  zip -qr "$release_zip" edziennik-kla
)

echo "Gotowy pakiet: $release_zip"
