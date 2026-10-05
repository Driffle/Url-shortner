import { NextResponse } from "next/server";
import { z } from "zod";
import { LinkStatus } from "@prisma/client";
import { getAppSession } from "@/server/auth-session";
import { linkService } from "@/server/services/link.service";
import { can, Permissions } from "@/shared/lib/rbac";

export const dynamic = "force-dynamic";

const patchLinkBodySchema = z
  .object({
    destinationUrl: z.string().url().max(2048).optional(),
    status: z.nativeEnum(LinkStatus).optional(),
    notes: z.string().max(2000).optional(),
  })
  .refine((b) => b.destinationUrl !== undefined || b.status !== undefined || b.notes !== undefined, {
    message: "Provide at least one field to update",
  });

/** Update link metadata; refreshes slug cache (pause/resume/destination). */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getAppSession();
  if (!session?.user?.id || !session.user.role || !can(session.user.role, Permissions.editLinks)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchLinkBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const link = await linkService.updateLink(session.user.id, session.user.role, {
      id,
      ...parsed.data,
    });
    return NextResponse.json({ ok: true, link: { id: link.id, slug: link.slug, status: link.status } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Update failed";
    const status = message === "Not found" ? 404 : message.includes("Forbidden") || message.includes("role") ? 403 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
