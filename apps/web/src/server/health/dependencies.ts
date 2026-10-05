import { prisma } from "@/server/db/prisma";
import { getRedis } from "@/server/redis/client";
import { isProductionOpenAuthMisconfigured } from "@/shared/lib/auth-bypass";

export type DependencyCheck = {
  ok: boolean;
  error?: string;
};

export type ReadinessReport = {
  ok: boolean;
  checks: {
    postgres: DependencyCheck;
    redis: DependencyCheck;
    config: DependencyCheck;
  };
};

const CHECK_TIMEOUT_MS = 2000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(timer);
        reject(e);
      });
  });
}

export async function checkPostgres(): Promise<DependencyCheck> {
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, CHECK_TIMEOUT_MS);
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "postgres_unavailable";
    console.error("[health] postgres check failed", { message });
    return { ok: false, error: "postgres_unavailable" };
  }
}

export async function checkRedis(): Promise<DependencyCheck> {
  try {
    const pong = await withTimeout(getRedis().ping(), CHECK_TIMEOUT_MS);
    if (pong !== "PONG") {
      console.error("[health] redis check failed", { pong });
      return { ok: false, error: "redis_unexpected_response" };
    }
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "redis_unavailable";
    console.error("[health] redis check failed", { message });
    return { ok: false, error: "redis_unavailable" };
  }
}

export function checkConfig(): DependencyCheck {
  if (isProductionOpenAuthMisconfigured()) {
    console.error("[health] config check failed", { error: "open_auth_in_production" });
    return { ok: false, error: "open_auth_in_production" };
  }
  return { ok: true };
}

export async function getReadinessReport(): Promise<ReadinessReport> {
  const [postgres, redis] = await Promise.all([checkPostgres(), checkRedis()]);
  const config = checkConfig();
  const ok = postgres.ok && redis.ok && config.ok;
  return { ok, checks: { postgres, redis, config } };
}
