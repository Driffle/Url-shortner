import { redirect } from "next/navigation";
import { getAppSession } from "@/server/auth-session";
import { isAuthBypassed } from "@/shared/lib/auth-bypass";
import { isGoogleAuthDisabled } from "@/shared/lib/google-auth-disabled";
import { isGoogleOAuthConfigured } from "@/shared/lib/google-oauth-config";
import { sanitizeCallbackUrl } from "@/shared/lib/safe-callback-url";
import { LoginForm } from "@/features/auth/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const params = await searchParams;
  // Open-redirect safe: only same-origin relative paths (see sanitizeCallbackUrl).
  const next = sanitizeCallbackUrl(params.callbackUrl);

  if (isAuthBypassed()) redirect(next);
  const session = await getAppSession();
  if (session) redirect(next);

  const googleEnabled =
    !isAuthBypassed() && isGoogleOAuthConfigured() && !isGoogleAuthDisabled();
  const authMode = googleEnabled ? "google" : "credentials";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-slate-900 p-4">
      <LoginForm callbackUrl={next} showDomainError={params.error === "Domain"} authMode={authMode} />
    </div>
  );
}
