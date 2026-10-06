# Deployer + existing Postgres (migration baseline)

Production **Shortly** (`driffle_url_shortner` on platform Postgres) was created with **`prisma db push`**. Phase 0 adds **`prisma/migrations/20261005120000_init`**. You must **not** run that SQL on the live DB (tables already exist).

Use **baseline**: tell Prisma the init migration is already applied, then use **`migrate deploy`** only for **new** migrations.

## Deployer settings

| Setting | Value |
|--------|--------|
| Compose service | **`web`** (see [DEPLOYER-NETWORK.md](./DEPLOYER-NETWORK.md)) |
| **`RUN_MIGRATE_ON_START`** | **Unset / empty** until baseline is done. After baseline, optional `1` for auto-apply on restart |

Do **not** enable `RUN_MIGRATE_ON_START=1` on first deploy of the migration-enabled image without baselining first — `migrate deploy` would try to create existing tables and fail.

## One-time baseline (production)

After Deployer has deployed a **`web`** image that includes `apps/web/prisma/migrations/` (Phase 0 on `main`):

### 1. Optional — confirm schema matches init migration

From the running **`web`** container (or `apps/web` with prod `DATABASE_URL`):

```bash
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-migrations prisma/migrations \
  --exit-code
```

Exit code **0** means no diff; **2** means drift — fix drift before baselining (do not run init SQL blindly).

If you cannot use a shadow DB, at minimum confirm core tables exist (`User`, `Link`, `Campaign`, …) and there is **no** `_prisma_migrations` table yet.

### 2. Mark init as applied (no SQL executed)

```bash
# Deployer project name may vary; adjust container name:
docker exec -it deployer_driffle_url_shortner-web-1 sh -c \
  'cd /app && ./scripts/baseline-existing-production-db.sh'
```

Or manually:

```bash
docker exec -it deployer_driffle_url_shortner-web-1 npx prisma migrate resolve --applied 20261005120000_init
docker exec -it deployer_driffle_url_shortner-web-1 npx prisma migrate status
```

Expected: **“Database schema is up to date”** with `20261005120000_init` listed as applied.

### 3. Redeploy / runtime

- Leave **`RUN_MIGRATE_ON_START`** unset, **or** set to `1` after baseline so future migrations apply on container start.
- Alternatively run **`npx prisma migrate deploy`** as a one-off before each release (preferred in [KUBERNETES-CAPACITY.md](./KUBERNETES-CAPACITY.md)).

## Fresh database (no data)

Empty DB: skip baseline. Use **`npx prisma migrate deploy`** (or `RUN_MIGRATE_ON_START=1` once).

## Local / CI

- **CI:** `migrate deploy` on empty test DB (see `.github/workflows/ci.yml`).
- **Local dev:** `npm run db:migrate` or `db:push` for prototypes; do not run `migrate resolve` against production from a laptop unless intentional.

## Reference

- Init migration: `apps/web/prisma/migrations/20261005120000_init/`
- Entrypoint: `apps/web/scripts/docker-entrypoint.sh` (migrations only when `RUN_MIGRATE_ON_START=1`)
- Script: `apps/web/scripts/baseline-existing-production-db.sh`
