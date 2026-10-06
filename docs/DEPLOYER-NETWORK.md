# Deployer shared network

Deployer attaches services to `deployer_platform`. DNS uses **Compose service names**.

This app keeps the service name **`web`** (required by many Deployer app configs that inject env into `web`).

**Phase 2:** also register **`click-worker`** in Deployer **env service names** (or leave unset so all app services receive `.deployer.env`).

## Postgres connections (Deployer + platform Postgres)

Deployer provisions `DATABASE_URL` on **`web`** and **`click-worker`**. Append Prisma pool sizing on the app side:

```text
postgresql://…/driffle_url_shortner?schema=public&connection_limit=10
```

**Rule of thumb:** `web_replicas × connection_limit + worker_replicas × connection_limit ≤ 80%` of Postgres `max_connections`.

Managed Postgres on the platform stack does **not** use the repo’s embedded `db` service (Deployer suppresses it).

## Optional PgBouncer (multi-replica)

For multiple `web` containers against one DB:

1. Enable compose profile `pooling` (see `docker-compose.prod.yml`).
2. Set `DATABASE_HOST=pgbouncer` and add `pgbouncer=true` to the query string for Prisma transaction mode.

On Deployer today (single VM, one web replica), direct platform Postgres is usually enough.

**BotL** (`Driffle/BotL-Legal-Email-Management`) uses **`botl-web`** so its nginx does not proxy to this app. Do not rename `web` here without updating Deployer **env service names** for this app.
