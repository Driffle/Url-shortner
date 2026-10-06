import { prisma } from "@/server/db/prisma";
import { bumpAnalyticsCacheVersion } from "@/server/redis/client";
import { dayBucketStartUtc } from "@/server/services/click-event-build";
import { runClickWorkerCycle } from "@/server/services/click-worker.service";

export type RollupRunResult = {
  linkBucketsUpdated: number;
  campaignBucketsUpdated: number;
  worker: Awaited<ReturnType<typeof runClickWorkerCycle>>;
  daysProcessed: number;
};

const TOP_N = 10;

/**
 * Recompute `uniqueClicks` and optional top-N JSON for LINK and CAMPAIGN day buckets.
 * Also runs a worker drain cycle as cron backup.
 */
export async function runAnalyticsRollup(options?: { lookbackDays?: number }): Promise<RollupRunResult> {
  const lookbackDays = options?.lookbackDays ?? 14;
  const since = dayBucketStartUtc(new Date());
  since.setUTCDate(since.getUTCDate() - lookbackDays);

  const worker = await runClickWorkerCycle({ legacyDrainMax: 200 });

  const events = await prisma.clickEvent.findMany({
    where: { createdAt: { gte: since }, isBot: false },
    select: {
      linkId: true,
      visitorHash: true,
      createdAt: true,
      countryCode: true,
      referrer: { select: { domain: true } },
      device: { select: { deviceType: true } },
    },
  });

  type BucketAgg = {
    linkId: string;
    bucketStart: Date;
    visitors: Set<string>;
    referrers: Map<string, number>;
    countries: Map<string, number>;
    devices: Map<string, number>;
    totalFromEvents: number;
  };

  const linkBuckets = new Map<string, BucketAgg>();

  for (const ev of events) {
    const bucketStart = dayBucketStartUtc(ev.createdAt);
    const key = `${ev.linkId}:${bucketStart.toISOString()}`;
    let agg = linkBuckets.get(key);
    if (!agg) {
      agg = {
        linkId: ev.linkId,
        bucketStart,
        visitors: new Set(),
        referrers: new Map(),
        countries: new Map(),
        devices: new Map(),
        totalFromEvents: 0,
      };
      linkBuckets.set(key, agg);
    }
    agg.totalFromEvents += 1;
    agg.visitors.add(ev.visitorHash);
    if (ev.referrer?.domain) {
      agg.referrers.set(ev.referrer.domain, (agg.referrers.get(ev.referrer.domain) ?? 0) + 1);
    }
    if (ev.countryCode) {
      agg.countries.set(ev.countryCode, (agg.countries.get(ev.countryCode) ?? 0) + 1);
    }
    const dt = ev.device?.deviceType ?? "unknown";
    agg.devices.set(dt, (agg.devices.get(dt) ?? 0) + 1);
  }

  let linkBucketsUpdated = 0;
  for (const agg of linkBuckets.values()) {
    const uniqueClicks = agg.visitors.size;
    await prisma.analyticsRollup.upsert({
      where: {
        granularity_bucketStart_scopeType_scopeId: {
          granularity: "DAY",
          bucketStart: agg.bucketStart,
          scopeType: "LINK",
          scopeId: agg.linkId,
        },
      },
      create: {
        granularity: "DAY",
        bucketStart: agg.bucketStart,
        scopeType: "LINK",
        scopeId: agg.linkId,
        linkId: agg.linkId,
        totalClicks: agg.totalFromEvents,
        uniqueClicks,
        topReferrers: topReferrersJson(agg.referrers),
        topCountries: topCountriesJson(agg.countries),
        deviceMix: Object.fromEntries(agg.devices),
      },
      update: {
        uniqueClicks,
        topReferrers: topReferrersJson(agg.referrers),
        topCountries: topCountriesJson(agg.countries),
        deviceMix: Object.fromEntries(agg.devices),
      },
    });
    linkBucketsUpdated += 1;
  }

  const linksWithCampaign = await prisma.link.findMany({
    where: { campaignId: { not: null } },
    select: { id: true, campaignId: true },
  });
  const campaignByLink = new Map(linksWithCampaign.map((l) => [l.id, l.campaignId!]));

  type CampaignAgg = {
    campaignId: string;
    bucketStart: Date;
    visitors: Set<string>;
    total: number;
  };
  const campaignBuckets = new Map<string, CampaignAgg>();

  for (const ev of events) {
    const campaignId = campaignByLink.get(ev.linkId);
    if (!campaignId) continue;
    const bucketStart = dayBucketStartUtc(ev.createdAt);
    const key = `${campaignId}:${bucketStart.toISOString()}`;
    let agg = campaignBuckets.get(key);
    if (!agg) {
      agg = { campaignId, bucketStart, visitors: new Set(), total: 0 };
      campaignBuckets.set(key, agg);
    }
    agg.total += 1;
    agg.visitors.add(`${ev.linkId}:${ev.visitorHash}`);
  }

  let campaignBucketsUpdated = 0;
  for (const agg of campaignBuckets.values()) {
    await prisma.analyticsRollup.upsert({
      where: {
        granularity_bucketStart_scopeType_scopeId: {
          granularity: "DAY",
          bucketStart: agg.bucketStart,
          scopeType: "CAMPAIGN",
          scopeId: agg.campaignId,
        },
      },
      create: {
        granularity: "DAY",
        bucketStart: agg.bucketStart,
        scopeType: "CAMPAIGN",
        scopeId: agg.campaignId,
        campaignId: agg.campaignId,
        totalClicks: agg.total,
        uniqueClicks: agg.visitors.size,
      },
      update: {
        totalClicks: agg.total,
        uniqueClicks: agg.visitors.size,
      },
    });
    campaignBucketsUpdated += 1;
  }

  await bumpAnalyticsCacheVersion();

  console.log(
    JSON.stringify({
      event: "rollup_run",
      linkBucketsUpdated,
      campaignBucketsUpdated,
      lookbackDays,
      workerInserted: worker.inserted,
    }),
  );

  return {
    linkBucketsUpdated,
    campaignBucketsUpdated,
    worker,
    daysProcessed: lookbackDays,
  };
}

function topReferrersJson(map: Map<string, number>): { domain: string; count: number }[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_N)
    .map(([domain, count]) => ({ domain, count }));
}

function topCountriesJson(map: Map<string, number>): { country: string; count: number }[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_N)
    .map(([country, count]) => ({ country, count }));
}
