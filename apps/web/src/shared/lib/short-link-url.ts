/**
 * Short links on this app: `/go/[slug]` (dwell → visit count) or `/r/[slug]` (instant redirect, click only).
 * Prefer `publicShortUrl` in UI so analytics visits can be measured on our origin.
 */
function buildShortUrl(slug: string, pathPrefix: "go" | "r"): string {
  const raw =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SHORT_LINK_HOST) ||
    (typeof process !== "undefined" && process.env.SHORT_LINK_HOST) ||
    "localhost:3000";
  const host = raw.replace(/^https?:\/\//, "").split("/")[0] ?? raw;
  const isLocal = host.startsWith("127.0.0.1") || host.startsWith("localhost");
  const scheme = isLocal ? "http" : "https";
  const path = `/${pathPrefix}/${encodeURIComponent(slug)}`;
  return `${scheme}://${host}${path}`;
}

/** Default share URL: `/go/` — after the configured dwell, counts a visit then redirects. */
export function publicShortUrl(slug: string): string {
  return buildShortUrl(slug, "go");
}

/** Instant redirect (no visit dwell); still records a click like `/r/` always has. */
export function publicInstantShortUrl(slug: string): string {
  return buildShortUrl(slug, "r");
}
