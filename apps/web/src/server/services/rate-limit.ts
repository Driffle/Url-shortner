import { getRedis } from "@/server/redis/client";

export async function rateLimitAllow(key: string, limit: number, windowSec: number): Promise<boolean> {
  const redis = getRedis();
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, windowSec);
  return n <= limit;
}
