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
echo "King’s Language Academy — uruchamianie publicznego demo"
echo

if npm run host:mac:start; then
  echo
  echo "Demo działa: https://demo.kingslanguageacademy.pl/panel/logowanie"
  open "https://demo.kingslanguageacademy.pl/panel/logowanie"
else
  echo
  echo "Nie udało się uruchomić demo. Tekst powyżej mówi, co trzeba poprawić."
fi

echo
read -r -n 1 -p "Naciśnij dowolny klawisz, aby zamknąć to okno…"
echo
