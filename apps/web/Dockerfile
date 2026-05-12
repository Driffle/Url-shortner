# Driffle Links — multi-stage production image (Next.js + Prisma)
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json* ./
# `postinstall` runs `prisma generate` — schema must exist before `npm ci`
COPY prisma ./prisma
RUN npm ci

COPY . .
ARG DATABASE_URL="postgresql://postgres:postgres@localhost:5432/driffle_links"
ENV DATABASE_URL=$DATABASE_URL
ENV NEXT_TELEMETRY_DISABLED=1

# `next build` loads server modules (e.g. NextAuth) that call `getEnv()` — same placeholders as CI.
# Runtime env comes from compose/Kubernetes and replaces these; they are not copied to the final stage.
ENV REDIS_URL=redis://127.0.0.1:6379
ENV REDIS_KEY_PREFIX=dl
ENV NEXTAUTH_URL=http://127.0.0.1:3000
ENV PUBLIC_APP_URL=http://127.0.0.1:3000
ENV NEXTAUTH_SECRET=01234567890123456789012345678901
ENV GOOGLE_CLIENT_ID=build-placeholder-google-client-id
ENV GOOGLE_CLIENT_SECRET=build-placeholder-google-client-secret

RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat openssl wget
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
RUN chmod +x ./scripts/docker-entrypoint.sh && chown nextjs:nodejs ./scripts/docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["./scripts/docker-entrypoint.sh"]
