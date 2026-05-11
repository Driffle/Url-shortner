import { redirect } from "next/navigation";
import { getAppSession } from "@/server/auth-session";
import { isAuthBypassed } from "@/shared/lib/auth-bypass";
import { LoginForm } from "@/features/auth/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const params = await searchParams;
  if (isAuthBypassed()) redirect(params.callbackUrl ?? "/dashboard");
  const session = await getAppSession();
  if (session) redirect(params.callbackUrl ?? "/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-slate-900 p-4">
      <LoginForm callbackUrl={params.callbackUrl ?? "/dashboard"} showDomainError={params.error === "Domain"} />
    </div>
  );
}
