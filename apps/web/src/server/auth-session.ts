import type { Session } from "next-auth";
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
  return prisma.user.upsert({
    where: { email: LOCAL_DEV_EMAIL },
    create: {
      email: LOCAL_DEV_EMAIL,
      name: "Local Dev",
      role: "ADMIN",
      emailVerified: new Date(),
    },
    update: {},
  });
}

/**
 * Use instead of `auth()` everywhere the app needs the current session.
 * When auth is bypassed (`PUBLIC_APP_NO_AUTH` or `DISABLE_AUTH` in dev), returns a
 * synthetic ADMIN session backed by a real `User` row (required for FKs such as `Link.createdById`).
 */
export async function getAppSession(): Promise<Session | null> {
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
  return auth();
}
