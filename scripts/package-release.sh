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
release_version="$(node -p "require('./package.json').version")"
release_zip="$release_output_dir/edziennik-kla-v${release_version}.zip"

if [[ -z "$release_tmp_dir" || ! -d "$release_tmp_dir" ]]; then
  echo "Nie udało się utworzyć bezpiecznego katalogu tymczasowego."
  exit 1
fi

mkdir -p "$release_root/.next" "$release_output_dir"
cp -R .next/standalone/. "$release_root/"

# Next.js standalone może skopiować lokalne pliki środowiskowe. Paczka nigdy
# nie może zawierać sekretów z komputera wykonawcy.
rm -f -- \
  "$release_root/.env" \
  "$release_root/.env.local" \
  "$release_root/.env.development" \
  "$release_root/.env.development.local" \
  "$release_root/.env.production" \
  "$release_root/.env.production.local" \
  "$release_root/.env.test" \
  "$release_root/.env.test.local"
rm -rf -- "$release_root/.data"

cp -R .next/static "$release_root/.next/static"
mkdir -p "$release_root/public"
cp -R public/. "$release_root/public/"
mkdir -p "$release_root/output/pdf"
cp -R output/pdf/. "$release_root/output/pdf/"
cp -R prisma "$release_root/prisma"
cp prisma.config.ts "$release_root/prisma.config.ts"
mkdir -p "$release_root/migration-tools"
npm install \
  --prefix "$release_root/migration-tools" \
  --no-audit \
  --no-fund \
  --package-lock=false \
  prisma@7.8.0 \
  dotenv@17.2.3 \
  better-auth@1.6.25 \
  pg@8.22.0
cp scripts/release-prisma.config.ts \
  "$release_root/migration-tools/prisma.config.ts"
cp scripts/setup-system-owner.mjs \
  "$release_root/migration-tools/setup-owner.mjs"
cp scripts/seed-server-demo.mjs \
  "$release_root/migration-tools/seed-demo.mjs"
cp scripts/apply-director-mfa-policy.mjs \
  "$release_root/migration-tools/apply-director-mfa-policy.mjs"
cp scripts/release-start.sh "$release_root/start.sh"
cp scripts/release-app.js "$release_root/app.js"
cp scripts/release-migrate.sh "$release_root/migrate.sh"
cp scripts/release-setup-owner.sh "$release_root/setup-owner.sh"
cp scripts/release-seed-demo.sh "$release_root/seed-demo.sh"
cp scripts/release-apply-director-mfa-policy.sh \
  "$release_root/apply-director-mfa-policy.sh"
cp README.md "$release_root/README.md"
cp -R docs "$release_root/docs"
cp .env.example "$release_root/.env.example"
chmod +x \
  "$release_root/start.sh" \
  "$release_root/migrate.sh" \
  "$release_root/setup-owner.sh" \
  "$release_root/seed-demo.sh" \
  "$release_root/apply-director-mfa-policy.sh"

unsafe_env_file="$(
  find "$release_root" -maxdepth 1 -type f -name '.env*' \
    ! -name '.env.example' -print -quit
)"
if [[ -n "$unsafe_env_file" ]]; then
  echo "Przerwano: paczka zawiera prywatny plik środowiskowy."
  exit 1
fi

rm -f -- "$release_zip"
(
  cd "$release_tmp_dir"
  zip -qr "$release_zip" edziennik-kla
)

echo "Gotowy pakiet: $release_zip"
shasum -a 256 "$release_zip" >"$release_zip.sha256"
"$project_dir/scripts/package-home-vps.sh" --skip-checks
