#!/usr/bin/env bash

set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"

if ! command -v node >/dev/null 2>&1; then
  echo "Brakuje Node.js. Zainstaluj Node.js 24 LTS, a potem uruchom skrypt ponownie."
  echo "Najprościej: brew install node@24"
  exit 1
fi

node_major="$(node -p 'Number(process.versions.node.split(".")[0])')"
node_minor="$(node -p 'Number(process.versions.node.split(".")[1])')"

if (( node_major < 22 || node_major > 24 )); then
  echo "Potrzebny jest Node.js 22, 23 lub 24. Masz: $(node --version)."
  echo "Rekomendacja: brew install node@24"
  exit 1
fi

if (( node_major == 22 && node_minor < 13 )); then
  echo "Node.js 22 musi mieć wersję co najmniej 22.13. Masz: $(node --version)."
  exit 1
fi

echo "Instaluję zależności projektu..."
npm ci

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Utworzyłem lokalny plik .env z bezpiecznymi wartościami przykładowymi."
else
  echo "Zachowuję istniejący plik .env bez zmian."
fi

echo "Przygotowuję klienta bazy danych..."
npm run db:generate

echo "Gotowe. Uruchom aplikację poleceniem: npm run dev"
