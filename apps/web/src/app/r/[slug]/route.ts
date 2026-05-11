import { NextResponse, type NextRequest } from "next/server";
import { after } from "next/server";
import { linkRepository } from "@/server/repositories/link-repository";
import { slugCacheService } from "@/server/services/slug-cache.service";
import { clickIngestService } from "@/server/services/click-ingest.service";
import { getRedis, RedisKeys } from "@/server/redis/client";
import { rateLimitAllow } from "@/server/services/rate-limit";

export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string | null {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() ?? null;
  return req.headers.get("x-real-ip");
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await ctx.params;
  const slug = raw.toLowerCase();
  const ip = clientIp(req);

  const window = Math.floor(Date.now() / 60_000).toString();
  const ipOk = await rateLimitAllow(RedisKeys.rateLimitIp(ip ?? "unknown", window), 300, 60);
  const slugOk = await rateLimitAllow(RedisKeys.rateLimitSlug(slug, window), 2000, 60);
  if (!ipOk || !slugOk) {
    return new NextResponse("Too Many Requests", { status: 429 });
  }

  let cached = await slugCacheService.get(slug);
  if (!cached) {
    const link = await linkRepository.findBySlug(slug);
    if (!link) return new NextResponse("Not Found", { status: 404 });
    cached = {
      destinationUrl: link.destinationUrl,
      linkId: link.id,
      status: link.status,
      expiresAt: link.expiresAt?.toISOString() ?? null,
    };
    await slugCacheService.set(slug, cached);
  }

  if (cached.status !== "ACTIVE") {
    return new NextResponse("Gone", { status: 410 });
  }
  if (cached.expiresAt && new Date(cached.expiresAt) < new Date()) {
    return new NextResponse("Gone", { status: 410 });
  }

  const ua = req.headers.get("user-agent");
  const referer = req.headers.get("referer");
  const country = req.headers.get("cf-ipcountry") ?? req.headers.get("x-country-code");

  after(async () => {
    try {
      await clickIngestService.ingest({
        linkId: cached.linkId,
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
            linkId: cached.linkId,
            ip,
            userAgent: ua,
            referer,
            country,
            at: new Date().toISOString(),
          }),
        );
      } catch {
        // best-effort queue buffer
      }
    }
  });

  return NextResponse.redirect(cached.destinationUrl, { status: 302 });
}
