#!/usr/bin/env bash

set -euo pipefail

runtime_dir="${1:?Brak katalogu aplikacji.}"
node_path="${2:?Brak ścieżki do Node.js.}"
env_file="$runtime_dir/.env"
database_name="${KLA_PRISMA_DEV_DATABASE:-kla-stage1}"

if [[ ! -f "$env_file" ]]; then
  echo "Brak pliku środowiska bazy."
  exit 1
fi

database_target="$(
  "$node_path" --env-file="$env_file" --input-type=module - <<'NODE'
const value = process.env.DATABASE_URL;
if (!value) process.exit(1);
const url = new URL(value);
if (url.hostname === "127.0.0.1" || url.hostname === "localhost") {
  process.stdout.write(`${url.hostname}:${url.port || "5432"}`);
}
NODE
)"

# Zdalna baza jest nadzorowana przez dostawcę, nie przez tego Maca.
if [[ -z "$database_target" ]]; then
  exit 0
fi

database_host="${database_target%:*}"
database_port="${database_target##*:}"

database_is_ready() {
  (
    cd "$runtime_dir"
    "$node_path" --env-file="$env_file" --input-type=module - <<'NODE'
import pg from "pg";

const probes = Number.parseInt(process.env.KLA_DB_HEALTH_PROBES ?? "3", 10);

for (let probe = 0; probe < probes; probe += 1) {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 3_000,
    query_timeout: 3_000,
  });

  try {
    await client.connect();
    await client.query("SELECT 1");
  } finally {
    await client.end().catch(() => undefined);
  }
}
NODE
  )
}

if nc -z "$database_host" "$database_port" >/dev/null 2>&1; then
  if database_is_ready; then
    exit 0
  fi

  listener_pid="$(
    lsof -nP -tiTCP:"$database_port" -sTCP:LISTEN 2>/dev/null \
      | head -1
  )"
  if [[ ! "$listener_pid" =~ ^[0-9]+$ ]]; then
    echo "Baza przyjmuje TCP, ale nie odpowiada na zapytanie. Nie znaleziono bezpiecznego procesu do restartu."
    exit 1
  fi

  echo "Baza przyjmuje połączenia, ale nie odpowiada na SELECT 1. Restartuję lokalną instancję..."
  kill -TERM "$listener_pid"
  for attempt in {1..15}; do
    if ! nc -z "$database_host" "$database_port" >/dev/null 2>&1; then
      break
    fi
    if [[ "$attempt" -eq 15 ]]; then
      echo "Lokalna baza nie zakończyła się bezpiecznie. Nie wymuszam zatrzymania."
      exit 1
    fi
    sleep 1
  done
fi

prisma_cli="$runtime_dir/node_modules/prisma/build/index.js"
if [[ ! -f "$prisma_cli" ]]; then
  echo "Brak lokalnego narzędzia Prisma do uruchomienia bazy testowej."
  exit 1
fi

echo "Lokalna baza nie odpowiada. Uruchamiam instancję ${database_name}..."
(
  cd "$runtime_dir"
  "$node_path" "$prisma_cli" dev start "$database_name"
)

for attempt in {1..30}; do
  if database_is_ready >/dev/null 2>&1; then
    exit 0
  fi
  if [[ "$attempt" -eq 30 ]]; then
    echo "Lokalna baza uruchomiła port ${database_port}, ale nie osiągnęła gotowości SQL."
    exit 1
  fi
  sleep 1
done
