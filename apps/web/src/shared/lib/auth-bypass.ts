/**
 * Authentication bypass for the internal URL shortener.
 *
 * When `PUBLIC_APP_NO_AUTH` is `true`, the app is open to everyone: no login,
 * middleware does not enforce JWT, and `getAppSession()` uses a built-in admin user.
 *
 * Set to `false` and deploy to restore Google OAuth + domain restriction.
 */
export const PUBLIC_APP_NO_AUTH = true;

/**
 * Local development only: skip Google OAuth (still requires PUBLIC_APP_NO_AUTH or this + dev).
 * Hard-gated on NODE_ENV === "development" so production ignores `DISABLE_AUTH` alone.
 */
export function isLocalAuthDisabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.DISABLE_AUTH === "true";
}

/** True when the app should not require sign-in (public access or local dev bypass). */
export function isAuthBypassed(): boolean {
  return PUBLIC_APP_NO_AUTH || isLocalAuthDisabled();
}
