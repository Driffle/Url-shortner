import { getRedis, RedisKeys } from "@/server/redis/client";
import { slugCacheService, type CachedSlugPayload } from "@/server/services/slug-cache.service";
import { linkRepository } from "@/server/repositories/link-repository";

const LOCK_TTL_SEC = 5;
const WAIT_MS = 50;
const WAIT_ROUNDS = 20;

/**
 * Singleflight-style slug load: one Postgres read per hot miss; others wait for cache fill.
 */
export async function loadSlugPayloadWithCoalesce(slug: string): Promise<CachedSlugPayload | null> {
  const normalized = slug.toLowerCase();
  const cached = await slugCacheService.get(normalized);
  if (cached) return cached;

  const redis = getRedis();
  const lockKey = RedisKeys.slugLoadLock(normalized);
  const acquired = await redis.set(lockKey, "1", "EX", LOCK_TTL_SEC, "NX");

  if (!acquired) {
    for (let i = 0; i < WAIT_ROUNDS; i++) {
      await new Promise((r) => setTimeout(r, WAIT_MS));
      const hit = await slugCacheService.get(normalized);
      if (hit) return hit;
    }
  }

  try {
    const again = await slugCacheService.get(normalized);
    if (again) return again;

    const link = await linkRepository.findBySlug(normalized);
    if (!link) return null;

    const payload: CachedSlugPayload = {
      destinationUrl: link.destinationUrl,
      linkId: link.id,
      status: link.status,
      expiresAt: link.expiresAt?.toISOString() ?? null,
    };
    await slugCacheService.refresh(normalized, payload);
    return payload;
  } finally {
    if (acquired) {
      await redis.del(lockKey).catch(() => undefined);
    }
  }
}
