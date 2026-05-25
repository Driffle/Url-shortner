# Driffle Links

Internal link management and campaign attribution for Driffle: short URLs, UTM builder, campaigns, click analytics, and CSV export.

## Stack

- **App:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Prisma, Redis, NextAuth (Google, `@driffle.com` only)
- **Infra:** Docker Compose (web + PostgreSQL + Redis)

**Setup & environment variables:** see **[docs/SETUP.md](docs/SETUP.md)** (local `.env.local` + `.env`, Google OAuth, optional auth bypass, Docker env).

## Quick start (local)

1. **Dependencies:** Node 22+, Docker Desktop

2. **Database & cache**

   ```bash
   docker compose -f docker-compose.local.yml up -d
   ```

3. **Environment**

   ```bash
   cp apps/web/.env.local.example apps/web/.env.local
   # Edit: DATABASE_URL (default in example matches compose on port 5433), REDIS_URL, Google OAuth, etc.
   ```

   Prisma CLI reads **`apps/web/.env`** for `DATABASE_URL`. Copy the same URL there (see example in repo) or run:

   ```bash
   echo 'DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/driffle_links?schema=public"' > apps/web/.env
   ```

4. **Database schema & dev server**

   ```bash
   cd apps/web
   npm install
   npx prisma db push
   npm run dev
   ```

   Open **http://127.0.0.1:3000**

Optional **local auth bypass** (no Google): set `DISABLE_AUTH=true` and `NEXT_PUBLIC_DISABLE_AUTH=true` in `apps/web/.env.local` (development only). See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Production deploy (Docker)

```bash
cp .env.example .env   # fill secrets and URLs
docker compose -f docker-compose.prod.yml build web
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec web npx prisma migrate deploy
```

Details, security notes, and architecture: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## CI

GitHub Actions runs lint and build on push/PR (see `.github/workflows/ci.yml`).

## Push to GitHub

```bash
git remote add origin https://github.com/YOUR_ORG/driffle-links.git
git branch -M main
git push -u origin main
```

Do **not** commit real secrets. Keep `.env`, `.env.local`, and Deployer secrets out of git (see `.gitignore`).

## License

Proprietary — internal Driffle use unless otherwise stated.
