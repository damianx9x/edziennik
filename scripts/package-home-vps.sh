#!/usr/bin/env bash

set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"

if [[ "${1:-}" != "--skip-checks" ]]; then
  npm run check
  npm run build
fi

release_tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/edziennik-kla-vps.XXXXXX")"
release_root="$release_tmp_dir/edziennik-kla-home-vps"
release_output_dir="$project_dir/outputs"
release_zip="$release_output_dir/edziennik-kla-home-vps-stage-3.zip"

if [[ -z "$release_tmp_dir" || ! -d "$release_tmp_dir" ]]; then
  echo "Nie udało się utworzyć bezpiecznego katalogu tymczasowego."
  exit 1
fi

mkdir -p "$release_root" "$release_output_dir"

while IFS= read -r -d "" source_file; do
  target_file="$release_root/$source_file"
  mkdir -p "$(dirname "$target_file")"
  cp -p "$source_file" "$target_file"
done < <(git ls-files --cached --others --exclude-standard -z)

rm -rf -- \
  "$release_root/.git" \
  "$release_root/.next" \
  "$release_root/.data" \
  "$release_root/node_modules" \
  "$release_root/outputs"

unsafe_env_file="$(
  find "$release_root" -type f -name '.env*' \
    ! -name '.env.example' -print -quit
)"
if [[ -n "$unsafe_env_file" ]]; then
  echo "Przerwano: paczka zawiera prywatny plik środowiskowy."
  exit 1
fi

chmod +x \
  "$release_root/deployment/home-vps/install.sh" \
  "$release_root/deployment/home-vps/update.sh" \
  "$release_root/deployment/home-vps/backup.sh" \
  "$release_root/deployment/home-vps/status.sh" \
  "$release_root/scripts/release-start.sh" \
  "$release_root/scripts/release-migrate.sh" \
  "$release_root/scripts/release-setup-owner.sh" \
  "$release_root/scripts/release-seed-demo.sh" \
  "$release_root/scripts/release-apply-director-mfa-policy.sh"

rm -f -- "$release_zip"
(
  cd "$release_tmp_dir"
  zip -qr "$release_zip" edziennik-kla-home-vps
)

echo "Gotowy instalator VPS: $release_zip"
