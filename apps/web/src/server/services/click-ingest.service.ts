import { createHash } from "crypto";
import { prisma } from "@/server/db/prisma";
import { getRedis, RedisKeys } from "@/server/redis/client";
import {
  buildClickEventEnvelope,
  dayBucketStartUtc,
  parseUa,
  referrerDomain,
  visitorHash,
  isBotUa,
} from "@/server/services/click-event-build";
import type { ClickEventEnvelope } from "@/shared/validations/click-event";
import { legacyClickQueueItemSchema } from "@/shared/validations/click-event";

export type ClickIngestInput = {
  linkId: string;
  ip: string | null;
  userAgent: string | null;
  referer: string | null;
  countryCode?: string | null;
};

function hash(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export type IngestBatchResult = {
  inserted: number;
  skippedDuplicate: number;
  linkIds: string[];
};

export class ClickIngestService {
  /** Convert legacy queue JSON to envelope (recomputes visitorHash). */
  legacyQueueItemToEnvelope(raw: string): ClickEventEnvelope | null {
    try {
      const parsed = legacyClickQueueItemSchema.parse(JSON.parse(raw));
      const at = parsed.at ? new Date(parsed.at) : new Date();
      return buildClickEventEnvelope({
        linkId: parsed.linkId,
        ip: parsed.ip ?? null,
        userAgent: parsed.userAgent ?? null,
        referer: parsed.referer ?? null,
        countryCode: parsed.country ?? null,
        at,
      });
    } catch {
      return null;
    }
  }

  /** Idempotent batch persist (eventId = ClickEvent.id). */
  async ingestBatch(envelopes: ClickEventEnvelope[]): Promise<IngestBatchResult> {
    if (envelopes.length === 0) {
      return { inserted: 0, skippedDuplicate: 0, linkIds: [] };
    }

    const byEventId = new Map<string, ClickEventEnvelope>();
    for (const e of envelopes) {
      byEventId.set(e.eventId, e);
    }
    const unique = [...byEventId.values()];

    const existing = await prisma.clickEvent.findMany({
      where: { id: { in: unique.map((e) => e.eventId) } },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((r) => r.id));
    const toInsert = unique.filter((e) => !existingIds.has(e.eventId));

    if (toInsert.length === 0) {
      return {
        inserted: 0,
        skippedDuplicate: unique.length,
        linkIds: [...new Set(unique.map((e) => e.linkId))],
      };
    }

    const deviceMap = new Map<string, { deviceType: string; osName: string; browserName: string }>();
    const referrerDomains = new Set<string>();
    for (const e of toInsert) {
      const devSig = hash(`${e.deviceType}|${e.osName}|${e.browserName}`);
      deviceMap.set(devSig, { deviceType: e.deviceType, osName: e.osName, browserName: e.browserName });
      if (e.referrerDomain) referrerDomains.add(e.referrerDomain);
    }

    await prisma.$transaction(async (tx) => {
      const deviceIdBySig = new Map<string, string>();
      for (const [sig, dims] of deviceMap) {
        const device = await tx.device.upsert({
          where: { signature: sig },
          create: { signature: sig, ...dims },
          update: {},
        });
        deviceIdBySig.set(sig, device.id);
      }

      const referrerIdByDomain = new Map<string, string>();
      for (const domain of referrerDomains) {
        const ref = await tx.referrer.upsert({
          where: { domain },
          create: { domain },
          update: {},
        });
        referrerIdByDomain.set(domain, ref.id);
      }

      await tx.clickEvent.createMany({
        data: toInsert.map((e) => {
          const devSig = hash(`${e.deviceType}|${e.osName}|${e.browserName}`);
          return {
            id: e.eventId,
            linkId: e.linkId,
            deviceId: deviceIdBySig.get(devSig) ?? null,
            referrerId: e.referrerDomain ? (referrerIdByDomain.get(e.referrerDomain) ?? null) : null,
            visitorHash: e.visitorHash,
            countryCode: e.countryCode ?? null,
            isBot: e.isBot,
            createdAt: new Date(e.at),
          };
        }),
        skipDuplicates: true,
      });

      const countsByLink = new Map<string, number>();
      for (const e of toInsert) {
        countsByLink.set(e.linkId, (countsByLink.get(e.linkId) ?? 0) + 1);
      }
      for (const [linkId, n] of countsByLink) {
        await tx.link.update({
          where: { id: linkId },
          data: { clickCount: { increment: n } },
        });
      }

      const rollupIncrements = new Map<string, number>();
      for (const e of toInsert) {
        const bucketStart = dayBucketStartUtc(new Date(e.at));
        const key = `${e.linkId}|${bucketStart.getTime()}`;
        rollupIncrements.set(key, (rollupIncrements.get(key) ?? 0) + 1);
      }
      for (const [key, n] of rollupIncrements) {
        const sep = key.lastIndexOf("|");
        const linkId = key.slice(0, sep);
        const bucketStart = new Date(Number(key.slice(sep + 1)));
        await tx.analyticsRollup.upsert({
          where: {
            granularity_bucketStart_scopeType_scopeId: {
              granularity: "DAY",
              bucketStart,
              scopeType: "LINK",
              scopeId: linkId,
            },
          },
          create: {
            granularity: "DAY",
            bucketStart,
            scopeType: "LINK",
            scopeId: linkId,
            linkId,
            totalClicks: n,
            uniqueClicks: 0,
          },
          update: {
            totalClicks: { increment: n },
          },
        });
      }
    });

    await this.pushFeedEntries(toInsert);

    return {
      inserted: toInsert.length,
      skippedDuplicate: unique.length - toInsert.length,
      linkIds: [...new Set(toInsert.map((e) => e.linkId))],
    };
  }

  /** Single-event path for tests and legacy callers. */
  async ingest(input: ClickIngestInput): Promise<void> {
    const envelope = buildClickEventEnvelope(input);
    await this.ingestBatch([envelope]);
  }

  private async pushFeedEntries(events: ClickEventEnvelope[]): Promise<void> {
    if (events.length === 0) return;
    try {
      const redis = getRedis();
      const pipe = redis.pipeline();
      for (const e of events) {
        pipe.lpush(
          RedisKeys.clickFeed(),
          JSON.stringify({
            linkId: e.linkId,
            at: e.at,
            referer: e.referrerDomain,
            deviceType: e.deviceType,
            bot: e.isBot,
          }),
        );
      }
      pipe.ltrim(RedisKeys.clickFeed(), 0, 199);
      await pipe.exec();
    } catch {
      // Redis failures must not break ingestion
    }
  }
}

/** @deprecated use click-event-build exports */
export { isBotUa, parseUa, visitorHash, referrerDomain };

export const clickIngestService = new ClickIngestService();
