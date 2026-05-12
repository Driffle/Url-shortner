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

/** Subset of env used for bypass checks (also validated in `env.ts`). */
export type AuthBypassEnvFields = {
  PUBLIC_APP_NO_AUTH?: string | undefined;
  NEXT_PUBLIC_PUBLIC_APP_NO_AUTH?: string | undefined;
  DISABLE_AUTH?: string | undefined;
  NODE_ENV?: string | undefined;
};

/** Same rules as runtime bypass, but reads from validated/parsed env fields. */
export function isAuthBypassedFromEnvFields(e: AuthBypassEnvFields): boolean {
  const open =
    truthyEnv(e.PUBLIC_APP_NO_AUTH) || truthyEnv(e.NEXT_PUBLIC_PUBLIC_APP_NO_AUTH);
  const localDev = e.NODE_ENV === "development" && e.DISABLE_AUTH === "true";
  return open || localDev;
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
  return isAuthBypassedFromEnvFields({
    PUBLIC_APP_NO_AUTH: process.env.PUBLIC_APP_NO_AUTH,
    NEXT_PUBLIC_PUBLIC_APP_NO_AUTH: process.env.NEXT_PUBLIC_PUBLIC_APP_NO_AUTH,
    DISABLE_AUTH: process.env.DISABLE_AUTH,
    NODE_ENV: process.env.NODE_ENV,
  });
}
