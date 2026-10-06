#!/usr/bin/env bash
# Phase 0 + Phase 1 + Phase 2 regression
set -euo pipefail

BASE="${BASE_URL:-http://127.0.0.1:3000}"
CRON_SECRET="${CRON_SECRET:-phase1-test-cron-secret}"
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

pass() { echo "✓ $*"; }
fail() { echo "✗ $*" >&2; FAILED=1; }

FAILED=0

echo "=== Phase 2 regression (includes Phase 0 + 1) ==="
CRON_SECRET="$CRON_SECRET" PUBLIC_APP_NO_AUTH=1 I_ACCEPT_OPEN_AUTH_IN_PROD=1 \
  bash apps/web/scripts/regression-phase1.sh

metrics_code=$(curl -sS -o /tmp/metrics.txt -w "%{http_code}" \
  -H "Authorization: Bearer $CRON_SECRET" "$BASE/api/metrics")
if [[ "$metrics_code" == "200" ]] && grep -q redirect_requests_total /tmp/metrics.txt; then
  pass "GET /api/metrics (authenticated) exposes redirect_requests_total"
else
  fail "metrics code=$metrics_code body=$(head -3 /tmp/metrics.txt)"
fi

ret_code=$(curl -sS -o /tmp/ret.json -w "%{http_code}" -X POST "$BASE/api/cron/retention" \
  -H "Authorization: Bearer $CRON_SECRET")
if [[ "$ret_code" == "200" ]] && grep -q '"ok":true' /tmp/ret.json; then
  pass "POST /api/cron/retention -> 200"
else
  fail "retention $ret_code $(cat /tmp/ret.json)"
fi

links_code=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE/links?page=1")
if [[ "$links_code" == "200" ]]; then
  pass "GET /links?page=1 -> 200"
else
  fail "links pagination $links_code"
fi

echo ""
if [[ "$FAILED" == "0" ]]; then
  echo "All Phase 2 regression checks passed."
  exit 0
else
  echo "Phase 2 regression failures detected."
  exit 1
fi
