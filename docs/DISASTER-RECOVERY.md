# Disaster recovery — Driffle Links (Shortly)

Internal tool targets; tune RTO/RPO with infra owners.

## Data stores

| Store | Backup | RPO (target) | Notes |
|-------|--------|--------------|-------|
| **Postgres** (`driffle_url_shortner`) | Deployer / host volume snapshots | Best effort 24h | Links, rollups, users — source of truth |
| **Redis** | AOF on volume; not authoritative | N/A for clicks | Stream may replay from worker; slug cache rebuilds on miss |

## Redis production settings

Compose sets `maxmemory` + `volatile-lru` on cache keys. Click stream uses `MAXLEN ~` (Phase 1).

## Recovery steps (outline)

1. Restore Postgres volume or replay provider backup into `driffle_url_shortner`.
2. Redeploy app via Deployer (`pull` + `force` if needed).
3. Confirm `GET /api/health/ready` and a sample `/r/{slug}` redirect.
4. Run `POST /api/cron/rollup` once if click backlog exists.

## Secrets rotation

Rotate in Deployer user env, redeploy:

- `NEXTAUTH_SECRET` / `AUTH_SECRET` (invalidates sessions; visitor hashes rotate daily anyway)
- `CRON_SECRET` (update cron caller + metrics scraper)

Document rotation date in internal runbook.
