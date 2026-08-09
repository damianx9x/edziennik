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
npm run host:mac:status
echo
read -r -n 1 -p "Naciśnij dowolny klawisz, aby zamknąć to okno…"
echo
