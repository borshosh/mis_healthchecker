#!/usr/bin/env bash
# Manual scenario walkthrough for GET /api/v1/dictionaries/icd10.
# Start the backend first: cd backend && npm run dev
#
# The request counter and cache live in the backend process's memory and
# are NOT reset between scenarios here - they only reset when the backend
# process restarts. Restart the backend before "cycle" if you want a clean
# "request 1 is cold" run.
#
# Usage:
#   ./scripts/icd10-curl-tests.sh                 # run every scenario
#   ./scripts/icd10-curl-tests.sh <scenario>       # run just one scenario
#   ./scripts/icd10-curl-tests.sh help             # list scenario names
#
# BASE_URL=http://localhost:3001 ./scripts/icd10-curl-tests.sh cycle

set -u

BASE_URL="${BASE_URL:-http://localhost:3001}"

timed_request() {
  local label="$1"
  local started
  local ended
  started=$(date +%s%3N)
  local body
  body=$(curl -sS "${BASE_URL}/api/v1/dictionaries/icd10")
  ended=$(date +%s%3N)
  echo "${label}: $((ended - started))ms -> ${body}"
}

single() {
  echo
  echo "=== Single request: observe source + timing ==="
  timed_request "request"
}

cycle() {
  echo
  echo "=== 5 sequential requests: watch request #4 force a ~1000ms DB read ==="
  for i in 1 2 3 4 5; do
    timed_request "request ${i}"
  done
}

concurrent() {
  echo
  echo "=== 3 concurrent requests at whatever cache state currently is ==="
  echo "(If the cache happens to be cold, Node's event loop runs all 3"
  echo "setTimeout(1000ms) calls in parallel either way, so near-equal"
  echo "~1000ms timings alone do NOT prove request de-duplication - that"
  echo "needs server-side instrumentation, see backend/src/icd10.ts)"
  local started
  started=$(date +%s%3N)
  (timed_request "  concurrent 1") &
  (timed_request "  concurrent 2") &
  (timed_request "  concurrent 3") &
  wait
  local ended
  ended=$(date +%s%3N)
  echo "total wall time for all 3: $((ended - started))ms"
}

SCENARIOS="single cycle concurrent"

usage() {
  echo "Usage: $(basename "$0") [scenario]"
  echo
  echo "Scenarios (each can be run on its own, or omit the argument to run all):"
  echo "  single       One request - print its source (cache/db) and timing"
  echo "  cycle        5 sequential requests - watch #4 force a DB read"
  echo "  concurrent   3 requests fired at once"
}

scenario="${1:-all}"

if [ "${scenario}" = "all" ]; then
  for s in ${SCENARIOS}; do
    "${s}"
  done
elif [ "${scenario}" = "help" ] || [ "${scenario}" = "-h" ] || [ "${scenario}" = "--help" ]; then
  usage
elif echo " ${SCENARIOS} " | grep -q " ${scenario} "; then
  "${scenario}"
else
  echo "Unknown scenario: ${scenario}" >&2
  usage >&2
  exit 1
fi
