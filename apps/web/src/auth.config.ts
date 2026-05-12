// Google OAuth is optional when the app runs in no-login mode; see `auth-bypass.ts` + `google-oauth-config.ts`.
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { isAuthBypassed } from "@/shared/lib/auth-bypass";
import { isGoogleOAuthConfigured } from "@/shared/lib/google-oauth-config";

const googleProvider =
  !isAuthBypassed() && isGoogleOAuthConfigured()
    ? [
        Google({
          clientId: process.env.GOOGLE_CLIENT_ID!.trim(),
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
          authorization: { params: { prompt: "select_account" } },
        }),
      ]
    : [];

export const authConfig: NextAuthConfig = {
  providers: googleProvider,
  pages: { signIn: "/login" },
  session: { strategy: "database", maxAge: 30 * 24 * 60 * 60 },
  trustHost: true,
};
