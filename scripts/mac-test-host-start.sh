#!/usr/bin/env bash

set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
state_dir="$project_dir/.data/mac-test-host"
runtime_dir="$state_dir/runtime"
logs_dir="$state_dir/logs"
build_log="$logs_dir/build.log"
app_log="$logs_dir/app.log"
public_url_file="$state_dir/public-url.txt"
handoff_file="$state_dir/PRZEKAZ_KLIENTCE.txt"
app_pid_file="$state_dir/app.pid"
caffeinate_pid_file="$state_dir/caffeinate.pid"
commit_file="$state_dir/commit.txt"
app_port="${KLA_MAC_TEST_PORT:-3100}"
public_url="${KLA_MAC_TEST_PUBLIC_URL:-https://demo.kingslanguageacademy.pl}"

if [[ "$(uname -s)" != "Darwin" || "$(uname -m)" != "arm64" ]]; then
  echo "Ten instalator jest przygotowany dla Maca Apple Silicon."
  exit 1
fi

if [[ ! -f "$project_dir/.env" ]]; then
  echo "Brak prywatnego pliku .env w katalogu projektu."
  exit 1
fi

if [[ ! -d "$project_dir/node_modules" ]]; then
  echo "Brak zależności. Wykonaj najpierw npm ci."
  exit 1
fi

if [[ -n "$(git -C "$project_dir" status --porcelain --untracked-files=normal)" ]]; then
  echo "Repozytorium ma niezatwierdzone zmiany."
  echo "Najpierw wykonaj lokalne testy i commit."
  exit 1
fi

hosted_commit="$(git -C "$project_dir" rev-parse --verify HEAD)"
hosted_commit_short="$(git -C "$project_dir" rev-parse --short=12 HEAD)"

for pid_file in "$app_pid_file"; do
  if [[ -f "$pid_file" ]]; then
    old_pid="$(tr -cd '0-9' <"$pid_file")"
    if [[ -n "$old_pid" ]] && kill -0 "$old_pid" 2>/dev/null; then
      echo "Środowisko testowe już działa. Użyj: npm run host:mac:status"
      exit 1
    fi
  fi
done

node --env-file="$project_dir/.env" \
  "$project_dir/scripts/apply-director-mfa-policy.mjs"

mkdir -p "$state_dir" "$logs_dir"
chmod 700 "$state_dir" "$logs_dir"

if ! launchctl print "gui/$(id -u)/com.cloudflare.cloudflared" 2>/dev/null \
  | grep -q 'state = running'; then
  echo "Stały tunel Cloudflare nie działa."
  echo "Uruchom usługę kla-demo i spróbuj ponownie."
  exit 1
fi

cleanup_host() {
  for pid_file in "$app_pid_file" "$caffeinate_pid_file"; do
    if [[ -f "$pid_file" ]]; then
      cleanup_pid="$(tr -cd '0-9' <"$pid_file")"
      if [[ -n "$cleanup_pid" ]] && kill -0 "$cleanup_pid" 2>/dev/null; then
        kill "$cleanup_pid" 2>/dev/null || true
      fi
      rm -f -- "$pid_file"
    fi
  done
}
trap cleanup_host EXIT INT TERM

if [[ ! "$public_url" =~ ^https://demo\.kingslanguageacademy\.pl$ ]]; then
  echo "Nieprawidłowy stały adres testowy: $public_url"
  exit 1
fi

printf '%s\n' "$public_url" >"$public_url_file"
chmod 600 "$public_url_file"
printf '%s\n' "$hosted_commit" >"$commit_file"
chmod 600 "$commit_file"

echo "Przygotowuję izolowaną kopię commita ${hosted_commit_short}..."
rm -rf -- "$runtime_dir"
mkdir -p "$runtime_dir"
git -C "$project_dir" archive --format=tar "$hosted_commit" \
  | tar -xf - -C "$runtime_dir"
cp -cR "$project_dir/node_modules" "$runtime_dir/node_modules"

node --input-type=module - \
  "$project_dir/.env" \
  "$runtime_dir/.env" \
  "$public_url" \
  "$project_dir/.data/private-files" <<'NODE'
import { chmodSync, readFileSync, writeFileSync } from "node:fs";

const [, , sourcePath, targetPath, publicUrl, privateFilesPath] = process.argv;
const allowedKeys = new Set([
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "EMAIL_FROM",
  "RESEND_API_KEY",
  "NEXT_PUBLIC_APP_RELEASE",
  "NEXT_PUBLIC_SUPPORT_EMAIL",
  "LOG_LEVEL",
  "SENTRY_DSN",
  "KLA_REQUIRE_DIRECTOR_MFA",
  "FILE_STORAGE_PROVIDER",
  "SIGNATURE_PROVIDER",
  "MESSAGE_REFRESH_MS",
  "SMS_PROVIDER",
  "SMS_API_KEY",
  "SMS_MONTHLY_LIMIT",
]);
const selected = [];

for (const line of readFileSync(sourcePath, "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && allowedKeys.has(match[1])) {
    selected.push(line);
  }
}

selected.push(`BETTER_AUTH_URL=${JSON.stringify(publicUrl)}`);
selected.push(`NEXT_PUBLIC_APP_URL=${JSON.stringify(publicUrl)}`);
selected.push(`KLA_PRIVATE_FILES_DIR=${JSON.stringify(privateFilesPath)}`);
selected.push("KLA_MAC_TEST_HOST=1");
selected.push("KLA_AUTH_RATE_LIMIT_STORAGE=memory");

writeFileSync(targetPath, `${selected.join("\n")}\n`, { mode: 0o600 });
chmodSync(targetPath, 0o600);
NODE

echo "Buduję wersję testową z adresem ${public_url}..."
: >"$build_log"
if ! (
  cd "$runtime_dir"
  npm run build
) >"$build_log" 2>&1; then
  echo "Build nie powiódł się. Ostatnie linie:"
  tail -100 "$build_log"
  exit 1
fi

standalone_server="$(
  find "$runtime_dir/.next/standalone" \
    -type f \
    -name 'server.js' \
    ! -path '*/node_modules/*' \
    -print \
    -quit
)"
if [[ -z "$standalone_server" ]]; then
  echo "Build nie zawiera samodzielnego serwera Next.js."
  exit 1
fi
standalone_dir="$(dirname "$standalone_server")"
mkdir -p "$standalone_dir/.next"
rm -rf -- "$standalone_dir/.next/static" "$standalone_dir/public"
cp -R "$runtime_dir/.next/static" "$standalone_dir/.next/static"
cp -R "$runtime_dir/public" "$standalone_dir/public"

: >"$app_log"
(
  cd "$standalone_dir"
  exec env \
    HOSTNAME=127.0.0.1 \
    PORT="$app_port" \
    node server.js
) >"$app_log" 2>&1 &
app_pid=$!
printf '%s\n' "$app_pid" >"$app_pid_file"

for attempt in {1..45}; do
  if curl --fail --silent --show-error --max-time 5 \
    "http://127.0.0.1:${app_port}/panel/logowanie" \
    >/dev/null 2>&1; then
    break
  fi
  if ! kill -0 "$app_pid" 2>/dev/null; then
    echo "Aplikacja zakończyła się podczas uruchamiania. Log:"
    tail -100 "$app_log"
    exit 1
  fi
  if [[ "$attempt" -eq 45 ]]; then
    echo "Aplikacja nie odpowiedziała lokalnie. Log:"
    tail -100 "$app_log"
    exit 1
  fi
  sleep 1
done

public_status=""
for attempt in {1..30}; do
  public_status="$(
    curl --silent \
      --output /dev/null \
      --write-out '%{http_code}' \
      --max-time 10 \
      "$public_url/panel/logowanie" \
      || true
  )"
  if [[ "$public_status" == "200" ]]; then
    break
  fi
  if [[ "$attempt" -eq 30 ]]; then
    echo "Publiczny adres nie zwrócił HTTP 200. Ostatni kod: ${public_status:-brak}"
    exit 1
  fi
  sleep 1
done

caffeinate -i -s -w "$app_pid" >/dev/null 2>&1 &
caffeinate_pid=$!
printf '%s\n' "$caffeinate_pid" >"$caffeinate_pid_file"

node --env-file="$project_dir/.env" --input-type=module - \
  "$handoff_file" \
  "$public_url" \
  "$hosted_commit_short" <<'NODE'
import { chmodSync, writeFileSync } from "node:fs";

const [, , targetPath, publicUrl, hostedCommit] = process.argv;
const demoPassword = process.env.KLA_DEMO_PASSWORD;
if (!demoPassword) {
  throw new Error("Brak KLA_DEMO_PASSWORD w prywatnym .env.");
}

const contents = [
  "eDziennik KLA — dane do tymczasowego testu",
  "",
  `Adres: ${publicUrl}/panel/logowanie`,
  `Wersja testowa: commit ${hostedCommit}`,
  "",
  "Dyrektor: dyrektor.demo@invalid.example",
  "Wykładowca: wykladowca.demo@invalid.example",
  "Rodzic: rodzic.demo@invalid.example",
  "Uczeń: uczen.panel.demo@invalid.example",
  `Wspólne hasło kont demo: ${demoPassword}`,
  "",
  "Dyrektor w bieżącym pilocie loguje się bez kodu MFA.",
  "",
  "Nie przekazuj klientce konta bog.",
  "Mac musi być włączony, podłączony do internetu i zasilania.",
  "Adres przestanie działać po zatrzymaniu tunelu lub restarcie.",
  "",
].join("\n");

writeFileSync(targetPath, contents, { mode: 0o600 });
chmodSync(targetPath, 0o600);
NODE

echo
echo "Tymczasowy host działa:"
echo "${public_url}/panel/logowanie"
echo
echo "Dane do przekazania: $handoff_file"
echo "Status: npm run host:mac:status"
echo "Zatrzymanie: npm run host:mac:stop"
echo "Stały tunel Cloudflare działa niezależnie od aplikacji."
echo "Proces nadzorujący aplikację pozostaje aktywny do zatrzymania hosta."

host_exit_status=0
while kill -0 "$app_pid" 2>/dev/null; do
  sleep 5
done
if ! kill -0 "$app_pid" 2>/dev/null; then
  host_exit_status=1
fi

echo "Aplikacja zakończyła działanie. Zamykam środowisko testowe."
exit "$host_exit_status"
