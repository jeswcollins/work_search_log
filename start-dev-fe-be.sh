#!/usr/bin/env bash
# Run the Vite dev client and the Node dev server side-by-side in a single
# terminal. Each line is prefixed with [be] (backend, cyan) or [fe]
# (frontend, magenta) so the two streams are easy to read interleaved.
#
# Usage:
#   ./start-dev-fe-be.sh           # interleaved output in this terminal
#   ./start-dev-fe-be.sh --tee     # also tee to logs/be.log and logs/fe.log
#                                  # so you can `tail -f` either one elsewhere
#
# Ctrl+C stops both. On Windows Git Bash, child node processes occasionally
# linger; if so:  taskkill //F //IM node.exe

set -euo pipefail
cd "$(dirname "$0")"

USE_TEE=0
if [[ "${1:-}" == "--tee" ]]; then
  USE_TEE=1
  mkdir -p logs
fi

BE_PID=""
FE_PID=""

cleanup() {
  echo
  echo "[script] shutting down…"
  [[ -n "$BE_PID" ]] && kill "$BE_PID" 2>/dev/null || true
  [[ -n "$FE_PID" ]] && kill "$FE_PID" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# ANSI: cyan for backend, magenta for frontend. \x1b[0m resets.
prefix_be() { sed -u 's/^/\x1b[36m[be]\x1b[0m /'; }
prefix_fe() { sed -u 's/^/\x1b[35m[fe]\x1b[0m /'; }

run_be() {
  if (( USE_TEE )); then
    npm run dev:server 2>&1 | tee logs/be.log | prefix_be
  else
    npm run dev:server 2>&1 | prefix_be
  fi
}

run_fe() {
  if (( USE_TEE )); then
    npm run dev:client 2>&1 | tee logs/fe.log | prefix_fe
  else
    npm run dev:client 2>&1 | prefix_fe
  fi
}

echo "[script] backend  → http://localhost:1025  (node --watch server.js)"
echo "[script] frontend → http://localhost:5173  (vite, /api proxied to :1025)"
echo "[script] Ctrl+C to stop both."
if (( USE_TEE )); then
  echo "[script] tee enabled — view either stream alone:"
  echo "[script]   tail -f logs/be.log     # backend"
  echo "[script]   tail -f logs/fe.log     # frontend"
fi
echo

run_be &
BE_PID=$!
run_fe &
FE_PID=$!
wait
