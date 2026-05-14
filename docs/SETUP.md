# Driffle Links — setup & environment

Two environments to know about: **local dev** (`npm run dev` in `apps/web`) and **Docker production** (repo root `docker-compose.prod.yml`).

---

## 1. Local development (recommended path)

### Step A — Postgres & Redis

From the **repository root**:

```bash
docker compose -f docker-compose.local.yml up -d
```

| Service  | Host URL |
|----------|----------|
| Postgres | `postgresql://postgres:postgres@127.0.0.1:5433/driffle_links` |
| Redis    | `redis://127.0.0.1:6379` |

### Step B — Environment files in `apps/web/`

Next.js reads **`.env.local`** (and `.env`). **Prisma CLI** only auto-loads **`.env`**, not `.env.local`.

1. **Copy the template**

   ```bash
   cp apps/web/.env.local.example apps/web/.env.local
   ```

2. **Create `apps/web/.env`** with the same database URL (for `npx prisma db push`, `migrate`, etc.):

   ```bash
   echo 'DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/driffle_links?schema=public"' > apps/web/.env
   ```

### Public access (no login) — opt-in only

By default **sign-in is required**. To allow anyone to use the app (internal URL shortener mode), set **both** in `.env.local` / production env:

| Variable | Purpose |
|----------|---------|
| `PUBLIC_APP_NO_AUTH=true` | Server / middleware (not exposed to the browser bundle) |
| `NEXT_PUBLIC_PUBLIC_APP_NO_AUTH=true` | Same flag for Edge middleware + client UI hints |

Omit them or set to `false` to require Google OAuth. Local-only bypass: `DISABLE_AUTH=true` (development only) still works without these flags.

### Step C — Fill `apps/web/.env.local`

| Variable | Required | What it’s for |
|----------|----------|----------------|
| `DATABASE_URL` | Yes | Prisma / Postgres connection string |
| `REDIS_URL` | Yes | Short-link cache, rate limits, click feed |
| `REDIS_KEY_PREFIX` | Optional | Defaults to `dl`. **Managed Redis (ACL):** set to the key namespace your user may use. Any non-empty string without whitespace is allowed (e.g. `app_driffle_url_shortner`, `app:driffle:shortner`). Keys are `{prefix}:…`. |
| `NEXTAUTH_URL` | Yes | Must match how you open the app (e.g. `http://127.0.0.1:3000`) |
| `NEXTAUTH_SECRET` or `AUTH_SECRET` | Yes | **≥ 32 characters** (same value in both is fine). Auth.js v5 reads `AUTH_SECRET`; this app accepts either name. |
| `GOOGLE_CLIENT_ID` | Yes† | Google OAuth Web client ID |
| `GOOGLE_CLIENT_SECRET` | Yes† | Google OAuth client secret |
| `PUBLIC_APP_URL` | Yes | Usually same as `NEXTAUTH_URL` for local |
| `SHORT_LINK_HOST` | Yes | Host shown in UI for short links (e.g. `localhost:3000` locally) |
| `NEXT_PUBLIC_SHORT_LINK_HOST` | Optional | Same as `SHORT_LINK_HOST` if you want the browser to show it |
| `ALLOWED_EMAIL_DOMAIN` | Optional | Defaults to `driffle.com` — only that domain can sign in |
| `BOOTSTRAP_ADMIN_EMAIL` | Optional | After the first user exists, this email gets `ADMIN` on first login |
| `DISABLE_AUTH` | Optional | `true` + `npm run dev` only — skips Google (see below) |
| `NEXT_PUBLIC_DISABLE_AUTH` | Optional | `true` with `DISABLE_AUTH` — shows “local dev” hint in menu |

† **Not required** when the app runs **without sign-in**: set `PUBLIC_APP_NO_AUTH` + `NEXT_PUBLIC_PUBLIC_APP_NO_AUTH`, or use **`DISABLE_AUTH=true`** in development only (see below). In those modes you may leave `GOOGLE_*` empty and the Google provider is not registered.

### Step D — Google OAuth (only when you want @domain Google sign-in)

Skip this section if you use **public no-auth** (`PUBLIC_APP_NO_AUTH`) or local **`DISABLE_AUTH`** and do not want Google yet.

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → **Create credentials** → **OAuth client ID** → Application type **Web application**.
2. **Authorized JavaScript origins**: `http://127.0.0.1:3000` (and your production URL later).
3. **Authorized redirect URIs**:  
   `http://127.0.0.1:3000/api/auth/callback/google`
4. Put **Client ID** and **Client secret** into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local`.
5. Under **OAuth consent screen**, add your test users if the app is in Testing mode.

`NEXTAUTH_URL` and `PUBLIC_APP_URL` must use the **same origin** you use in the browser (including `127.0.0.1` vs `localhost`).

### Step E — Skip Google on localhost (optional)

In **`apps/web/.env.local`** add:

```env
DISABLE_AUTH=true
NEXT_PUBLIC_DISABLE_AUTH=true
```

Only works when **`NODE_ENV=development`** (`npm run dev`). A dev user `dev-local@driffle.com` is created automatically in the DB.

### Step F — Database & run

```bash
cd apps/web
npm install
npx prisma db push
npm run dev
```

Open **http://127.0.0.1:3000** (matches the default dev script hostname).

---

## 2. Docker production (repo root)

1. Copy **`.env.example`** → **`.env`** at the repo root and edit all values (no secrets in git).

2. Build & run:

   ```bash
   docker compose -f docker-compose.prod.yml build web
   docker compose -f docker-compose.prod.yml up -d
   ```

3. **Schema on Postgres:** the production image runs **`npx prisma db push`** once on container start (before `next start`) so tables such as `User` exist on a fresh volume. To skip that (e.g. you run `prisma migrate deploy` from CI or a job), set **`SKIP_PRISMA_PUSH=1`** in `.env`. If you later add SQL migrations under `prisma/migrations`, prefer **`migrate deploy`** instead of `db push` and use `SKIP_PRISMA_PUSH=1` plus a migration step.

Inside Docker Compose, **`DATABASE_URL`** and **`REDIS_URL`** use hostnames **`db`** and **`redis`** — see `.env.example`. Set **`REDIS_KEY_PREFIX`** if your Redis ACL only allows a specific key prefix.

---

## 3. When things go wrong

| Symptom | Likely fix |
|---------|------------|
| Redis `NOPERM` / “no permissions to run the `info` command” | The app disables ioredis **ready check** (no `INFO`). If you still see **`NOPERM` on keys**, set **`REDIS_KEY_PREFIX`** in `.env` to the prefix your ACL allows (must match pattern such as `~{prefix}:*`). Value may include `.`, `:`, `@`, etc.; only whitespace is rejected. |
| Short links return **404** / redirect never runs | Often Redis errors during rate limit or slug cache — fix Redis ACL / prefix first; then confirm the slug exists in the DB. |
| `Invalid environment` on first Redis/redirect use | Missing or short auth secret (32+ chars), bad URLs, or — if **sign-in is on** — empty `GOOGLE_*`. With no-login flags set, `GOOGLE_*` may be empty. |
| `[auth][error] MissingSecret` in Docker / production logs | Set **`NEXTAUTH_SECRET`** or **`AUTH_SECRET`** (32+ random chars) on the container. Open-access mode still loads NextAuth for `/api/auth/session` — the secret is required. With Compose, set one in root `.env`; `docker-compose.prod.yml` mirrors it into both env names. |
| `The table public.User does not exist` (Prisma `P2021`) | Fresh DB with no schema: rebuild/restart the **`web`** image so startup runs `prisma db push`, or run `docker compose ... exec web npx prisma db push` once. If you set **`SKIP_PRISMA_PUSH=1`**, apply migrations / push yourself. |
| Cannot sign in with Google | Redirect URI mismatch, wrong `NEXTAUTH_URL`, or email not `@driffle.com` |
| Port 3000 in use | Stop other process or set `PORT=3001 npm run dev` |

For architecture and deployer notes, see **[ARCHITECTURE.md](./ARCHITECTURE.md)**.
