import { prisma } from "@/server/db/prisma";
import { getRedis, RedisKeys } from "@/server/redis/client";
import { RollupGranularity } from "@prisma/client";
import { getEnv } from "@/shared/validations/env";

export type AnalyticsScope = { linkId?: string };

export class AnalyticsRepository {
  /** Daily click totals from link rollups; pass `linkId` to scope to one short URL. */
  async clicksByDaySince(since: Date, scope?: AnalyticsScope): Promise<{ day: string; clicks: number }[]> {
    const cacheKey = this.cacheKey("clicksByDay", since, scope?.linkId);
    const cached = await this.getCached<{ day: string; clicks: number }[]>(cacheKey);
    if (cached) return cached;

    const rows = await prisma.analyticsRollup.groupBy({
      by: ["bucketStart"],
      where: {
        granularity: RollupGranularity.DAY,
        scopeType: "LINK",
        bucketStart: { gte: since },
        ...(scope?.linkId ? { scopeId: scope.linkId } : {}),
      },
      _sum: { totalClicks: true },
      orderBy: { bucketStart: "asc" },
    });
    const result = rows.map((r) => ({
      day: r.bucketStart.toISOString().slice(0, 10),
      clicks: r._sum.totalClicks ?? 0,
    }));
    await this.setCached(cacheKey, result);
    return result;
  }

  async topCampaigns(limit = 5) {
    const cacheKey = this.cacheKey("topCampaigns", new Date(0), String(limit));
    const cached = await this.getCached<
      { id: string; name: string; linkCount: number; clicks: number }[]
    >(cacheKey);
    if (cached) return cached;

    const campaigns = await prisma.campaign.findMany({
      take: 40,
      where: { archivedAt: null },
      include: { links: { select: { clickCount: true } } },
    });
    const result = campaigns
      .map((c) => ({
        id: c.id,
        name: c.name,
        linkCount: c.links.length,
        clicks: c.links.reduce((a, l) => a + l.clickCount, 0),
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, limit);
    await this.setCached(cacheKey, result);
    return result;
  }

  async recentClicks(limit = 20, scope?: AnalyticsScope) {
    return prisma.clickEvent.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      where: { isBot: false, ...(scope?.linkId ? { linkId: scope.linkId } : {}) },
      select: {
        id: true,
        createdAt: true,
        link: { select: { slug: true, destinationUrl: true } },
        countryCode: true,
      },
    });
  }

  private cacheKey(kind: string, since: Date, scopeId?: string): string {
    const day = since.toISOString().slice(0, 10);
    const scope = scopeId ?? "all";
    return RedisKeys.analyticsSummary(scope, `${kind}:${day}`);
  }

  private async getCached<T>(key: string): Promise<T | null> {
    try {
      const redis = getRedis();
      const raw = await redis.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  private async setCached<T>(key: string, value: T): Promise<void> {
    try {
      const redis = getRedis();
      const ttl = getEnv().ANALYTICS_CACHE_TTL_SEC;
      await redis.set(key, JSON.stringify(value), "EX", ttl);
    } catch {
      // cache optional
    }
  }
}

export const analyticsRepository = new AnalyticsRepository();
