#!/usr/bin/env bash

set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"

echo "Sprawdzam projekt..."
npm run check
npm run build:preview

preview_tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/kla-home-preview.XXXXXX")"
preview_upload_dir="$preview_tmp_dir/upload"
preview_output_dir="$project_dir/outputs"
preview_zip="$preview_output_dir/kla-szkielet-etap-0-5-home-pl.zip"

if [[ -z "$preview_tmp_dir" || ! -d "$preview_tmp_dir" ]]; then
  echo "Nie udało się utworzyć bezpiecznego katalogu tymczasowego."
  exit 1
fi

mkdir -p "$preview_upload_dir" "$preview_output_dir"
cp -R out/. "$preview_upload_dir/"
cp hosting/home-preview/.htaccess "$preview_upload_dir/.htaccess"

rm -f -- "$preview_zip"
(
  cd "$preview_upload_dir"
  zip -qr "$preview_zip" .
)

echo "Gotowa paczka do rozpakowania w katalogu domeny: $preview_zip"
