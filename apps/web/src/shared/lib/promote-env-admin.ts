import { prisma } from "@/server/db/prisma";
import { isEnvAdminEmail } from "@/shared/lib/admin-emails-from-env";

/** Promote user to ADMIN when their email is listed in `ADMIN_EMAILS` / `BOOTSTRAP_ADMIN_EMAIL`. */
export async function promoteEnvAdminByEmail(email: string | null | undefined): Promise<void> {
  if (!isEnvAdminEmail(email)) return;

  const normalized = email!.trim().toLowerCase();
  await prisma.user.updateMany({
    where: { email: normalized, NOT: { role: "ADMIN" } },
    data: { role: "ADMIN" },
  });
}

export async function promoteEnvAdminByUserId(
  userId: string,
  email: string | null | undefined,
): Promise<void> {
  if (!isEnvAdminEmail(email)) return;

  await prisma.user.updateMany({
    where: { id: userId, NOT: { role: "ADMIN" } },
    data: { role: "ADMIN" },
  });
}
