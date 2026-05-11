// Google OAuth config. App entry may bypass login; see `src/shared/lib/auth-bypass.ts`.
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: { params: { prompt: "select_account" } },
    }),
  ],
  pages: { signIn: "/login" },
  session: { strategy: "database", maxAge: 30 * 24 * 60 * 60 },
  trustHost: true,
};
