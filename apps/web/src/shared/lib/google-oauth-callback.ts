import { normalizeAppHost } from "@/shared/lib/app-host";

/** OAuth redirect path registered in Google Cloud Console for this app. */
export const GOOGLE_OAUTH_CALLBACK_PATH = "/api/auth/google/callback";

function trimEnv(key: string): string | undefined {
  const v = process.env[key]?.trim();
  return v && v.length > 0 ? v : undefined;
}

function originFromUrlLike(raw: string): string | null {
  try {
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(withScheme.replace(/\/+$/, "")).origin;
  } catch {
    return null;
  }
}

/** Per-host Google redirect URI (must be registered in Google Console for each public hostname). */
export function googleOAuthCallbackUrlForHost(host: string): string {
  const h = normalizeAppHost(host);
  const isLocal = h.startsWith("127.0.0.1") || h === "localhost";
  const origin = isLocal ? `http://${h === "localhost" ? "127.0.0.1:3000" : h}` : `https://${h}`;
  return `${origin}${GOOGLE_OAUTH_CALLBACK_PATH}`;
}

/** True when OAuth redirect should follow the request Host (multi-domain Shortly). */
export function isMultiHostOAuthEnabled(): boolean {
  const raw = trimEnv("ALLOWED_APP_HOSTS");
  if (raw) {
    const parts = raw.split(",").map((p) => normalizeAppHost(p)).filter(Boolean);
    if (parts.length >= 1) return true;
  }
  const flag = (process.env.MULTI_HOST_OAUTH ?? "").trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

/**
 * Full Google OAuth redirect URI (must match Google Console exactly).
 * Uses env only — never `127.0.0.1` in production.
 */
export function googleOAuthCallbackUrl(): string {
  const explicit = trimEnv("GOOGLE_OAUTH_CALLBACK_URL");
  if (explicit) return explicit;

  for (const key of ["AUTH_URL", "NEXTAUTH_URL", "PUBLIC_APP_URL"] as const) {
    const raw = trimEnv(key);
    if (raw) {
      const origin = originFromUrlLike(raw);
      if (origin) return `${origin}${GOOGLE_OAUTH_CALLBACK_PATH}`;
    }
  }

  const host = trimEnv("SHORT_LINK_HOST") ?? trimEnv("NEXT_PUBLIC_SHORT_LINK_HOST");
  if (host) {
    const hostname = normalizeAppHost(host);
    if (hostname && !hostname.startsWith("127.0.0.1") && hostname !== "localhost") {
      return googleOAuthCallbackUrlForHost(hostname);
    }
  }

  if (process.env.NODE_ENV === "production") {
    console.error(
      "[auth] Set NEXTAUTH_URL and AUTH_URL to your public origin (e.g. https://shortly.driffle.net) in Deployer — " +
        "Google OAuth cannot use localhost in production.",
    );
  }

  return googleOAuthCallbackUrlForHost("127.0.0.1:3000");
}

/** Pin callback at process start for single-host mode; skip when multi-host allowlist is configured. */
export function ensureGoogleOAuthCallbackEnv(): void {
  if (isMultiHostOAuthEnabled()) return;
  process.env.GOOGLE_OAUTH_CALLBACK_URL = googleOAuthCallbackUrl();
}
