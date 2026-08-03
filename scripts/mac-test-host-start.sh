#!/usr/bin/env bash

set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
state_dir="${KLA_MAC_TEST_STATE_DIR:-$HOME/Library/Application Support/KLA Demo Host}"
runtime_dir="$state_dir/runtime"
logs_dir="$state_dir/logs"
build_log="$logs_dir/build.log"
service_log="$logs_dir/service.log"
service_error_log="$logs_dir/service-error.log"
public_url_file="$state_dir/public-url.txt"
handoff_file="$state_dir/PRZEKAZ_KLIENTCE.txt"
commit_file="$state_dir/commit.txt"
server_dir_file="$state_dir/server-dir.txt"
installed_service_script="$state_dir/mac-test-host-app-service.sh"
installed_watchdog_script="$state_dir/mac-test-host-watchdog.sh"
app_port="${KLA_MAC_TEST_PORT:-3100}"
public_url="${KLA_MAC_TEST_PUBLIC_URL:-https://demo.kingslanguageacademy.pl}"
app_label="pl.kingslanguageacademy.edziennik-demo"
watchdog_label="pl.kingslanguageacademy.edziennik-demo-watchdog"
launch_agent_file="$HOME/Library/LaunchAgents/${app_label}.plist"
watchdog_agent_file="$HOME/Library/LaunchAgents/${watchdog_label}.plist"
launch_domain="gui/$(id -u)/${app_label}"
watchdog_domain="gui/$(id -u)/${watchdog_label}"

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

mkdir -p "$state_dir" "$logs_dir"
chmod 700 "$state_dir" "$logs_dir"

hosted_commit="$(git -C "$project_dir" rev-parse --verify HEAD)"
hosted_commit_short="$(git -C "$project_dir" rev-parse --short=12 HEAD)"
node_path="$(command -v node)"

"$project_dir/scripts/mac-test-host-database.sh" "$project_dir" "$node_path"

echo "Sprawdzam i stosuję migracje bazy..."
if ! (
  cd "$project_dir"
  npm run db:migrate:deploy
) >"$logs_dir/migrate.log" 2>&1; then
  echo "Migracje nie powiodły się. Ostatnie linie:"
  tail -100 "$logs_dir/migrate.log"
  exit 1
fi

node --env-file="$project_dir/.env" \
  "$project_dir/scripts/apply-director-mfa-policy.mjs"

if ! launchctl print "gui/$(id -u)/com.cloudflare.cloudflared" 2>/dev/null \
  | grep -q 'state = running'; then
  echo "Stały tunel Cloudflare nie działa."
  echo "Uruchom usługę kla-demo i spróbuj ponownie."
  exit 1
fi

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
  "$state_dir/private-files" <<'NODE'
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

printf '%s\n' "$standalone_dir" >"$server_dir_file"
chmod 600 "$server_dir_file"
cp "$project_dir/scripts/mac-test-host-app-service.sh" "$installed_service_script"
chmod 700 "$installed_service_script"
cp "$project_dir/scripts/mac-test-host-watchdog.sh" "$installed_watchdog_script"
chmod 700 "$installed_watchdog_script"

mkdir -p "$HOME/Library/LaunchAgents"
node --input-type=module - \
  "$launch_agent_file" \
  "$app_label" \
  "$installed_service_script" \
  "$state_dir" \
  "$node_path" \
  "$app_port" \
  "$service_log" \
  "$service_error_log" <<'NODE'
import { chmodSync, writeFileSync } from "node:fs";

const [
  ,
  ,
  targetPath,
  label,
  serviceScript,
  projectDir,
  nodePath,
  port,
  stdoutPath,
  stderrPath,
] = process.argv;
const xml = (value) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const contents = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${xml(label)}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${xml(serviceScript)}</string>
    <string>${xml(projectDir)}</string>
    <string>${xml(nodePath)}</string>
    <string>${xml(port)}</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>HOSTNAME</key>
    <string>127.0.0.1</string>
    <key>PORT</key>
    <string>${xml(port)}</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ThrottleInterval</key>
  <integer>5</integer>
  <key>ProcessType</key>
  <string>Interactive</string>
  <key>StandardOutPath</key>
  <string>${xml(stdoutPath)}</string>
  <key>StandardErrorPath</key>
  <string>${xml(stderrPath)}</string>
</dict>
</plist>
`;

writeFileSync(targetPath, contents, { mode: 0o600 });
chmodSync(targetPath, 0o600);
NODE

node --input-type=module - \
  "$watchdog_agent_file" \
  "$watchdog_label" \
  "$installed_watchdog_script" \
  "$state_dir" \
  "$app_port" \
  "$logs_dir/watchdog-service.log" \
  "$logs_dir/watchdog-service-error.log" <<'NODE'
import { chmodSync, writeFileSync } from "node:fs";

const [
  ,
  ,
  targetPath,
  label,
  watchdogScript,
  stateDir,
  port,
  stdoutPath,
  stderrPath,
] = process.argv;
const xml = (value) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const contents = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${xml(label)}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${xml(watchdogScript)}</string>
    <string>${xml(stateDir)}</string>
    <string>${xml(port)}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>StartInterval</key>
  <integer>30</integer>
  <key>ProcessType</key>
  <string>Background</string>
  <key>StandardOutPath</key>
  <string>${xml(stdoutPath)}</string>
  <key>StandardErrorPath</key>
  <string>${xml(stderrPath)}</string>
</dict>
</plist>
`;

writeFileSync(targetPath, contents, { mode: 0o600 });
chmodSync(targetPath, 0o600);
NODE

launchctl bootout "$watchdog_domain" >/dev/null 2>&1 || true
launchctl bootout "$launch_domain" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$launch_agent_file"
launchctl kickstart -k "$launch_domain"
launchctl bootstrap "gui/$(id -u)" "$watchdog_agent_file"

for attempt in {1..45}; do
  if curl --fail --silent --show-error --max-time 5 \
    "http://127.0.0.1:${app_port}/api/health" \
    >/dev/null 2>&1; then
    break
  fi
  if ! launchctl print "$launch_domain" 2>/dev/null \
    | grep -q 'state = running'; then
    echo "Aplikacja zakończyła się podczas uruchamiania. Log:"
    tail -100 "$service_error_log" "$service_log" 2>/dev/null || true
    exit 1
  fi
  if [[ "$attempt" -eq 45 ]]; then
    echo "Aplikacja nie odpowiedziała lokalnie. Log:"
    tail -100 "$service_error_log" "$service_log" 2>/dev/null || true
    exit 1
  fi
  sleep 1
done

public_status=""
for attempt in {1..30}; do
  public_status="$(
    curl --insecure \
      --silent \
      --output /dev/null \
      --write-out '%{http_code}' \
      --max-time 10 \
      "$public_url/api/health" \
      || true
  )"
  if [[ "$public_status" == "200" ]]; then
    break
  fi
  if [[ "$attempt" -eq 30 ]]; then
    echo "Tunel nie przekazał żądania do aplikacji. Ostatni kod: ${public_status:-brak}"
    exit 1
  fi
  sleep 1
done

tls_status="$(
  curl --silent \
    --output /dev/null \
    --write-out '%{http_code}' \
    --max-time 10 \
    "$public_url/api/health" \
    || true
)"

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
echo "Tymczasowy host i tunel działają:"
echo "${public_url}/panel/logowanie"
if [[ "$tls_status" != "200" ]]; then
  echo
  echo "Cloudflare przygotowuje jeszcze certyfikat HTTPS dla nowej subdomeny."
  echo "Aplikacja pozostaje uruchomiona. Sprawdź później: npm run host:mac:status"
fi
echo
echo "Dane do przekazania: $handoff_file"
echo "Status: npm run host:mac:status"
echo "Zatrzymanie: npm run host:mac:stop"
echo "macOS pilnuje aplikacji i tunelu oraz uruchomi je ponownie po awarii."
