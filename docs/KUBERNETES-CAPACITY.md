# Driffle Links — Kubernetes capacity (lean / startup)

Internal URL shortener **monolith**: Next.js + PostgreSQL + Redis. Goal: **smallest bill that still handles internal traffic**, scale only when metrics hurt.

Share this with DevOps for first prod deploy; upgrade when you hit the **“scale triggers”** at the bottom.

---

## Philosophy

| Principle | What we do |
|-----------|------------|
| **Min resources first** | Start with **1 web pod**, **smallest managed Postgres**, **tiny Redis** (or Redis sidecar — see below). |
| **Max output on that stack** | Warm redirects are cache-bound; this footprint is enough for **~5–15 sustained redirect RPS** and a small internal team. Spikes above that need scale-up or Phase 1 async clicks. |
| **HA later** | Second web pod, Multi-AZ DB, and HPA **after** you care about deploy uptime or measured load — not day one. |
| **Same compose mental model** | Prod K8s ≈ one `web` + `db` + `redis`; no extra services until Phase 1 worker. |

---

## Minimum viable stack (recommended v1)

```mermaid
flowchart LR
  CF[Cloudflare / tunnel] --> WEB[1× web pod]
  WEB --> PG[(Postgres small)]
  WEB --> RD[(Redis small)]
```

| Component | Startup choice | Approx. capacity on this size |
|-----------|----------------|-------------------------------|
| **web** | **1 replica**, 100m request / 500m limit CPU, **384–512Mi** request memory | Dashboard + **~5–15 RPS** redirects (warm slug cache); brief unavailability on rolling deploy |
| **PostgreSQL** | **1 vCPU, 2 GiB** class (e.g. burstable micro/small), 20–30 GiB disk, **single-AZ** | Fine for low click volume; **writes** (analytics) bite before reads do |
| **Redis** | **128–256 MiB** managed, or **Redis 7 sidecar** in same pod/network (dev/staging style) | Slug cache + rate limits; no persistence required |

**Expected monthly shape (order of magnitude):** one small VM-equivalent for app + smallest RDS + smallest Redis — treat as **internal tool tier**, not marketplace tier.

---

## Web Deployment spec (copy-paste baseline)

| Setting | Lean value |
|---------|------------|
| `replicas` | **1** (→ **2** when you need zero-downtime deploys or CPU &gt; ~60% sustained) |
| `resources.requests` | `cpu: 100m`, `memory: 384Mi` |
| `resources.limits` | `cpu: 500m`, `memory: 768Mi` |
| `readinessProbe` | `GET /api/health/ready:3000` |
| `livenessProbe` | `GET /api/health:3000` |
| HPA | **Skip initially**; add 1→3 at 70% CPU when traffic grows |

**Prisma:** append `?connection_limit=5` to `DATABASE_URL` on a single pod (no PgBouncer until **2+ pods** or connection errors).

**Redis:** **1 TCP connection per pod** (`ioredis` singleton). Sidecar Redis: `redis://127.0.0.1:6379` in the same pod — acceptable for internal v1 if ops accepts pod restart = cache flush.

**Migrate:** one-off Job `npx prisma migrate deploy` before rollout; **`RUN_MIGRATE_ON_START=0`**.

---

## What you get vs. what you give up (1 pod, small DB)

| You get | You give up |
|---------|-------------|
| Low cost, simple ops | No AZ failover; DB/Redis down = app down |
| Enough for internal links + analytics for a small org | Rolling deploy may drop in-flight requests (~seconds) |
| Redirects fast when slug is in Redis | Campaign **click storms** can saturate DB writes (Phase 0) |

---

## Edge vs. app (keep app tiny)

- **Cloudflare** (or ingress): TLS, basic WAF, optional rate limit — protects the single pod.
- App defaults: **300 req/min/IP**, **2000 req/min/slug** (`REDIRECT_RL_*`). Do not raise in prod unless load-testing.

---

## Cron (minimal)

| Job | When |
|-----|------|
| `prisma migrate deploy` | Pre-deploy only |
| `POST /api/cron/rollup` | Nightly (small `CronJob` or external ping) |

---

## Scale triggers (when to spend more)

Add resources when **any** of these persist for a day — not before:

| Signal | Lean upgrade |
|--------|----------------|
| Web CPU **&gt; 60%** or memory pressure / OOM | **2 pods**, 512Mi request; optional HPA max 3 |
| Redirect p95 **&gt; 200 ms** in-region (warm links) | 2 pods + confirm Redis/DB not remote cross-AZ |
| Postgres CPU **&gt; 60%** or insert lag on clicks | Bigger instance **or** Phase 1 async ingest (issue #31) |
| Deploy downtime noticed by users | **2 web replicas** + `maxUnavailable: 0` rolling update |
| Compliance / data durability | Multi-AZ RDS, daily backups (you should have backups anyway) |

---

## One-page summary for DevOps

```
Production v1 (startup):
  Ingress/Cloudflare → 1× driffle-links-web (100m CPU, 384Mi RAM)
                     → Postgres 1 vCPU / 2GiB (single-AZ, 20Gi disk)
                     → Redis 128–256MiB OR sidecar

Handles: internal team + ~5–15 redirect RPS sustained (warm cache).
Scale:    2 pods + slightly larger RDS when metrics say so.
Do not:   Multi-AZ + 6 pods + PgBouncer on day one.
```

---

## References

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [SETUP.md](./SETUP.md) — env vars
- Phase 1 (#31) when click write load exceeds small Postgres
