#!/usr/bin/env bash

set -u

script_path="${BASH_SOURCE[0]}"
while [[ -L "$script_path" ]]; do
  script_dir="$(cd "$(dirname "$script_path")" && pwd)"
  script_path="$(readlink "$script_path")"
  [[ "$script_path" != /* ]] && script_path="$script_dir/$script_path"
done
project_dir="$(cd "$(dirname "$script_path")" && pwd)"
cd "$project_dir" || exit 1

clear
echo "King’s Language Academy — zatrzymywanie publicznego demo"
echo

if npm run host:mac:stop; then
  echo
  echo "Demo zostało zatrzymane. Stały adres zostaje zachowany na następny start."
else
  echo
  echo "Nie udało się zatrzymać demo. Sprawdź komunikat powyżej."
fi

echo
read -r -n 1 -p "Naciśnij dowolny klawisz, aby zamknąć to okno…"
echo
