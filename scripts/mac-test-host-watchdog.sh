#!/usr/bin/env bash

set -euo pipefail

state_dir="${1:?Brak katalogu usługi.}"
app_port="${2:-3100}"
app_label="pl.kingslanguageacademy.edziennik-demo"
launch_domain="gui/$(id -u)/${app_label}"
failure_file="$state_dir/health-failures.txt"
watchdog_log="$state_dir/logs/watchdog.log"
public_url_file="$state_dir/public-url.txt"
cloudflared_domain="gui/$(id -u)/com.cloudflare.cloudflared"

local_status="$(
  curl --silent \
    --output /dev/null \
    --write-out '%{http_code}' \
    --max-time 8 \
    "http://127.0.0.1:${app_port}/api/health" \
    || true
)"
public_status=""
if [[ -f "$public_url_file" ]]; then
  public_url="$(head -1 "$public_url_file")"
  if [[ "$public_url" =~ ^https://demo\.kingslanguageacademy\.pl$ ]]; then
    public_status="$(
      curl --silent \
        --output /dev/null \
        --write-out '%{http_code}' \
        --max-time 10 \
        "$public_url/api/health" \
        || true
    )"
  fi
fi

if [[ "$local_status" == "200" && "$public_status" == "200" ]]; then
  printf '0\n' >"$failure_file"
  exit 0
fi

failures=0
if [[ -f "$failure_file" ]]; then
  read -r failures <"$failure_file" || failures=0
fi
if [[ ! "$failures" =~ ^[0-9]+$ ]]; then
  failures=0
fi
failures=$((failures + 1))
printf '%s\n' "$failures" >"$failure_file"
printf '%s local HTTP %s, public HTTP %s, próba %s/3\n' \
  "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" \
  "${local_status:-brak}" \
  "${public_status:-brak}" \
  "$failures" >>"$watchdog_log"

if [[ "$failures" -lt 3 ]]; then
  exit 0
fi

printf '0\n' >"$failure_file"
if [[ "$local_status" != "200" ]]; then
  printf '%s restart aplikacji po trzech błędach zdrowia\n' \
    "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" >>"$watchdog_log"
  launchctl kickstart -k "$launch_domain"
else
  printf '%s restart tunelu po trzech błędach publicznego HTTPS\n' \
    "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" >>"$watchdog_log"
  launchctl kickstart -k "$cloudflared_domain"
fi
