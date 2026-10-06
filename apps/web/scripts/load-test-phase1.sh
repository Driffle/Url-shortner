#!/usr/bin/env bash
# Lightweight load test: redirect QPS + enqueue latency proxy via worker drain time
set -euo pipefail

BASE="${BASE_URL:-http://127.0.0.1:3000}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
REQUESTS="${LOAD_REQUESTS:-200}"
CONCURRENCY="${LOAD_CONCURRENCY:-20}"
SLUG="${LOAD_SLUG:-}"

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

if [[ -z "$SLUG" ]]; then
  SLUG="load-$(date +%s | shasum -a 256 | cut -c1-8)"
  LINK_ID="cl$(echo -n "$SLUG" | shasum -a 256 | cut -c1-23)"
  USER_ID=$(docker compose -f "$COMPOSE_FILE" exec -T db psql -U postgres -d driffle_links -tAc \
    "SELECT id FROM \"User\" LIMIT 1;" | tr -d '[:space:]')
  docker compose -f "$COMPOSE_FILE" exec -T db psql -U postgres -d driffle_links -v ON_ERROR_STOP=1 -c \
    "INSERT INTO \"Link\" (id, slug, \"destinationUrl\", status, \"createdById\", \"clickCount\", \"visitCount\", \"uniqueClickEst\", \"createdAt\", \"updatedAt\")
     VALUES ('$LINK_ID', '$SLUG', 'https://driffle.com/', 'ACTIVE', '$USER_ID', 0, 0, 0, NOW(), NOW())
     ON CONFLICT (slug) DO NOTHING;" >/dev/null
  docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli DEL "dl:slug:$SLUG" >/dev/null
fi

echo "=== Load test slug=$SLUG requests=$REQUESTS concurrency=$CONCURRENCY ==="

start=$(python3 - <<'PY'
import time
print(time.time())
PY
)

export SLUG BASE REQUESTS CONCURRENCY
python3 - <<'PY'
import os, time, urllib.request, concurrent.futures

base = os.environ["BASE"]
slug = os.environ["SLUG"]
n = int(os.environ["REQUESTS"])
workers = int(os.environ["CONCURRENCY"])

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

opener = urllib.request.build_opener(NoRedirect)

def hit(_):
    req = urllib.request.Request(
        f"{base}/r/{slug}",
        headers={"User-Agent": "LoadTest/phase1"},
        method="GET",
    )
    t0 = time.perf_counter()
    try:
        with opener.open(req, timeout=10) as r:
            code = r.status
    except urllib.error.HTTPError as e:
        code = e.code
    except urllib.error.URLError:
        code = 0
    ms = (time.perf_counter() - t0) * 1000
    return code, ms

codes = {}
latencies = []
with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as ex:
    for code, ms in ex.map(hit, range(n)):
        codes[code] = codes.get(code, 0) + 1
        latencies.append(ms)

latencies.sort()
p50 = latencies[int(len(latencies) * 0.5)]
p95 = latencies[int(len(latencies) * 0.95)]
elapsed = max(latencies) / 1000
print(f"redirect_codes={codes}")
print(f"redirect_latency_ms_p50={p50:.1f} p95={p95:.1f}")
PY

echo "Waiting for worker to catch up..."
sleep 8
stream_len=$(docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli XLEN "dl:stream:clicks" | tr -d '[:space:]')
echo "redis_stream_length=$stream_len"

echo "Load test complete."
