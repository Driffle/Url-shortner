import type { Session } from "next-auth";
import { auth } from "@/auth";
import { prisma } from "@/server/db/prisma";
import { isLocalAuthDisabled } from "@/shared/lib/auth-bypass";

const LOCAL_DEV_EMAIL = "dev-local@driffle.com";

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
 * When `DISABLE_AUTH=true` in development, returns a synthetic ADMIN session
 * backed by a real `User` row (required for FKs such as `Link.createdById`).
 */
export async function getAppSession(): Promise<Session | null> {
  if (isLocalAuthDisabled()) {
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
