/**
 * Full clickable short URL as served by this app (`/r/[slug]`).
 * Use everywhere we show "copy" / table links so users never get root `/slug` 404s.
 */
export function publicShortUrl(slug: string): string {
  const raw =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SHORT_LINK_HOST) ||
    (typeof process !== "undefined" && process.env.SHORT_LINK_HOST) ||
    "localhost:3000";
  const host = raw.replace(/^https?:\/\//, "").split("/")[0] ?? raw;
  const isLocal = host.startsWith("127.0.0.1") || host.startsWith("localhost");
  const scheme = isLocal ? "http" : "https";
  const path = `/r/${encodeURIComponent(slug)}`;
  return `${scheme}://${host}${path}`;
}
