# Phase 2 — Scale, observability & data lifecycle

Operational guide for [Issue #32](https://github.com/Driffle/Url-shortner/issues/32).

## Connection pooling

| Mode | When | `DATABASE_URL` |
|------|------|----------------|
| **Direct** (default) | Single `web` replica on Deployer | Platform Postgres + `connection_limit=10` per process |
| **PgBouncer** | 2+ `web` replicas | `docker compose --profile pooling up`; set `DATABASE_HOST=pgbouncer` and append `&pgbouncer=true` |

**Replica budget (example):** Postgres `max_connections=100`, reserve 20 for admin → 80 app slots. With `connection_limit=10` per container: **≤8** combined `web` + `click-worker` instances (worker uses ~5–10).

See also [DEPLOYER-NETWORK.md](./DEPLOYER-NETWORK.md).

## Observability

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /api/health/ready` | Public | Liveness for Deployer |
| `GET /api/metrics` | `Authorization: Bearer $CRON_SECRET` | Prometheus text: redirect totals, cache hit ratio, queue depth |

**Structured logs:** `redirect`, `click_enqueue`, `click_ingest_batch`, `rollup_run`, `click_retention_run`.

**SigNoz:** Deployer injects `OTEL_*` into `web` / `click-worker` when platform OTEL is enabled.

### Suggested alerts

- Readiness not OK for > 2 minutes
- `click_queue_depth` or `click_legacy_queue_depth` > 10_000
- `click_ingest_batch_failures` increasing over 15 minutes
- Redis memory > 80% (host / provider dashboard)

## Cron jobs

| Job | Schedule | Call |
|-----|----------|------|
| Rollups | Every 5–15 min | `POST /api/cron/rollup` |
| Raw click retention | Weekly | `POST /api/cron/retention` |

Both use `Authorization: Bearer $CRON_SECRET`.

Env: `CLICK_EVENT_RETENTION_DAYS` (default **180**). Rollups are **not** deleted.

## Click data lifecycle

1. **Now:** batched delete via retention cron (raw `ClickEvent` only).
2. **Future (high volume):** monthly native PostgreSQL partitions — see [ARCHITECTURE.md](./ARCHITECTURE.md) §19.

Analytics dashboards should prefer **rollups** for ranges > 30 days (`AnalyticsRepository` caches rollup reads in Redis).

## Redirect optimizations

- Negative slug cache (60s)
- Singleflight lock on cache miss (`slug:lock:{slug}`)
- Explicit cache invalidation on link PATCH (Phase 0)

## Security

- Rate limits use **`cf-connecting-ip`** when behind Cloudflare.
- App shell security headers in `next.config.ts` (HSTS, frame deny, nosniff).

## Disaster recovery

See [DISASTER-RECOVERY.md](./DISASTER-RECOVERY.md).
