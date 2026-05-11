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

### Step C — Fill `apps/web/.env.local`

| Variable | Required | What it’s for |
|----------|----------|----------------|
| `DATABASE_URL` | Yes | Prisma / Postgres connection string |
| `REDIS_URL` | Yes | Short-link cache, rate limits, click feed |
| `NEXTAUTH_URL` | Yes | Must match how you open the app (e.g. `http://127.0.0.1:3000`) |
| `NEXTAUTH_SECRET` | Yes | **≥ 32 characters**, random string ([generate one](https://generate-secret.vercel.app/32)) |
| `GOOGLE_CLIENT_ID` | Yes* | Google OAuth Web client ID |
| `GOOGLE_CLIENT_SECRET` | Yes* | Google OAuth client secret |
| `PUBLIC_APP_URL` | Yes | Usually same as `NEXTAUTH_URL` for local |
| `SHORT_LINK_HOST` | Yes | Host shown in UI for short links (e.g. `localhost:3000` locally) |
| `NEXT_PUBLIC_SHORT_LINK_HOST` | Optional | Same as `SHORT_LINK_HOST` if you want the browser to show it |
| `ALLOWED_EMAIL_DOMAIN` | Optional | Defaults to `driffle.com` — only that domain can sign in |
| `BOOTSTRAP_ADMIN_EMAIL` | Optional | After the first user exists, this email gets `ADMIN` on first login |
| `DISABLE_AUTH` | Optional | `true` + `npm run dev` only — skips Google (see below) |
| `NEXT_PUBLIC_DISABLE_AUTH` | Optional | `true` with `DISABLE_AUTH` — shows “local dev” hint in menu |

\*If you use **`DISABLE_AUTH=true`**, you can keep placeholder non-empty values for Google (the app does not call Google until you turn auth back on).

### Step D — Google OAuth (real sign-in)

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

3. Run migrations (or first-time `db push` if you have no migrations yet):

   ```bash
   docker compose -f docker-compose.prod.yml exec web npx prisma migrate deploy
   ```

Inside Docker Compose, **`DATABASE_URL`** and **`REDIS_URL`** use hostnames **`db`** and **`redis`** — see `.env.example`.

---

## 3. When things go wrong

| Symptom | Likely fix |
|---------|------------|
| `Invalid environment` on first Redis/redirect use | Missing or short `NEXTAUTH_SECRET` (need 32+ chars), empty Google vars, or bad URLs in `.env.local` |
| `DATABASE_URL` not found for Prisma | Add `DATABASE_URL` to **`apps/web/.env`** |
| Cannot sign in with Google | Redirect URI mismatch, wrong `NEXTAUTH_URL`, or email not `@driffle.com` |
| Port 3000 in use | Stop other process or set `PORT=3001 npm run dev` |

For architecture and deployer notes, see **[ARCHITECTURE.md](./ARCHITECTURE.md)**.
