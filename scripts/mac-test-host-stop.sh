#!/usr/bin/env bash

set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
state_dir="$project_dir/.data/mac-test-host"

stop_process() {
  local label="$1"
  local pid_file="$2"
  local expected_command="$3"

  if [[ ! -f "$pid_file" ]]; then
    return
  fi

  local process_pid
  process_pid="$(tr -cd '0-9' <"$pid_file")"
  if [[ -z "$process_pid" ]] || ! kill -0 "$process_pid" 2>/dev/null; then
    rm -f -- "$pid_file"
    return
  fi

  local process_command
  process_command="$(ps -p "$process_pid" -o command= || true)"
  if [[ "$process_command" != *"$expected_command"* ]]; then
    echo "Nie zatrzymuję PID ${process_pid}: nie pasuje do procesu ${label}."
    return
  fi

  kill "$process_pid"
  for attempt in {1..20}; do
    if ! kill -0 "$process_pid" 2>/dev/null; then
      break
    fi
    sleep 0.25
  done
  if kill -0 "$process_pid" 2>/dev/null; then
    kill -9 "$process_pid"
  fi
  rm -f -- "$pid_file"
  echo "Zatrzymano: $label."
}

stop_process \
  "aplikację" \
  "$state_dir/app.pid" \
  "next-server"
stop_process \
  "blokadę uśpienia" \
  "$state_dir/caffeinate.pid" \
  "caffeinate"

echo "Aplikacja testowa na Macu jest zatrzymana."
echo "Stały tunel Cloudflare pozostaje aktywny i uruchamia się przy logowaniu."
