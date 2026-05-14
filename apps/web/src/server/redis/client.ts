import Redis from "ioredis";
import { getEnv } from "@/shared/validations/env";

const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

/** Build namespaced keys under `REDIS_KEY_PREFIX` (see env / SETUP for managed Redis ACLs). */
function redisKey(path: string): string {
  const prefix = getEnv().REDIS_KEY_PREFIX.replace(/:+$/, "");
  return `${prefix}:${path}`;
}

export function getRedis(): Redis {
  if (globalForRedis.redis) return globalForRedis.redis;
  const url = getEnv().REDIS_URL;
  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    // Managed Redis users often lack INFO; ready check uses INFO and throws NOPERM.
    enableReadyCheck: false,
    lazyConnect: false,
  });
  if (process.env.NODE_ENV !== "production") globalForRedis.redis = client;
  return client;
}

/** Keys used across services (single source of truth). */
export const RedisKeys = {
  slugCache: (slug: string) => redisKey(`slug:${slug.toLowerCase()}`),
  analyticsSummary: (linkId: string, range: string) => redisKey(`analytics:link:${linkId}:${range}`),
  rateLimitIp: (ip: string, window: string) => redisKey(`rl:ip:${ip}:${window}`),
  rateLimitSlug: (slug: string, window: string) => redisKey(`rl:slug:${slug}:${window}`),
  rateLimitVisitPost: (ip: string, window: string) => redisKey(`rl:visitpost:${ip}:${window}`),
  clickFeed: () => redisKey("feed:clicks"),
  clickQueue: () => redisKey("queue:clicks"),
} as const;
