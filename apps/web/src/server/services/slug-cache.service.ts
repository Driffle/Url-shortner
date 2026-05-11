import { getRedis, RedisKeys } from "@/server/redis/client";

export type CachedSlugPayload = {
  destinationUrl: string;
  linkId: string;
  status: string;
  expiresAt: string | null;
};

const TTL_SEC = 3600;

export class SlugCacheService {
  async get(slug: string): Promise<CachedSlugPayload | null> {
    const redis = getRedis();
    const raw = await redis.get(RedisKeys.slugCache(slug));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CachedSlugPayload;
    } catch {
      return null;
    }
  }

  async set(slug: string, payload: CachedSlugPayload): Promise<void> {
    const redis = getRedis();
    await redis.set(RedisKeys.slugCache(slug), JSON.stringify(payload), "EX", TTL_SEC);
  }

  async invalidate(slug: string): Promise<void> {
    const redis = getRedis();
    await redis.del(RedisKeys.slugCache(slug));
  }
}

export const slugCacheService = new SlugCacheService();
