#!/usr/bin/env bash

#
#  merlin-box - A sing-box + smartdns routing and proxy script solution for ASUSWRT-Merlin routers.
#  Copyright (C) 2026 LandDuck <https://github.com/LandDuck/>
#
#  This program is free software: you can redistribute it and/or modify
#  it under the terms of the GNU General Public License as published by
#  the Free Software Foundation, either version 3 of the License, or
#  (at your option) any later version.
#
#  This program is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU General Public License for more details.
#
#  You should have received a copy of the GNU General Public License
#  along with this program.  If not, see <https://www.gnu.org/licenses/>.
#

# 用于在 WSL 中开发调试
# 参考 run-dev.ps1，同步启动 Go 后端（air）和前端 watch

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PORT="${PORT:-65006}"

export APP_ENV=development
export PATH="$(go env GOPATH 2>/dev/null)/bin:$PATH"

if ! command -v air >/dev/null 2>&1; then
  echo "[run.sh] Installing air..."
  go install github.com/air-verse/air@latest
fi

mkdir -p "$SCRIPT_DIR/server/tmp"

cleanup() {
  if [ -n "${BACKEND_PID:-}" ]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [ -n "${FRONTEND_PID:-}" ]; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "[run.sh] Starting Go backend with air on port ${PORT}..."
(
  cd -- "$SCRIPT_DIR/server"
  air \
    --build.cmd "go build -tags development -o ./tmp/main.exe ." \
    --build.bin "./tmp/main.exe" \
    --build.args_bin server \
    --build.args_bin --port \
    --build.args_bin "$PORT"
) &
BACKEND_PID=$!

if [ ! -d "$SCRIPT_DIR/front/node_modules" ]; then
  echo "[run.sh] Installing front-end dependencies..."
  (
    cd -- "$SCRIPT_DIR/front"
    npm install --no-fund --no-audit
  )
fi

echo "[run.sh] Starting front-end watch..."
(
  cd -- "$SCRIPT_DIR/front"
  npx gulp watch
) &
FRONTEND_PID=$!

wait "$BACKEND_PID" "$FRONTEND_PID"
