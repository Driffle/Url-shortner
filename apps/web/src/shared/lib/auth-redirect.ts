import {
  hostFromHeaderBag,
  isAllowedAppHost,
  normalizeAppHost,
  parseAllowedAppHosts,
} from "@/shared/lib/app-host";
import { isMultiHostOAuthEnabled } from "@/shared/lib/google-oauth-callback";

/** HTTPS (or http for local) origin for Auth.js redirects and OAuth. */
export function publicOriginFromAppHost(host: string): string {
  const h = normalizeAppHost(host);
  if (!h) return "";
  if (h.startsWith("127.0.0.1") || h === "localhost") {
    return h.includes(":") ? `http://${h}` : "http://127.0.0.1:3000";
  }
  return `https://${h}`;
}

function stripTrailingSlash(origin: string): string {
  return origin.replace(/\/+$/, "");
}

/** Default Auth.js redirect behavior for a given base origin. */
export function authRedirectWithBase(url: string, baseUrl: string): string {
  const base = stripTrailingSlash(baseUrl);
  if (url.startsWith("/")) return `${base}${url}`;
  try {
    if (new URL(url).origin === new URL(base).origin) return url;
  } catch {
    /* invalid url */
  }
  return base;
}

/**
 * Post-login redirect: keep users on the hostname they signed in from when multi-host is enabled.
 */
export function resolveAuthRedirectUrl(
  url: string,
  baseUrl: string,
  requestHost: string | null | undefined,
): string {
  if (!isMultiHostOAuthEnabled()) {
    return authRedirectWithBase(url, baseUrl);
  }
  const allowed = parseAllowedAppHosts(process.env.ALLOWED_APP_HOSTS);
  const host = normalizeAppHost(requestHost ?? "");
  if (!host || !isAllowedAppHost(host, allowed)) {
    return authRedirectWithBase(url, baseUrl);
  }
  return authRedirectWithBase(url, publicOriginFromAppHost(host));
}

/** Read request host from Next headers() when inside a Server Action / auth callback. */
export async function resolveAuthRedirectUrlFromHeaders(
  url: string,
  baseUrl: string,
): Promise<string> {
  if (!isMultiHostOAuthEnabled()) {
    return authRedirectWithBase(url, baseUrl);
  }
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const host = hostFromHeaderBag((name) => h.get(name));
    return resolveAuthRedirectUrl(url, baseUrl, host);
  } catch {
    return authRedirectWithBase(url, baseUrl);
  }
}
