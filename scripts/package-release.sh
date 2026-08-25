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
release_zip="$release_output_dir/edziennik-kla-stage-6-pre-release.zip"

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
cp DEPLOYMENT_MYDEVIL.md "$release_root/DEPLOYMENT_MYDEVIL.md"
cp DEPLOYMENT_HOME_VPS.md "$release_root/DEPLOYMENT_HOME_VPS.md"
cp MAC_TEST_HOST.md "$release_root/MAC_TEST_HOST.md"
cp STAN_PROJEKTU.md "$release_root/STAN_PROJEKTU.md"
cp CYKL_TESTOWY.md "$release_root/CYKL_TESTOWY.md"
cp AKTUALIZACJE_I_ROLLBACK.md "$release_root/AKTUALIZACJE_I_ROLLBACK.md"
cp ETAP_1_INSTRUKCJA.md "$release_root/ETAP_1_INSTRUKCJA.md"
cp ETAP_2_INSTRUKCJA.md "$release_root/ETAP_2_INSTRUKCJA.md"
cp ETAP_3_GRAFIK.md "$release_root/ETAP_3_GRAFIK.md"
cp ETAP_4_UMOWY_PLATNOSCI.md "$release_root/ETAP_4_UMOWY_PLATNOSCI.md"
cp ETAP_5_KOMUNIKATOR.md "$release_root/ETAP_5_KOMUNIKATOR.md"
cp ETAP_6_NAUKA_POSTEPY.md "$release_root/ETAP_6_NAUKA_POSTEPY.md"
cp CHECKLISTA_ODBIORU_KLIENTKI.md "$release_root/CHECKLISTA_ODBIORU_KLIENTKI.md"
cp TECHNICAL_HANDOFF_PRE_RELEASE.md "$release_root/TECHNICAL_HANDOFF_PRE_RELEASE.md"
cp BEZPIECZENSTWO_I_RODO.md "$release_root/BEZPIECZENSTWO_I_RODO.md"
cp BRAND_I_UI.md "$release_root/BRAND_I_UI.md"
cp ZAKRES_STARTOWY.md "$release_root/ZAKRES_STARTOWY.md"
cp OBSERVABILITY_I_ZGLOSZENIA.md "$release_root/OBSERVABILITY_I_ZGLOSZENIA.md"
cp INSTRUKCJA_HOME_PL.md "$release_root/INSTRUKCJA_HOME_PL.md"
cp START_TUTAJ.md "$release_root/START_TUTAJ.md"
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
