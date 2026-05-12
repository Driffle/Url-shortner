/**
 * NextAuth — Google provider is registered only when sign-in is required and `GOOGLE_*` are set.
 * No-login mode: `PUBLIC_APP_NO_AUTH` / `NEXT_PUBLIC_PUBLIC_APP_NO_AUTH` or local `DISABLE_AUTH` (see `auth-bypass.ts`).
 */
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { getEnv } from "@/shared/validations/env";
import { authConfig } from "@/auth.config";

/** Auth.js v5 prefers `AUTH_SECRET`; many stacks still set `NEXTAUTH_SECRET` only. */
const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: authSecret,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    async signIn({ user, profile }) {
      const domain = getEnv().ALLOWED_EMAIL_DOMAIN.toLowerCase();
      const email = (user.email ?? profile?.email)?.toLowerCase();
      if (!email || !email.endsWith(`@${domain}`)) return "/login?error=Domain";
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user?.id) {
        const u = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        token.role = u?.role ?? "VIEWER";
      }
      if (trigger === "update" && token.sub) {
        const u = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true },
        });
        if (u) token.role = u.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      if (token.role) session.user.role = token.role as UserRole;
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
