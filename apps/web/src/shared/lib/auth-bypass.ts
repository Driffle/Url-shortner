/**
 * Local development only: skip Google OAuth and middleware protection.
 * Hard-gated on NODE_ENV === "development" so production builds ignore DISABLE_AUTH.
 */
export function isLocalAuthDisabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.DISABLE_AUTH === "true";
}
