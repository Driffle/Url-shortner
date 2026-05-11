import { createHash } from "crypto";
import { prisma } from "@/server/db/prisma";
import { getRedis, RedisKeys } from "@/server/redis/client";

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

function isBotUa(ua: string | null | undefined): boolean {
  if (!ua) return false;
  return /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora link preview/i.test(ua);
}

function parseUa(ua: string | null): { deviceType: string; osName: string; browserName: string } {
  const u = ua ?? "";
  const mobile = /Mobile|Android|iPhone|iPad|webOS|BlackBerry|IEMobile|Opera Mini/i.test(u);
  const tablet = /iPad|Tablet/i.test(u);
  const deviceType = tablet ? "tablet" : mobile ? "mobile" : "desktop";

  let osName = "unknown";
  if (/Windows NT/i.test(u)) osName = "windows";
  else if (/Mac OS X/i.test(u)) osName = "macos";
  else if (/Android/i.test(u)) osName = "android";
  else if (/iPhone|iPad|iOS/i.test(u)) osName = "ios";
  else if (/Linux/i.test(u)) osName = "linux";

  let browserName = "unknown";
  if (/Edg\//i.test(u)) browserName = "edge";
  else if (/Chrome\//i.test(u) && !/Chromium/i.test(u)) browserName = "chrome";
  else if (/Safari/i.test(u) && !/Chrome/i.test(u)) browserName = "safari";
  else if (/Firefox\//i.test(u)) browserName = "firefox";

  return { deviceType, osName, browserName };
}

function visitorHash(ip: string | null, ua: string | null, dayBucket: string): string {
  const secret = process.env.NEXTAUTH_SECRET ?? "dev";
  return hash(`${secret}:${dayBucket}:${ip ?? ""}:${ua ?? ""}`);
}

function referrerDomain(referer: string | null): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export class ClickIngestService {
  async ingest(input: ClickIngestInput): Promise<void> {
    const ua = input.userAgent ?? "";
    const bot = isBotUa(ua);
    const day = new Date().toISOString().slice(0, 10);
    const vHash = visitorHash(input.ip, input.userAgent, day);
    const { deviceType, osName, browserName } = parseUa(input.userAgent);
    const devSig = hash(`${deviceType}|${osName}|${browserName}`);
    const refDomain = referrerDomain(input.referer);

    await prisma.$transaction(async (tx) => {
      const device = await tx.device.upsert({
        where: { signature: devSig },
        create: { signature: devSig, deviceType, osName, browserName },
        update: {},
      });

      let referrerId: string | null = null;
      if (refDomain) {
        const ref = await tx.referrer.upsert({
          where: { domain: refDomain },
          create: { domain: refDomain },
          update: {},
        });
        referrerId = ref.id;
      }

      await tx.clickEvent.create({
        data: {
          linkId: input.linkId,
          deviceId: device.id,
          referrerId,
          visitorHash: vHash,
          countryCode: input.countryCode ?? null,
          isBot: bot,
        },
      });

      await tx.link.update({
        where: { id: input.linkId },
        data: { clickCount: { increment: 1 } },
      });

      const rollupKey = this.dayBucketStart();
      await tx.analyticsRollup.upsert({
        where: {
          granularity_bucketStart_scopeType_scopeId: {
            granularity: "DAY",
            bucketStart: rollupKey,
            scopeType: "LINK",
            scopeId: input.linkId,
          },
        },
        create: {
          granularity: "DAY",
          bucketStart: rollupKey,
          scopeType: "LINK",
          scopeId: input.linkId,
          linkId: input.linkId,
          totalClicks: 1,
          uniqueClicks: 0,
        },
        update: {
          totalClicks: { increment: 1 },
        },
      });
    });

    try {
      const redis = getRedis();
      const payload = {
        linkId: input.linkId,
        at: new Date().toISOString(),
        referer: refDomain,
        deviceType,
        bot,
      };
      await redis.lpush(RedisKeys.clickFeed(), JSON.stringify(payload));
      await redis.ltrim(RedisKeys.clickFeed(), 0, 199);
    } catch {
      // Redis failures must not break ingestion path
    }
  }

  private dayBucketStart(): Date {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  }
}

export const clickIngestService = new ClickIngestService();
