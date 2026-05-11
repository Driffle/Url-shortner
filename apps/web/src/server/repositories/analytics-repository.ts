import { prisma } from "@/server/db/prisma";
import { RollupGranularity } from "@prisma/client";

export class AnalyticsRepository {
  async clicksByDaySince(since: Date): Promise<{ day: string; clicks: number }[]> {
    const rows = await prisma.analyticsRollup.groupBy({
      by: ["bucketStart"],
      where: {
        granularity: RollupGranularity.DAY,
        scopeType: "LINK",
        bucketStart: { gte: since },
      },
      _sum: { totalClicks: true },
      orderBy: { bucketStart: "asc" },
    });
    return rows.map((r) => ({
      day: r.bucketStart.toISOString().slice(0, 10),
      clicks: r._sum.totalClicks ?? 0,
    }));
  }

  async topCampaigns(limit = 5) {
    const campaigns = await prisma.campaign.findMany({
      take: 40,
      where: { archivedAt: null },
      include: { links: { select: { clickCount: true } } },
    });
    return campaigns
      .map((c) => ({
        id: c.id,
        name: c.name,
        linkCount: c.links.length,
        clicks: c.links.reduce((a, l) => a + l.clickCount, 0),
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, limit);
  }

  async recentClicks(limit = 20) {
    return prisma.clickEvent.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      where: { isBot: false },
      select: {
        id: true,
        createdAt: true,
        link: { select: { slug: true, destinationUrl: true } },
        countryCode: true,
      },
    });
  }
}

export const analyticsRepository = new AnalyticsRepository();
