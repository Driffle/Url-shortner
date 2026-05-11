"use server";

import { revalidatePath } from "next/cache";
import { getAppSession } from "@/server/auth-session";
import { linkService } from "@/server/services/link.service";

export async function createLinkAction(input: unknown) {
  const session = await getAppSession();
  if (!session?.user?.id || !session.user.role) throw new Error("Unauthorized");
  const link = await linkService.createLink(session.user.id, session.user.role, input);
  revalidatePath("/links");
  revalidatePath("/dashboard");
  return { ok: true as const, link };
}

export async function deleteLinkAction(linkId: string) {
  const session = await getAppSession();
  if (!session?.user?.id || !session.user.role) throw new Error("Unauthorized");
  await linkService.deleteLink(session.user.id, session.user.role, linkId);
  revalidatePath("/links");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
