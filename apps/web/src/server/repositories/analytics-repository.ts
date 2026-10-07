import { prisma } from "@/server/db/prisma";
import { getAnalyticsCacheVersion, getRedis, RedisKeys } from "@/server/redis/client";
import { RollupGranularity } from "@prisma/client";
import { getEnv } from "@/shared/validations/env";

export type AnalyticsScope = { linkId?: string; campaignId?: string };

export type RangeMetrics = {
  totalClicks: number;
  uniqueClicks: number;
};

export type ReferrerRow = { domain: string; count: number };
export type DeviceRow = { deviceType: string; count: number };

export class AnalyticsRepository {
  async clicksByDayInRange(
    from: Date,
    to: Date,
    scope?: AnalyticsScope,
  ): Promise<{ day: string; clicks: number }[]> {
    const cacheKey = await this.cacheKey("clicksByDay", from, to, this.scopeCacheId(scope));
    const cached = await this.getCached<{ day: string; clicks: number }[]>(cacheKey);
    if (cached) return cached;

    const rows = await prisma.analyticsRollup.findMany({
      where: await this.rollupDayWhere(from, to, scope),
      orderBy: { bucketStart: "asc" },
      select: { bucketStart: true, totalClicks: true },
    });

    const byDay = new Map<string, number>();
    for (const r of rows) {
      const day = r.bucketStart.toISOString().slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + r.totalClicks);
    }
    const result = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, clicks]) => ({ day, clicks }));

    await this.setCached(cacheKey, result);
    return result;
  }

  /** @deprecated use clicksByDayInRange */
  async clicksByDaySince(since: Date, scope?: AnalyticsScope) {
    const to = new Date();
    return this.clicksByDayInRange(since, to, scope);
  }

  /** Lifetime totals from `Link` rows — matches list/dashboard click columns. */
  async scopedLifetimeMetrics(scope: AnalyticsScope): Promise<RangeMetrics | null> {
    if (scope.linkId) {
      const link = await prisma.link.findUnique({
        where: { id: scope.linkId },
        select: { clickCount: true, visitCount: true },
      });
      if (!link) return null;
      return { totalClicks: link.clickCount, uniqueClicks: link.visitCount };
    }
    if (scope.campaignId) {
      const agg = await prisma.link.aggregate({
        where: { campaignId: scope.campaignId },
        _sum: { clickCount: true, visitCount: true },
      });
      return {
        totalClicks: agg._sum.clickCount ?? 0,
        uniqueClicks: agg._sum.visitCount ?? 0,
      };
    }
    return null;
  }

  async rangeMetrics(from: Date, to: Date, scope?: AnalyticsScope): Promise<RangeMetrics> {
    const cacheKey = await this.cacheKey("rangeMetrics", from, to, this.scopeCacheId(scope));
    const cached = await this.getCached<RangeMetrics>(cacheKey);
    if (cached) return cached;

    const rows = await prisma.analyticsRollup.findMany({
      where: await this.rollupDayWhere(from, to, scope),
      select: { totalClicks: true, uniqueClicks: true },
    });

    let totalClicks = 0;
    let uniqueClicks = 0;
    for (const r of rows) {
      totalClicks += r.totalClicks;
      uniqueClicks += r.uniqueClicks;
    }

    const result = { totalClicks, uniqueClicks };
    await this.setCached(cacheKey, result);
    return result;
  }

  async topReferrersInRange(
    from: Date,
    to: Date,
    scope: AnalyticsScope | undefined,
    limit: number,
  ): Promise<ReferrerRow[]> {
    const useEvents = this.isIntradayTodayOnly(from, to);
    if (useEvents) {
      return this.topReferrersFromEvents(from, to, scope, limit);
    }

    const cacheKey = await this.cacheKey("topReferrers", from, to, this.scopeCacheId(scope));
    const cached = await this.getCached<ReferrerRow[]>(cacheKey);
    if (cached) return cached;

    const rows = await prisma.analyticsRollup.findMany({
      where: await this.rollupDayWhere(from, to, scope),
      select: { topReferrers: true },
    });

    const counts = new Map<string, number>();
    for (const r of rows) {
      const arr = r.topReferrers as { domain?: string; count?: number }[] | null;
      if (!Array.isArray(arr)) continue;
      for (const item of arr) {
        if (!item.domain) continue;
        counts.set(item.domain, (counts.get(item.domain) ?? 0) + (item.count ?? 0));
      }
    }

    const result = [...counts.entries()]
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    await this.setCached(cacheKey, result);
    return result;
  }

  async deviceMixInRange(
    from: Date,
    to: Date,
    scope: AnalyticsScope | undefined,
    limit: number,
  ): Promise<DeviceRow[]> {
    const useEvents = this.isIntradayTodayOnly(from, to);
    if (useEvents) {
      return this.deviceMixFromEvents(from, to, scope, limit);
    }

    const cacheKey = await this.cacheKey("deviceMix", from, to, this.scopeCacheId(scope));
    const cached = await this.getCached<DeviceRow[]>(cacheKey);
    if (cached) return cached;

    const rows = await prisma.analyticsRollup.findMany({
      where: await this.rollupDayWhere(from, to, scope),
      select: { deviceMix: true },
    });

    const counts = new Map<string, number>();
    for (const r of rows) {
      const mix = r.deviceMix as Record<string, number> | null;
      if (!mix || typeof mix !== "object") continue;
      for (const [deviceType, n] of Object.entries(mix)) {
        counts.set(deviceType, (counts.get(deviceType) ?? 0) + (n ?? 0));
      }
    }

    const result = [...counts.entries()]
      .map(([deviceType, count]) => ({ deviceType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    await this.setCached(cacheKey, result);
    return result;
  }

  async topCampaigns(limit = 5) {
    const cacheKey = await this.cacheKey("topCampaigns", new Date(0), new Date(), `lim${limit}`);
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
    const cacheKey = await this.cacheKey("recentClicks", new Date(0), new Date(), this.scopeCacheId(scope));
    const cached = await this.getCached<
      Awaited<ReturnType<typeof this.fetchRecentClicks>>
    >(cacheKey);
    if (cached) return this.reviveRecentClicks(cached);

    const result = await this.fetchRecentClicks(limit, scope);
    await this.setCached(cacheKey, result);
    return result;
  }

  private async fetchRecentClicks(limit: number, scope?: AnalyticsScope) {
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

  private scopeCacheId(scope?: AnalyticsScope): string {
    if (scope?.linkId) return `link:${scope.linkId}`;
    if (scope?.campaignId) return `campaign:${scope.campaignId}`;
    return "all";
  }

  private async rollupDayWhere(from: Date, to: Date, scope?: AnalyticsScope) {
    if (scope?.campaignId) {
      const linkIds = await this.campaignLinkIds(scope.campaignId);
      return {
        granularity: RollupGranularity.DAY,
        scopeType: "LINK",
        scopeId: { in: linkIds.length > 0 ? linkIds : ["__no_links__"] },
        bucketStart: { gte: from, lte: to },
      };
    }
    return {
      granularity: RollupGranularity.DAY,
      scopeType: "LINK",
      bucketStart: { gte: from, lte: to },
      ...(scope?.linkId ? { scopeId: scope.linkId } : {}),
    };
  }

  private async campaignLinkIds(campaignId: string): Promise<string[]> {
    const links = await prisma.link.findMany({
      where: { campaignId },
      select: { id: true },
    });
    return links.map((l) => l.id);
  }

  private reviveRecentClicks(
    rows: Awaited<ReturnType<AnalyticsRepository["fetchRecentClicks"]>>,
  ): Awaited<ReturnType<AnalyticsRepository["fetchRecentClicks"]>> {
    return rows.map((r) => ({
      ...r,
      createdAt: r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt as string),
    }));
  }

  private async linkEventWhere(scope?: AnalyticsScope): Promise<{ linkId?: string | { in: string[] } }> {
    if (scope?.linkId) return { linkId: scope.linkId };
    if (scope?.campaignId) {
      const links = await prisma.link.findMany({
        where: { campaignId: scope.campaignId },
        select: { id: true },
      });
      const ids = links.map((l) => l.id);
      return { linkId: { in: ids.length > 0 ? ids : ["__no_links__"] } };
    }
    return {};
  }

  private isIntradayTodayOnly(from: Date, to: Date): boolean {
    const day = from.toISOString().slice(0, 10);
    return day === to.toISOString().slice(0, 10) && day === new Date().toISOString().slice(0, 10);
  }

  private async topReferrersFromEvents(
    from: Date,
    to: Date,
    scope: AnalyticsScope | undefined,
    limit: number,
  ): Promise<ReferrerRow[]> {
    const linkWhere = await this.linkEventWhere(scope);
    const agg = await prisma.clickEvent.groupBy({
      by: ["referrerId"],
      _count: { _all: true },
      where: {
        createdAt: { gte: from, lte: to },
        isBot: false,
        referrerId: { not: null },
        ...linkWhere,
      },
    });
    const ids = agg.map((a) => a.referrerId).filter(Boolean) as string[];
    const referrers = ids.length
      ? await prisma.referrer.findMany({ where: { id: { in: ids } } })
      : [];
    const domainById = Object.fromEntries(referrers.map((r) => [r.id, r.domain]));
    return agg
      .map((a) => ({
        domain: a.referrerId ? (domainById[a.referrerId] ?? a.referrerId) : "—",
        count: a._count._all,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  private async deviceMixFromEvents(
    from: Date,
    to: Date,
    scope: AnalyticsScope | undefined,
    limit: number,
  ): Promise<DeviceRow[]> {
    const linkWhere = await this.linkEventWhere(scope);
    const agg = await prisma.clickEvent.groupBy({
      by: ["deviceId"],
      _count: { _all: true },
      where: {
        createdAt: { gte: from, lte: to },
        isBot: false,
        ...linkWhere,
      },
    });
    const ids = agg.map((a) => a.deviceId).filter(Boolean) as string[];
    const devices = ids.length ? await prisma.device.findMany({ where: { id: { in: ids } } }) : [];
    const typeById = Object.fromEntries(devices.map((d) => [d.id, d.deviceType]));
    return agg
      .map((a) => ({
        deviceType: a.deviceId ? (typeById[a.deviceId] ?? "unknown") : "unknown",
        count: a._count._all,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  private async cacheKey(kind: string, from: Date, to: Date, scopeId?: string): Promise<string> {
    const version = await getAnalyticsCacheVersion();
    const scope = scopeId ?? "all";
    const fromIso = from.toISOString().slice(0, 10);
    const toIso = to.toISOString().slice(0, 10);
    return RedisKeys.analyticsSummary(scope, `v${version}:${kind}:${fromIso}:${toIso}`);
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
