#!/usr/bin/env bash

set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
state_dir="$project_dir/.data/mac-test-host"
url_file="$state_dir/public-url.txt"
commit_file="$state_dir/commit.txt"

read_status() {
  local label="$1"
  local pid_file="$2"
  if [[ ! -f "$pid_file" ]]; then
    echo "${label}: zatrzymany"
    return
  fi

  local process_pid
  process_pid="$(tr -cd '0-9' <"$pid_file")"
  if [[ -n "$process_pid" ]] && kill -0 "$process_pid" 2>/dev/null; then
    echo "${label}: działa (PID ${process_pid})"
  else
    echo "${label}: zatrzymany"
  fi
}

read_status "Aplikacja" "$state_dir/app.pid"
if launchctl print "gui/$(id -u)/com.cloudflare.cloudflared" 2>/dev/null \
  | grep -q 'state = running'; then
  echo "Stały tunel HTTPS: działa"
else
  echo "Stały tunel HTTPS: zatrzymany"
fi
read_status "Blokada uśpienia" "$state_dir/caffeinate.pid"

if [[ -f "$commit_file" ]]; then
  hosted_commit="$(head -1 "$commit_file")"
  if [[ "$hosted_commit" =~ ^[0-9a-f]{40}$ ]]; then
    echo "Udostępniony commit: ${hosted_commit:0:12}"
  fi
fi

if [[ -f "$url_file" ]]; then
  public_url="$(head -1 "$url_file")"
  if [[ "$public_url" =~ ^https://demo\.kingslanguageacademy\.pl$ ]]; then
    http_status="$(
      curl --silent \
        --output /dev/null \
        --write-out '%{http_code}' \
        --max-time 10 \
        "$public_url/panel/logowanie" \
        || true
    )"
    echo "Adres: ${public_url}/panel/logowanie"
    echo "Odpowiedź publiczna: HTTP ${http_status:-brak}"
  fi
fi

echo "Log aplikacji: $state_dir/logs/app.log"
echo "Log tunelu: $HOME/Library/Logs/com.cloudflare.cloudflared.out.log"
