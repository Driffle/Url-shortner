/** When true, Google OAuth is never registered even if client id/secret are set (break-glass password-only). */
export function isGoogleAuthDisabled(): boolean {
  const v = process.env.DISABLE_GOOGLE_AUTH?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}
