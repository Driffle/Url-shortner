#!/bin/sh
set -e

# Google OAuth redirect_uri must match Console; Deployer often leaves NEXTAUTH_URL unset at compose time.
if [ -z "${GOOGLE_OAUTH_CALLBACK_URL:-}" ]; then
  base="${AUTH_URL:-${NEXTAUTH_URL:-}}"
  if [ -z "$base" ]; then
    base="${PUBLIC_APP_URL:-}"
  fi
  if [ -z "$base" ] && [ -n "${SHORT_LINK_HOST:-}" ]; then
    base="https://${SHORT_LINK_HOST}"
  fi
  if [ -z "$base" ]; then
    base="https://shortly.driffle.net"
  fi
  case "$base" in
    http://*|https://*) ;;
    *) base="https://${base}" ;;
  esac
  base=$(printf '%s' "$base" | sed 's#/$##')
  export GOOGLE_OAUTH_CALLBACK_URL="${base}/api/auth/google/callback"
  echo "driffle-links: GOOGLE_OAUTH_CALLBACK_URL=${GOOGLE_OAUTH_CALLBACK_URL}"
fi

if [ "${SKIP_PRISMA_PUSH:-}" != "1" ]; then
  echo "driffle-links: syncing Prisma schema to Postgres (set SKIP_PRISMA_PUSH=1 to skip)..."
  npx prisma db push --skip-generate
fi
exec npm run start
