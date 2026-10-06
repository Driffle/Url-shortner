#!/bin/sh
# Mark the initial migration as already applied when the DB was created with `db push`
# (or an equivalent schema) and must NOT re-run CREATE TABLE SQL.
#
# Usage (inside the web container or apps/web with DATABASE_URL set):
#   ./scripts/baseline-existing-production-db.sh
#   ./scripts/baseline-existing-production-db.sh 20261005120000_init
#
# Requires: prisma/migrations/<name>/migration.sql present; DATABASE_URL set.
set -e

INIT_MIGRATION="${1:-20261005120000_init}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "baseline: DATABASE_URL is not set" >&2
  exit 1
fi

if [ ! -d "prisma/migrations/${INIT_MIGRATION}" ]; then
  echo "baseline: prisma/migrations/${INIT_MIGRATION} not found (wrong cwd or old image)" >&2
  exit 1
fi

echo "baseline: checking migration status before resolve..."
npx prisma migrate status || true

echo "baseline: marking ${INIT_MIGRATION} as applied (no migration SQL will run)..."
npx prisma migrate resolve --applied "${INIT_MIGRATION}"

echo "baseline: status after resolve:"
npx prisma migrate status

echo "baseline: done. Safe to use RUN_MIGRATE_ON_START=1 or CI migrate deploy for future migrations."
