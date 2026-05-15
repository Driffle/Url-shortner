// When Google OAuth env vars are set and DISABLE_GOOGLE_AUTH is off, Driffle prod uses Google; otherwise credentials.
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prisma } from "@/server/db/prisma";
import { isAuthBypassed } from "@/shared/lib/auth-bypass";
import { isGoogleAuthDisabled } from "@/shared/lib/google-auth-disabled";
import { ensureGoogleOAuthCallbackEnv } from "@/shared/lib/google-oauth-callback";
import { isGoogleOAuthConfigured } from "@/shared/lib/google-oauth-config";

// Must run before providers are built so postinstall patch reads the correct redirect URI.
ensureGoogleOAuthCallbackEnv();

const googleEnabled =
  !isAuthBypassed() && isGoogleOAuthConfigured() && !isGoogleAuthDisabled();

const googleProvider = googleEnabled
  ? [
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID!.trim(),
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
        // Static endpoints avoid full OIDC discovery. Google's discovery advertises
        // `authorization_response_iss_parameter_supported`, but Google's redirect often
        // omits `iss`, which makes oauth4webapi throw "response parameter iss missing".
        authorization: {
          url: "https://accounts.google.com/o/oauth2/v2/auth",
          params: { prompt: "select_account" },
        },
        token: "https://oauth2.googleapis.com/token",
        userinfo: "https://openidconnect.googleapis.com/v1/userinfo",
        // redirect_uri comes from provider.callbackUrl (GOOGLE_OAUTH_CALLBACK_URL in providers.js).
      }),
    ]
  : [];

const credentialsProvider =
  !isAuthBypassed() && !googleEnabled
    ? [
        Credentials({
          name: "Driffle",
          credentials: {
            email: { label: "Email", type: "email" },
            password: { label: "Password", type: "password" },
          },
          async authorize(creds) {
            const emailRaw = creds?.email;
            const passwordRaw = creds?.password;
            if (typeof emailRaw !== "string" || typeof passwordRaw !== "string") return null;
            const email = emailRaw.trim().toLowerCase();
            const password = passwordRaw;
            if (!email || !password) return null;

            const domain = (process.env.ALLOWED_EMAIL_DOMAIN ?? "driffle.com").toLowerCase().trim();
            if (!email.endsWith(`@${domain}`)) return null;

            const user = await prisma.user.findUnique({
              where: { email },
              select: { id: true, email: true, name: true, passwordHash: true },
            });
            if (!user?.passwordHash) return null;

            const bcrypt = await import("bcryptjs");
            const ok = await bcrypt.compare(password, user.passwordHash);
            if (!ok) return null;

            return {
              id: user.id,
              email: user.email,
              name: user.name ?? email.split("@")[0] ?? "User",
            };
          },
        }),
      ]
    : [];

export const authConfig: NextAuthConfig = {
  providers: [...googleProvider, ...credentialsProvider],
  pages: { signIn: "/login" },
  session: { strategy: "database", maxAge: 30 * 24 * 60 * 60 },
  trustHost: true,
};
