#!/usr/bin/env bash

set -euo pipefail

state_dir="${KLA_MAC_TEST_STATE_DIR:-$HOME/Library/Application Support/KLA Demo Host}"
app_label="pl.kingslanguageacademy.edziennik-demo"
launch_domain="gui/$(id -u)/${app_label}"

if launchctl print "$launch_domain" >/dev/null 2>&1; then
  launchctl bootout "$launch_domain"
  echo "Zatrzymano aplikację i jej automatyczny nadzór."
fi

echo "Aplikacja testowa na Macu jest zatrzymana."
echo "Stały tunel Cloudflare pozostaje aktywny i uruchamia się przy logowaniu."
