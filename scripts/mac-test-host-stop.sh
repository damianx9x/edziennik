#!/usr/bin/env bash

set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
state_dir="$project_dir/.data/mac-test-host"
app_label="pl.kingslanguageacademy.edziennik-demo"
launch_domain="gui/$(id -u)/${app_label}"

if launchctl print "$launch_domain" >/dev/null 2>&1; then
  launchctl bootout "$launch_domain"
  echo "Zatrzymano aplikację i jej automatyczny nadzór."
fi

echo "Aplikacja testowa na Macu jest zatrzymana."
echo "Stały tunel Cloudflare pozostaje aktywny i uruchamia się przy logowaniu."
