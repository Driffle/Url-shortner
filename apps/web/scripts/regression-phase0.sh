#!/usr/bin/env bash
# Phase 0 regression against docker-compose.prod stack on localhost:3000
set -euo pipefail

BASE="${BASE_URL:-http://127.0.0.1:3000}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

pass() { echo "✓ $*"; }
fail() { echo "✗ $*" >&2; FAILED=1; }

FAILED=0
SLUG="reg-$(date +%s | shasum -a 256 | cut -c1-8)"

echo "=== Phase 0 regression (BASE=$BASE, slug=$SLUG) ==="

# Liveness / readiness
code=$(curl -sS -o /tmp/hl.json -w "%{http_code}" "$BASE/api/health")
if [[ "$code" == "200" ]]; then pass "GET /api/health -> 200"; else fail "GET /api/health -> $code"; fi

code=$(curl -sS -o /tmp/rd.json -w "%{http_code}" "$BASE/api/health/ready")
if [[ "$code" == "200" ]] && grep -q '"ok":true' /tmp/rd.json; then
  pass "GET /api/health/ready -> 200 ok"
else
  fail "GET /api/health/ready -> $code $(cat /tmp/rd.json)"
fi

# Unknown slug + negative cache (two 404s)
miss="miss-$RANDOM$RANDOM"
c1=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE/r/$miss")
c2=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE/r/$miss")
if [[ "$c1" == "404" && "$c2" == "404" ]]; then pass "unknown /r/ slug -> 404 (x2)"; else fail "/r/ miss $c1 $c2"; fi

# Seed link in Postgres
USER_ID=$(docker compose -f "$COMPOSE_FILE" exec -T db psql -U postgres -d driffle_links -tAc \
  "SELECT id FROM \"User\" LIMIT 1;" | tr -d '[:space:]')
if [[ -z "$USER_ID" ]]; then
  USER_ID=$(docker compose -f "$COMPOSE_FILE" exec -T db psql -U postgres -d driffle_links -tAc \
    "INSERT INTO \"User\" (id, email, role, \"createdAt\", \"updatedAt\")
     VALUES ('reguser1', 'regtest@driffle.com', 'ADMIN', NOW(), NOW())
     ON CONFLICT (email) DO UPDATE SET email=EXCLUDED.email
     RETURNING id;" | tr -d '[:space:]')
fi

docker compose -f "$COMPOSE_FILE" exec -T db psql -U postgres -d driffle_links -v ON_ERROR_STOP=1 -c \
  "DELETE FROM \"Link\" WHERE slug = '$SLUG';
   INSERT INTO \"Link\" (id, slug, \"destinationUrl\", status, \"createdById\", \"clickCount\", \"visitCount\", \"uniqueClickEst\", \"createdAt\", \"updatedAt\")
   VALUES ('link-$SLUG', '$SLUG', 'https://driffle.com/', 'ACTIVE', '$USER_ID', 0, 0, 0, NOW(), NOW());" >/dev/null

loc=$(curl -sS -o /dev/null -w "%{http_code} %{redirect_url}" "$BASE/r/$SLUG")
if echo "$loc" | grep -q "302.*https://driffle.com/"; then pass "/r/ ACTIVE -> 302 driffle.com"; else fail "/r/ ACTIVE $loc"; fi

go=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE/go/$SLUG")
if [[ "$go" == "200" ]]; then pass "/go/ ACTIVE -> 200"; else fail "/go/ ACTIVE -> $go"; fi

# Pause in DB + invalidate slug cache (same as link.service delete/update)
docker compose -f "$COMPOSE_FILE" exec -T db psql -U postgres -d driffle_links -c \
  "UPDATE \"Link\" SET status = 'PAUSED' WHERE slug = '$SLUG';" >/dev/null
docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli DEL "dl:slug:$SLUG" "dl:slug:miss:$SLUG" >/dev/null

gone=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE/r/$SLUG")
if [[ "$gone" == "410" ]]; then pass "PAUSED + cache bust -> 410"; else fail "PAUSED expected 410 got $gone"; fi

# CSV export (open auth: should 200)
csv_code=$(curl -sS -o /tmp/links.csv -w "%{http_code}" "$BASE/api/export/links")
if [[ "$csv_code" == "200" ]] && head -1 /tmp/links.csv | grep -q short_url_go && grep -q "/go/$SLUG" /tmp/links.csv; then
  pass "CSV export has short_url_go and /go/ path"
else
  fail "CSV export code=$csv_code header=$(head -1 /tmp/links.csv)"
fi

# Rate limit headers sanity: burst should not 429 immediately
burst_ok=1
for _ in $(seq 1 20); do
  c=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE/r/$SLUG")
  if [[ "$c" == "429" ]]; then burst_ok=0; break; fi
done
if [[ "$burst_ok" == "1" ]]; then pass "20 sequential /r/ not rate-limited"; else fail "unexpected 429 on 20 sequential hits"; fi

echo ""
if [[ "$FAILED" == "0" ]]; then
  echo "All regression checks passed."
  exit 0
else
  echo "Regression failures detected."
  exit 1
fi
