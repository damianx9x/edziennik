#!/usr/bin/env bash

set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
preview_source_dir="$(mktemp -d "${TMPDIR:-/tmp}/kla-static-source.XXXXXX")"

if [[ -z "$preview_source_dir" || ! -d "$preview_source_dir" ]]; then
  echo "Nie udało się utworzyć bezpiecznego katalogu tymczasowego."
  exit 1
fi

cleanup() {
  rm -rf -- "$preview_source_dir"
}
trap cleanup EXIT

# Statyczny pokaz home.pl jest celowo osobnym artefaktem. Pełne trasy Etapu 1
# wymagają Node.js i PostgreSQL, więc nie mogą trafić do eksportu FTP.
rsync -a \
  --exclude ".env*" \
  --exclude ".git" \
  --exclude ".next" \
  --exclude "node_modules" \
  --exclude "out" \
  --exclude "outputs" \
  --exclude "proxy.ts" \
  --exclude "work" \
  "$project_dir/" "$preview_source_dir/"

rm -rf -- \
  "$preview_source_dir/app/api" \
  "$preview_source_dir/app/zaproszenie" \
  "$preview_source_dir/app/panel/bezpieczenstwo" \
  "$preview_source_dir/app/panel/bog" \
  "$preview_source_dir/app/panel/brak-dostepu" \
  "$preview_source_dir/app/panel/konto-nieaktywne" \
  "$preview_source_dir/app/panel/nowe-haslo" \
  "$preview_source_dir/app/panel/odzyskaj-dostep" \
  "$preview_source_dir/app/panel/plan" \
  "$preview_source_dir/app/panel/platnosci" \
  "$preview_source_dir/app/panel/powiadomienia" \
  "$preview_source_dir/app/panel/rodzic" \
  "$preview_source_dir/app/panel/szkola" \
  "$preview_source_dir/app/panel/uczen" \
  "$preview_source_dir/app/panel/umowy" \
  "$preview_source_dir/app/panel/weryfikacja-2fa" \
  "$preview_source_dir/app/panel/wiadomosci"

ln -s "$project_dir/node_modules" "$preview_source_dir/node_modules"

(
  cd "$preview_source_dir"
  preview_database_url="postgresql://preview:preview@127.0.0.1:5432/kla_static_preview"
  DATABASE_URL="$preview_database_url" npx prisma generate
  DATABASE_URL="$preview_database_url" KLA_STATIC_PREVIEW=1 npx next build --webpack
)

rm -rf -- "$project_dir/out"
mkdir -p "$project_dir/out"
cp -R "$preview_source_dir/out/." "$project_dir/out/"

echo "Statyczny podgląd gotowy w: $project_dir/out"
