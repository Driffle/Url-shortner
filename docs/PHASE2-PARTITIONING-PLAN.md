# ClickEvent partitioning plan (future)

Phase 2 ships **retention cron** now; native monthly partitions when volume warrants it.

## Cutover (zero-downtime outline)

1. Create partitioned parent table `ClickEvent_partitioned` (same columns as `ClickEvent`).
2. Create monthly child partitions for current + next 3 months.
3. Backfill: `INSERT INTO ClickEvent_partitioned SELECT * FROM "ClickEvent" WHERE …` in batches off-peak.
4. Swap: rename `ClickEvent` → `ClickEvent_legacy`, rename partitioned table → `ClickEvent`, update FKs if any.
5. Drop legacy after validation window.

Prisma: use `@map` / manual migration SQL; Prisma does not manage partition DDL automatically.

## Until then

- `POST /api/cron/retention` deletes rows older than `CLICK_EVENT_RETENTION_DAYS`.
- Dashboards use `AnalyticsRollup` for long ranges.
