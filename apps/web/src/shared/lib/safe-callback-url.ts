const DEFAULT_FALLBACK = "/dashboard";

/**
 * Restrict post-login redirects to same-origin relative paths only (open redirect prevention).
 * Rejects absolute URLs, protocol-relative URLs, backslashes, and control characters.
 */
export function sanitizeCallbackUrl(
  raw: string | string[] | undefined,
  fallback: string = DEFAULT_FALLBACK,
): string {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v || typeof v !== "string") return fallback;
  const t = v.trim();
  if (!t.startsWith("/")) return fallback;
  if (t.startsWith("//")) return fallback;
  if (t.includes("://") || t.includes("\\")) return fallback;
  if (/[\s\r\n\x00]/.test(t)) return fallback;
  if (t.length > 2048) return fallback;
  try {
    if (decodeURIComponent(t).includes("://")) return fallback;
  } catch {
    return fallback;
  }
  return t;
}
