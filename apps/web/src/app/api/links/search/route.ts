import { NextResponse } from "next/server";
import { getAppSession } from "@/server/auth-session";
import { prisma } from "@/server/db/prisma";
import { can, Permissions } from "@/shared/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getAppSession();
  if (!session?.user?.role || !can(session.user.role, Permissions.readAnalytics)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const limit = Math.min(20, Math.max(1, Number(url.searchParams.get("limit") ?? "20") || 20));

  const links = await prisma.link.findMany({
    where: q
      ? {
          OR: [
            { slug: { contains: q, mode: "insensitive" } },
            { destinationUrl: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, slug: true, destinationUrl: true, clickCount: true },
  });

  return NextResponse.json({ links });
}
