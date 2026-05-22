#!/usr/bin/env bash
# Poll an HTTP URL until it returns 200 or the timeout elapses.
# Usage: ./wait-for.sh <url> <timeout-seconds>

set -euo pipefail

url="${1:?Usage: wait-for.sh <url> <timeout-seconds>}"
timeout="${2:-60}"
elapsed=0
interval=2

while [ "$elapsed" -lt "$timeout" ]; do
  if curl -fsS -o /dev/null "$url"; then
    echo "OK ($url)"
    exit 0
  fi
  sleep "$interval"
  elapsed=$((elapsed + interval))
done

echo "Timeout after ${timeout}s waiting for $url" >&2
exit 1
