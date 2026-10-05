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

if [ "${RUN_MIGRATE_ON_START:-}" = "1" ]; then
  echo "driffle-links: applying Prisma migrations (RUN_MIGRATE_ON_START=1)..."
  npx prisma migrate deploy
fi

exec npm run start
