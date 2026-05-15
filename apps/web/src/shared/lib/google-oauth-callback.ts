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
    const hostname = host.replace(/^https?:\/\//, "").split("/")[0];
    if (hostname && !hostname.startsWith("127.0.0.1") && hostname !== "localhost") {
      return `https://${hostname}${GOOGLE_OAUTH_CALLBACK_PATH}`;
    }
  }

  if (process.env.NODE_ENV === "production") {
    console.error(
      "[auth] Set NEXTAUTH_URL and AUTH_URL to your public origin (e.g. https://shortly.driffle.net) in Deployer — " +
        "Google OAuth cannot use localhost in production.",
    );
  }

  // Local dev only
  return `http://127.0.0.1:3000${GOOGLE_OAUTH_CALLBACK_PATH}`;
}

/** Refresh on each process start (and before Auth.js loads providers). */
export function ensureGoogleOAuthCallbackEnv(): void {
  process.env.GOOGLE_OAUTH_CALLBACK_URL = googleOAuthCallbackUrl();
}
