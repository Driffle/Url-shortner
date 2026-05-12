/**
 * Authentication bypass for the internal URL shortener.
 *
 * **Open access (no login):** set `PUBLIC_APP_NO_AUTH=true` and/or
 * `NEXT_PUBLIC_PUBLIC_APP_NO_AUTH=true` (see `.env.example`). Defaults are **off**
 * so production never accidentally skips sign-in. In this mode **Google OAuth is
 * not used** — leave `GOOGLE_*` empty.
 *
 * **Local dev only:** `DISABLE_AUTH=true` with `NODE_ENV=development` still bypasses
 * Google OAuth without setting the public flags above.
 */

function truthyEnv(v: string | undefined): boolean {
  return v === "true" || v === "1";
}

/** Explicit opt-in via env (server + Edge middleware + client when NEXT_PUBLIC_* is set). */
export function isPublicAppNoAuthEnabled(): boolean {
  return (
    truthyEnv(process.env.PUBLIC_APP_NO_AUTH) || truthyEnv(process.env.NEXT_PUBLIC_PUBLIC_APP_NO_AUTH)
  );
}

/**
 * Local development only: skip Google OAuth when `DISABLE_AUTH=true`.
 * Gated on `NODE_ENV === "development"`.
 */
export function isLocalAuthDisabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.DISABLE_AUTH === "true";
}

/** True when the app should not require sign-in (public access or local dev bypass). */
export function isAuthBypassed(): boolean {
  return isPublicAppNoAuthEnabled() || isLocalAuthDisabled();
}
