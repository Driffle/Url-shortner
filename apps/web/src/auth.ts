/**
 * NextAuth — Google when `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` are set and `DISABLE_GOOGLE_AUTH` is off
 * (typical Driffle production); otherwise email/password for @driffle.com (`user:set-password`).
 * No-login mode: `PUBLIC_APP_NO_AUTH` / `NEXT_PUBLIC_PUBLIC_APP_NO_AUTH` or local `DISABLE_AUTH` (see `auth-bypass.ts`).
 */
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { getEnv } from "@/shared/validations/env";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: getEnv().NEXTAUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    async signIn({ user, profile, account }) {
      const domain = getEnv().ALLOWED_EMAIL_DOMAIN.toLowerCase();
      const email =
        account?.provider === "credentials"
          ? user.email?.toLowerCase()
          : (user.email ?? profile?.email)?.toLowerCase();
      if (!email || !email.endsWith(`@${domain}`)) return "/login?error=Domain";
      return true;
    },
    async jwt({ token, user }) {
      const id = user?.id ?? token.sub;
      if (id) {
        const u = await prisma.user.findUnique({
          where: { id },
          select: { role: true },
        });
        token.role = u?.role ?? "EDITOR";
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      session.user.role = (token.role as UserRole | undefined) ?? "EDITOR";
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      const count = await prisma.user.count();
      if (count <= 1) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: "ADMIN" },
        });
        return;
      }
      const firstAdmin = process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase();
      if (firstAdmin && user.email?.toLowerCase() === firstAdmin) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: "ADMIN" },
        });
      }
    },
  },
});
