#!/usr/bin/env bash

set -euo pipefail

state_dir="${KLA_MAC_TEST_STATE_DIR:-$HOME/Library/Application Support/KLA Demo Host}"
url_file="$state_dir/public-url.txt"
commit_file="$state_dir/commit.txt"
app_label="pl.kingslanguageacademy.edziennik-demo"
launch_domain="gui/$(id -u)/${app_label}"

if launchctl print "$launch_domain" 2>/dev/null | grep -q 'state = running'; then
  echo "Aplikacja: działa pod nadzorem macOS"
else
  echo "Aplikacja: zatrzymana"
fi
if launchctl print "gui/$(id -u)/com.cloudflare.cloudflared" 2>/dev/null \
  | grep -q 'state = running'; then
  echo "Stały tunel HTTPS: działa"
else
  echo "Stały tunel HTTPS: zatrzymany"
fi

if [[ -f "$commit_file" ]]; then
  hosted_commit="$(head -1 "$commit_file")"
  if [[ "$hosted_commit" =~ ^[0-9a-f]{40}$ ]]; then
    echo "Udostępniony commit: ${hosted_commit:0:12}"
  fi
fi

if [[ -f "$url_file" ]]; then
  public_url="$(head -1 "$url_file")"
  if [[ "$public_url" =~ ^https://demo\.kingslanguageacademy\.pl$ ]]; then
    secure_status="$(
      curl --silent \
        --output /dev/null \
        --write-out '%{http_code}' \
        --max-time 10 \
        "$public_url/panel/logowanie" \
        || true
    )"
    tunnel_status="$(
      curl --insecure \
        --silent \
        --output /dev/null \
        --write-out '%{http_code}' \
        --max-time 10 \
        "$public_url/panel/logowanie" \
        || true
    )"
    echo "Adres: ${public_url}/panel/logowanie"
    echo "Trasa tunelu: HTTP ${tunnel_status:-brak}"
    if [[ "$secure_status" == "200" ]]; then
      echo "Publiczny HTTPS: gotowy"
    else
      echo "Publiczny HTTPS: certyfikat Cloudflare jest jeszcze przygotowywany"
    fi
  fi
fi

echo "Log usługi: $state_dir/logs/service.log"
echo "Błędy usługi: $state_dir/logs/service-error.log"
echo "Log tunelu: $HOME/Library/Logs/com.cloudflare.cloudflared.out.log"
