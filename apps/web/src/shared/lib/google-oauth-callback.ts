/** OAuth redirect path registered in Google Cloud Console for this app. */
export const GOOGLE_OAUTH_CALLBACK_PATH = "/api/auth/google/callback";

/**
 * Full Google OAuth redirect URI (must match Google Console exactly).
 * Built from `AUTH_URL` or `NEXTAUTH_URL` — never from the incoming request host
 * (avoids `https://localhost:3000/...` behind Docker / Cloudflare tunnels).
 */
export function googleOAuthCallbackUrl(): string {
  const raw = (process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "").trim();
  if (raw) {
    try {
      const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      const origin = new URL(withScheme.replace(/\/+$/, "")).origin;
      return `${origin}${GOOGLE_OAUTH_CALLBACK_PATH}`;
    } catch {
      // fall through
    }
  }
  const fallback =
    process.env.VERCEL_URL != null && process.env.VERCEL_URL !== ""
      ? `https://${process.env.VERCEL_URL}`
      : "http://127.0.0.1:3000";
  return `${fallback.replace(/\/+$/, "")}${GOOGLE_OAUTH_CALLBACK_PATH}`;
}

/** Set before Auth.js parses providers (see `scripts/patch-auth-google-callback.mjs`). */
export function ensureGoogleOAuthCallbackEnv(): void {
  const current = process.env.GOOGLE_OAUTH_CALLBACK_URL?.trim();
  if (!current) {
    process.env.GOOGLE_OAUTH_CALLBACK_URL = googleOAuthCallbackUrl();
  }
}
