import { after } from "next/server";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { linkRepository } from "@/server/repositories/link-repository";
import { slugCacheService } from "@/server/services/slug-cache.service";
import { clickIngestService } from "@/server/services/click-ingest.service";
import { getRedis, RedisKeys } from "@/server/redis/client";
import { rateLimitAllow } from "@/server/services/rate-limit";
import { getEnv } from "@/shared/validations/env";
import { createVisitToken } from "@/shared/lib/visit-token";
import { VisitBridge } from "./visit-bridge";

export const dynamic = "force-dynamic";

function clientIp(h: Headers): string | null {
  const xf = h.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() ?? null;
  return h.get("x-real-ip");
}

export default async function GoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const slug = raw.toLowerCase();
  const h = await headers();
  const ip = clientIp(h);

  const window = Math.floor(Date.now() / 60_000).toString();
  const ipOk = await rateLimitAllow(RedisKeys.rateLimitIp(ip ?? "unknown", window), 300, 60);
  const slugOk = await rateLimitAllow(RedisKeys.rateLimitSlug(slug, window), 2000, 60);
  if (!ipOk || !slugOk) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-center text-slate-200">
        <p className="max-w-sm text-sm">Too many requests. Please try again in a minute.</p>
      </div>
    );
  }

  let cached = await slugCacheService.get(slug);
  if (!cached) {
    const link = await linkRepository.findBySlug(slug);
    if (!link) notFound();
    cached = {
      destinationUrl: link.destinationUrl,
      linkId: link.id,
      status: link.status,
      expiresAt: link.expiresAt?.toISOString() ?? null,
    };
    await slugCacheService.set(slug, cached);
  }

  if (cached.status !== "ACTIVE") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-center text-slate-200">
        <p className="max-w-sm text-sm">This short link is not available.</p>
      </div>
    );
  }
  if (cached.expiresAt && new Date(cached.expiresAt) < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-center text-slate-200">
        <p className="max-w-sm text-sm">This short link has expired.</p>
      </div>
    );
  }

  const ua = h.get("user-agent");
  const referer = h.get("referer");
  const country = h.get("cf-ipcountry") ?? h.get("x-country-code");
  const linkId = cached.linkId;

  after(async () => {
    try {
      await clickIngestService.ingest({
        linkId,
        ip,
        userAgent: ua,
        referer,
        countryCode: country,
      });
    } catch {
      try {
        const redis = getRedis();
        await redis.lpush(
          RedisKeys.clickQueue(),
          JSON.stringify({
            linkId,
            ip,
            userAgent: ua,
            referer,
            country,
            at: new Date().toISOString(),
          }),
        );
      } catch {
        // best-effort
      }
    }
  });

  const holdSeconds = getEnv().VISIT_HOLD_SECONDS;
  const visitToken = createVisitToken(slug);

  return (
    <VisitBridge
      slug={slug}
      destinationUrl={cached.destinationUrl}
      visitToken={visitToken}
      holdSeconds={holdSeconds}
    />
  );
}
