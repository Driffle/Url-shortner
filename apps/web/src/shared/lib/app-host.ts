/** Normalize hostname for allowlist / short-link display (no port, lowercase, no scheme). */
export function normalizeAppHost(raw: string | null | undefined): string {
  if (!raw?.trim()) return "";
  const withoutScheme = raw.trim().replace(/^https?:\/\//i, "");
  const hostPort = withoutScheme.split("/")[0] ?? "";
  return hostPort.split(":")[0]?.toLowerCase() ?? "";
}

/** Parse `ALLOWED_APP_HOSTS` (comma-separated FQDNs). Empty env → no restriction (`null`). */
export function parseAllowedAppHosts(envValue: string | null | undefined): Set<string> | null {
  const raw = envValue?.trim();
  if (!raw) return null;
  const set = new Set<string>();
  for (const part of raw.split(",")) {
    const h = normalizeAppHost(part);
    if (h) set.add(h);
  }
  return set.size > 0 ? set : null;
}

export function isAllowedAppHost(hostname: string, allowed: Set<string> | null): boolean {
  if (!allowed) return true;
  const h = normalizeAppHost(hostname);
  return h.length > 0 && allowed.has(h);
}

/** Host from Fetch / NextRequest headers (x-forwarded-host first). */
export function hostFromHeaderBag(get: (name: string) => string | null): string {
  const xf = get("x-forwarded-host");
  if (xf?.trim()) {
    return normalizeAppHost(xf.split(",")[0]);
  }
  return normalizeAppHost(get("host"));
}
