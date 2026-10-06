import { getRedis, RedisKeys } from "@/server/redis/client";

export type CachedSlugPayload = {
  destinationUrl: string;
  linkId: string;
  status: string;
  expiresAt: string | null;
};

const TTL_SEC = 3600;
const NEGATIVE_TTL_SEC = 60;

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

  async isNegativeCached(slug: string): Promise<boolean> {
    const redis = getRedis();
    const hit = await redis.get(RedisKeys.slugCacheMiss(slug));
    return hit === "1";
  }

  async markNegative(slug: string): Promise<void> {
    const redis = getRedis();
    await redis.set(RedisKeys.slugCacheMiss(slug), "1", "EX", NEGATIVE_TTL_SEC);
  }

  async set(slug: string, payload: CachedSlugPayload): Promise<void> {
    await this.refresh(slug, payload);
  }

  /** Populate slug cache and clear any negative-cache entry for this slug. */
  async refresh(slug: string, payload: CachedSlugPayload): Promise<void> {
    const redis = getRedis();
    const normalized = slug.toLowerCase();
    // Managed Redis ACLs often disallow MULTI/EXEC — use separate commands.
    await redis.set(RedisKeys.slugCache(normalized), JSON.stringify(payload), "EX", TTL_SEC);
    await redis.del(RedisKeys.slugCacheMiss(normalized));
  }

  async invalidate(slug: string): Promise<void> {
    const redis = getRedis();
    const normalized = slug.toLowerCase();
    await redis.del(RedisKeys.slugCache(normalized), RedisKeys.slugCacheMiss(normalized));
  }

  /** After link mutations: write fresh payload or drop cache entries. */
  async invalidateOrRefresh(slug: string, payload?: CachedSlugPayload | null): Promise<void> {
    if (payload) {
      await this.refresh(slug, payload);
      return;
    }
    await this.invalidate(slug);
  }
}

export const slugCacheService = new SlugCacheService();
