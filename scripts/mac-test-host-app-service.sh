#!/usr/bin/env bash

set -euo pipefail

state_dir="${1:?Brak katalogu usługi.}"
node_path="${2:?Brak ścieżki do Node.js.}"
app_port="${3:-3100}"
runtime_dir="$state_dir/runtime"
server_dir_file="$state_dir/server-dir.txt"
database_script="$runtime_dir/scripts/mac-test-host-database.sh"

if [[ ! -x "$node_path" ]]; then
  echo "Node.js nie istnieje pod ścieżką: $node_path"
  exit 1
fi

if [[ ! -f "$runtime_dir/.env" || ! -f "$server_dir_file" ]]; then
  echo "Brak przygotowanego środowiska testowego."
  exit 1
fi

if [[ ! -x "$database_script" ]]; then
  echo "Brak skryptu nadzoru lokalnej bazy."
  exit 1
fi

"$database_script" "$runtime_dir" "$node_path"

standalone_dir="$(head -1 "$server_dir_file")"
if [[ "$standalone_dir" != "$runtime_dir/"* || ! -f "$standalone_dir/server.js" ]]; then
  echo "Nieprawidłowy katalog serwera: $standalone_dir"
  exit 1
fi

cd "$standalone_dir"
exec /usr/bin/caffeinate -i -s \
  "$node_path" \
  --env-file="$runtime_dir/.env" \
  server.js
