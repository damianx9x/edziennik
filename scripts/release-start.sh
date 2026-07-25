#!/usr/bin/env bash

set -euo pipefail

app_host="${APP_HOST:-0.0.0.0}"
app_port="${APP_PORT:-3000}"

HOSTNAME="$app_host" PORT="$app_port" node server.js
