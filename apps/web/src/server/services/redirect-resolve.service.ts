import { linkRepository } from "@/server/repositories/link-repository";
import {
  slugCacheService,
  type CachedSlugPayload,
} from "@/server/services/slug-cache.service";
import { RedisKeys } from "@/server/redis/client";
import { rateLimitAllow } from "@/server/services/rate-limit";

export type RedirectRequestMeta = {
  ip: string | null;
  userAgent: string | null;
  referer: string | null;
  countryCode: string | null;
};

export type ResolveSlugForRedirectResult =
  | { kind: "rate_limited" }
  | { kind: "not_found" }
  | { kind: "gone" }
  | { kind: "ok"; slug: string; link: CachedSlugPayload; meta: RedirectRequestMeta };

function rateLimitWindowKey(): string {
  return Math.floor(Date.now() / 60_000).toString();
}

/**
 * Shared redirect resolution: rate limits, slug cache (incl. negative cache), Postgres fallback.
 */
export async function resolveSlugForRedirect(
  rawSlug: string,
  meta: RedirectRequestMeta,
): Promise<ResolveSlugForRedirectResult> {
  const slug = rawSlug.toLowerCase();
  const window = rateLimitWindowKey();
  const ipOk = await rateLimitAllow(RedisKeys.rateLimitIp(meta.ip ?? "unknown", window), 300, 60);
  const slugOk = await rateLimitAllow(RedisKeys.rateLimitSlug(slug, window), 2000, 60);
  if (!ipOk || !slugOk) {
    return { kind: "rate_limited" };
  }

  if (await slugCacheService.isNegativeCached(slug)) {
    return { kind: "not_found" };
  }

  let cached = await slugCacheService.get(slug);
  if (!cached) {
    const link = await linkRepository.findBySlug(slug);
    if (!link) {
      await slugCacheService.markNegative(slug);
      return { kind: "not_found" };
    }
    cached = {
      destinationUrl: link.destinationUrl,
      linkId: link.id,
      status: link.status,
      expiresAt: link.expiresAt?.toISOString() ?? null,
    };
    await slugCacheService.refresh(slug, cached);
  }

  if (cached.status !== "ACTIVE") {
    return { kind: "gone" };
  }
  if (cached.expiresAt && new Date(cached.expiresAt) < new Date()) {
    return { kind: "gone" };
  }

  return { kind: "ok", slug, link: cached, meta };
}

export function clientIpFromHeaders(headers: Headers): string | null {
  const xf = headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() ?? null;
  return headers.get("x-real-ip");
}

export function redirectMetaFromHeaders(headers: Headers): RedirectRequestMeta {
  return {
    ip: clientIpFromHeaders(headers),
    userAgent: headers.get("user-agent"),
    referer: headers.get("referer"),
    countryCode: headers.get("cf-ipcountry") ?? headers.get("x-country-code"),
  };
}
