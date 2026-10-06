#!/usr/bin/env bash
# Phase 0–2 + Issue #36 UX/read regression
set -euo pipefail

BASE="${BASE_URL:-http://127.0.0.1:3000}"
CRON_SECRET="${CRON_SECRET:-phase1-test-cron-secret}"
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

pass() { echo "✓ $*"; }
fail() { echo "✗ $*" >&2; FAILED=1; }

FAILED=0

echo "=== Phase 3 / #36 regression ==="
CRON_SECRET="$CRON_SECRET" PUBLIC_APP_NO_AUTH=1 I_ACCEPT_OPEN_AUTH_IN_PROD=1 \
  bash apps/web/scripts/regression-phase2.sh

code=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE/analytics?range=7d")
if [[ "$code" == "200" ]]; then pass "GET /analytics?range=7d -> 200"; else fail "analytics range 7d -> $code"; fi

code=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE/dashboard?range=14d")
if [[ "$code" == "200" ]]; then pass "GET /dashboard?range=14d -> 200"; else fail "dashboard range -> $code"; fi

search_code=$(curl -sS -o /tmp/linksearch.json -w "%{http_code}" "$BASE/api/links/search?q=reg")
if [[ "$search_code" == "200" ]] && grep -q '"links"' /tmp/linksearch.json; then
  pass "GET /api/links/search -> 200"
else
  fail "link search $search_code"
fi

links_q=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE/links?q=driffle&page=1")
if [[ "$links_q" == "200" ]]; then pass "GET /links?q=… -> 200"; else fail "links search $links_q"; fi

rollup=$(curl -sS -o /tmp/rbump.json -w "%{http_code}" -X POST "$BASE/api/cron/rollup?lookbackDays=3" \
  -H "Authorization: Bearer $CRON_SECRET")
if [[ "$rollup" == "200" ]]; then pass "rollup triggers cache version bump path"; else fail "rollup $rollup"; fi

echo ""
if [[ "$FAILED" == "0" ]]; then
  echo "All Phase 3 regression checks passed."
  exit 0
else
  echo "Phase 3 regression failures detected."
  exit 1
fi
