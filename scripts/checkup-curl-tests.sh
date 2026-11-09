#!/usr/bin/env bash
# Manual scenario walkthrough for POST /api/v1/patients/checkup (and a quick
# look at GET /api/v1/health). Start the backend first: cd backend && npm run dev
#
# Usage:
#   ./scripts/checkup-curl-tests.sh                 # run every scenario
#   ./scripts/checkup-curl-tests.sh <scenario>       # run just one scenario
#   ./scripts/checkup-curl-tests.sh help             # list scenario names
#
# BASE_URL=http://localhost:3001 ./scripts/checkup-curl-tests.sh valid

set -u

BASE_URL="${BASE_URL:-http://localhost:3001}"

run() {
  local title="$1"
  shift
  echo
  echo "=== ${title} ==="
  curl -sS -i "$@"
  echo
}

valid() {
  run "Valid payload -> 201" \
    -X POST "${BASE_URL}/api/v1/patients/checkup" \
    -H "Content-Type: application/json" \
    -d '{"patientId":"550e8400-e29b-41d4-a716-446655440000","temperature":36.6,"pulse":72,"complaints":"headache","hasInsurance":true}'
}

falsy-numbers() {
  run "Falsy numeric triggers (false/null) -> 400 with field error map, not coerced to 0" \
    -X POST "${BASE_URL}/api/v1/patients/checkup" \
    -H "Content-Type: application/json" \
    -d '{"patientId":"550e8400-e29b-41d4-a716-446655440000","temperature":false,"pulse":null,"complaints":"ok","hasInsurance":true}'
}

empty-array-number() {
  run "Empty array as a numeric field -> 400" \
    -X POST "${BASE_URL}/api/v1/patients/checkup" \
    -H "Content-Type: application/json" \
    -d '{"patientId":"550e8400-e29b-41d4-a716-446655440000","temperature":[],"pulse":72,"complaints":"ok","hasInsurance":true}'
}

invalid-uuid() {
  run "Invalid UUID for patientId -> 400" \
    -X POST "${BASE_URL}/api/v1/patients/checkup" \
    -H "Content-Type: application/json" \
    -d '{"patientId":"not-a-uuid","temperature":36.6,"pulse":72,"complaints":"ok","hasInsurance":true}'
}

proto-pollution() {
  run "Prototype-pollution attempt (__proto__ key) -> 400, request rejected outright" \
    -X POST "${BASE_URL}/api/v1/patients/checkup" \
    -H "Content-Type: application/json" \
    -d '{"patientId":"550e8400-e29b-41d4-a716-446655440000","temperature":36.6,"pulse":72,"complaints":"ok","hasInsurance":true,"__proto__":{"polluted":true}}'
}

extra-key() {
  run "Unexpected extra key -> 400" \
    -X POST "${BASE_URL}/api/v1/patients/checkup" \
    -H "Content-Type: application/json" \
    -d '{"patientId":"550e8400-e29b-41d4-a716-446655440000","temperature":36.6,"pulse":72,"complaints":"ok","hasInsurance":true,"role":"admin"}'
}

transaction-failure() {
  run "complaints contains throw_error -> 500 (simulated transaction failure)" \
    -X POST "${BASE_URL}/api/v1/patients/checkup" \
    -H "Content-Type: application/json" \
    -d '{"patientId":"550e8400-e29b-41d4-a716-446655440000","temperature":36.6,"pulse":72,"complaints":"throw_error","hasInsurance":true}'
}

payload-too-large() {
  echo
  echo "=== Payload over 100kb -> 413 ==="
  local tmp
  tmp="$(mktemp)"
  python3 -c "
import json
print(json.dumps({
    'patientId': '550e8400-e29b-41d4-a716-446655440000',
    'temperature': 36.6,
    'pulse': 72,
    'hasInsurance': True,
    'complaints': 'x' * 200000,
}))
" >"${tmp}"
  curl -sS -i -X POST "${BASE_URL}/api/v1/patients/checkup" \
    -H "Content-Type: application/json" \
    --data-binary @"${tmp}"
  echo
  rm -f "${tmp}"
}

health-cycle() {
  echo
  echo "=== GET /api/v1/health x4 (watch for the 3rd/4th-request failure injection) ==="
  for i in 1 2 3 4; do
    echo "--- request ${i} ---"
    curl -sS -i "${BASE_URL}/api/v1/health"
    echo
  done
}

SCENARIOS="valid falsy-numbers empty-array-number invalid-uuid proto-pollution extra-key transaction-failure payload-too-large health-cycle"

usage() {
  echo "Usage: $(basename "$0") [scenario]"
  echo
  echo "Scenarios (each can be run on its own, or omit the argument to run all):"
  echo "  valid                Valid payload -> 201"
  echo "  falsy-numbers        false/null numeric fields -> 400, not coerced to 0"
  echo "  empty-array-number   [] as a numeric field -> 400"
  echo "  invalid-uuid         Invalid patientId -> 400"
  echo "  proto-pollution      __proto__ key -> 400"
  echo "  extra-key            Unexpected extra key -> 400"
  echo "  transaction-failure  complaints: throw_error -> 500"
  echo "  payload-too-large    Body over 100kb -> 413"
  echo "  health-cycle         4x GET /api/v1/health"
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
