import Redis from "ioredis";
import { getEnv } from "@/shared/validations/env";

const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

export function getRedis(): Redis {
  if (globalForRedis.redis) return globalForRedis.redis;
  const url = getEnv().REDIS_URL;
  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });
  if (process.env.NODE_ENV !== "production") globalForRedis.redis = client;
  return client;
}

/** Keys used across services (single source of truth). */
export const RedisKeys = {
  slugCache: (slug: string) => `dl:slug:${slug.toLowerCase()}`,
  analyticsSummary: (linkId: string, range: string) => `dl:analytics:link:${linkId}:${range}`,
  rateLimitIp: (ip: string, window: string) => `dl:rl:ip:${ip}:${window}`,
  rateLimitSlug: (slug: string, window: string) => `dl:rl:slug:${slug}:${window}`,
  clickFeed: () => `dl:feed:clicks`,
  clickQueue: () => `dl:queue:clicks`,
} as const;
