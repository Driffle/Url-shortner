#!/bin/sh
set -e
if [ "${SKIP_PRISMA_PUSH:-}" != "1" ]; then
  echo "driffle-links: syncing Prisma schema to Postgres (set SKIP_PRISMA_PUSH=1 to skip)..."
  npx prisma db push --skip-generate
fi
exec npm run start
