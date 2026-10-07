import { normalizeAppHost } from "@/shared/lib/app-host";

/**
 * Short links on this app: `/go/[slug]` (dwell → visit count) or `/r/[slug]` (instant redirect, click only).
 * Prefer `publicShortUrl` in UI so analytics visits can be measured on our origin.
 */

function fallbackShortLinkHost(): string {
  const raw =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SHORT_LINK_HOST) ||
    (typeof process !== "undefined" && process.env.SHORT_LINK_HOST) ||
    "localhost:3000";
  return normalizeAppHost(raw) || "localhost";
}

function resolveShortLinkHost(requestHost?: string | null): string {
  const fromRequest = normalizeAppHost(requestHost);
  if (fromRequest) return fromRequest;
  return fallbackShortLinkHost();
}

function buildShortUrl(slug: string, pathPrefix: "go" | "r", requestHost?: string | null): string {
  const host = resolveShortLinkHost(requestHost);
  const isLocal = host.startsWith("127.0.0.1") || host.startsWith("localhost");
  const scheme = isLocal ? "http" : "https";
  const path = `/${pathPrefix}/${encodeURIComponent(slug)}`;
  return `${scheme}://${host}${path}`;
}

/** Default share URL: `/go/` — after the configured dwell, counts a visit then redirects. */
export function publicShortUrl(slug: string, requestHost?: string | null): string {
  return buildShortUrl(slug, "go", requestHost);
}

/** Instant redirect (no visit dwell); still records a click like `/r/` always has. */
export function publicInstantShortUrl(slug: string, requestHost?: string | null): string {
  return buildShortUrl(slug, "r", requestHost);
}
