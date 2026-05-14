import type { Session } from "next-auth";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/server/db/prisma";
import { isAuthBypassed } from "@/shared/lib/auth-bypass";

const LOCAL_DEV_EMAIL = "dev-local@driffle.com";

/** Avoid Prisma during `next build` / CI when DB is not available. */
function shouldSkipDbForBypassSession(): boolean {
  return (
    process.env.CI === "true" ||
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.NEXT_PHASE === "phase-development-build"
  );
}

function placeholderBypassSession(): Session {
  return {
    user: {
      id: "public-bypass-build",
      email: LOCAL_DEV_EMAIL,
      name: "Public access",
      image: null,
      role: "ADMIN",
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

async function ensureLocalDevUser() {
  const existing = await prisma.user.findUnique({ where: { email: LOCAL_DEV_EMAIL } });
  if (existing) return existing;
  try {
    return await prisma.user.create({
      data: {
        email: LOCAL_DEV_EMAIL,
        name: "Local Dev",
        role: "ADMIN",
        emailVerified: new Date(),
      },
    });
  } catch (e) {
    // Concurrent first requests can both try create; second hits unique on `email`.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const row = await prisma.user.findUnique({ where: { email: LOCAL_DEV_EMAIL } });
      if (row) return row;
    }
    throw e;
  }
}

/**
 * Use instead of `auth()` everywhere the app needs the current session.
 * When auth is bypassed (public env flags or `DISABLE_AUTH` in dev), returns a
 * synthetic ADMIN session backed by a real `User` row (required for FKs such as `Link.createdById`).
 *
 * On failure (DB down, misconfigured auth, etc.) logs the error and returns `null` so the root
 * layout can still render instead of a production-only digest crash.
 */
export async function getAppSession(): Promise<Session | null> {
  try {
    if (isAuthBypassed()) {
      if (shouldSkipDbForBypassSession()) {
        return placeholderBypassSession();
      }
      const user = await ensureLocalDevUser();
      return {
        user: {
          id: user.id,
          email: user.email!,
          name: user.name ?? "Local Dev",
          image: user.image,
          role: user.role,
        },
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
    }
    return await auth();
  } catch (err) {
    console.error("[getAppSession] failed — check DATABASE_URL, NEXTAUTH_SECRET, and Prisma schema vs DB", err);
    return null;
  }
}
