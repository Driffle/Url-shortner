#!/usr/bin/env bash
# Phase 0 + Phase 1 regression (async click stream + worker + rollup)
set -euo pipefail

BASE="${BASE_URL:-http://127.0.0.1:3000}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
CRON_SECRET="${CRON_SECRET:-phase1-test-cron-secret}"
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

pass() { echo "✓ $*"; }
fail() { echo "✗ $*" >&2; FAILED=1; }

FAILED=0
SLUG="p1-$(date +%s | shasum -a 256 | cut -c1-8)"
LINK_ID="cl$(echo -n "$SLUG" | shasum -a 256 | cut -c1-23)"

echo "=== Phase 1 regression (BASE=$BASE, slug=$SLUG) ==="

# Phase 0 checks
PUBLIC_APP_NO_AUTH=1 I_ACCEPT_OPEN_AUTH_IN_PROD=1 CRON_SECRET="$CRON_SECRET" \
  bash apps/web/scripts/regression-phase0.sh

USER_ID=$(docker compose -f "$COMPOSE_FILE" exec -T db psql -U postgres -d driffle_links -tAc \
  "SELECT id FROM \"User\" LIMIT 1;" | tr -d '[:space:]')

docker compose -f "$COMPOSE_FILE" exec -T db psql -U postgres -d driffle_links -v ON_ERROR_STOP=1 -c \
  "DELETE FROM \"ClickEvent\" WHERE \"linkId\" = '$LINK_ID';
   DELETE FROM \"Link\" WHERE slug = '$SLUG';
   INSERT INTO \"Link\" (id, slug, \"destinationUrl\", status, \"createdById\", \"clickCount\", \"visitCount\", \"uniqueClickEst\", \"createdAt\", \"updatedAt\")
   VALUES ('$LINK_ID', '$SLUG', 'https://driffle.com/', 'ACTIVE', '$USER_ID', 0, 0, 0, NOW(), NOW());" >/dev/null

docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli DEL "dl:slug:$SLUG" >/dev/null

before=$(docker compose -f "$COMPOSE_FILE" exec -T db psql -U postgres -d driffle_links -tAc \
  "SELECT \"clickCount\" FROM \"Link\" WHERE id = '$LINK_ID';" | tr -d '[:space:]')

for i in $(seq 1 5); do
  curl -sS -o /dev/null -w "" -A "Phase1Test/same-visitor" "$BASE/r/$SLUG"
done

echo "Waiting for click-worker to drain stream..."
deadline=$((SECONDS + 45))
clicks_ok=0
while [[ $SECONDS -lt $deadline ]]; do
  count=$(docker compose -f "$COMPOSE_FILE" exec -T db psql -U postgres -d driffle_links -tAc \
    "SELECT COUNT(*) FROM \"ClickEvent\" WHERE \"linkId\" = '$LINK_ID';" | tr -d '[:space:]')
  cc=$(docker compose -f "$COMPOSE_FILE" exec -T db psql -U postgres -d driffle_links -tAc \
    "SELECT \"clickCount\" FROM \"Link\" WHERE id = '$LINK_ID';" | tr -d '[:space:]')
  if [[ "$count" == "5" && "$cc" == "5" ]]; then
    clicks_ok=1
    break
  fi
  sleep 2
done

if [[ "$clicks_ok" == "1" ]]; then
  pass "5 redirects -> 5 ClickEvent rows and clickCount=5 (was $before)"
else
  ev_count=$(docker compose -f "$COMPOSE_FILE" exec -T db psql -U postgres -d driffle_links -tAc \
    "SELECT COUNT(*) FROM \"ClickEvent\" WHERE \"linkId\" = '$LINK_ID';" | tr -d '[:space:]')
  fail "expected 5 click events; got count=$ev_count clickCount=$cc"
fi

# Idempotent rollup + unique visitors (same UA/IP day bucket -> 1 unique)
rollup_code=$(curl -sS -o /tmp/rollup.json -w "%{http_code}" -X POST "$BASE/api/cron/rollup?lookbackDays=3" \
  -H "Authorization: Bearer $CRON_SECRET")
body=$(cat /tmp/rollup.json)
code="$rollup_code"
if [[ "$code" == "200" ]] && echo "$body" | grep -q '"ok":true'; then
  pass "POST /api/cron/rollup -> 200"
else
  fail "rollup $code $body"
fi

unique=$(docker compose -f "$COMPOSE_FILE" exec -T db psql -U postgres -d driffle_links -tAc \
  "SELECT \"uniqueClicks\" FROM \"AnalyticsRollup\"
   WHERE \"scopeType\" = 'LINK' AND \"scopeId\" = '$LINK_ID'
   ORDER BY \"bucketStart\" DESC LIMIT 1;" | tr -d '[:space:]')
if [[ "$unique" == "1" ]]; then
  pass "rollup uniqueClicks=1 for 5 same-visitor clicks"
else
  fail "expected uniqueClicks=1 got $unique"
fi

# Re-run rollup (idempotent)
rollup2=$(curl -sS -o /tmp/rollup2.json -w "%{http_code}" -X POST "$BASE/api/cron/rollup?lookbackDays=3" \
  -H "Authorization: Bearer $CRON_SECRET")
unique2=$(docker compose -f "$COMPOSE_FILE" exec -T db psql -U postgres -d driffle_links -tAc \
  "SELECT \"uniqueClicks\" FROM \"AnalyticsRollup\"
   WHERE \"scopeType\" = 'LINK' AND \"scopeId\" = '$LINK_ID'
   ORDER BY \"bucketStart\" DESC LIMIT 1;" | tr -d '[:space:]')
if [[ "$rollup2" == "200" && "$unique2" == "1" ]]; then
  pass "rollup re-run idempotent (uniqueClicks still 1)"
else
  fail "rollup idempotency rollup2=$rollup2 unique=$unique2"
fi

echo ""
if [[ "$FAILED" == "0" ]]; then
  echo "All Phase 1 regression checks passed."
  exit 0
else
  echo "Phase 1 regression failures detected."
  exit 1
fi
