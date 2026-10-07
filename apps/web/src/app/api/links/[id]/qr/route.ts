import { getAppSession } from "@/server/auth-session";
import { prisma } from "@/server/db/prisma";
import { can, Permissions } from "@/shared/lib/rbac";
import QRCode from "qrcode";
import type { NextRequest } from "next/server";
import { getRequestAppHostFromRequest } from "@/server/request-app-host";
import { publicShortUrl } from "@/shared/lib/short-link-url";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getAppSession();
  if (!session?.user?.role || !can(session.user.role, Permissions.readAnalytics)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await ctx.params;
  const link = await prisma.link.findUnique({ where: { id } });
  if (!link) return new Response("Not found", { status: 404 });

  const requestHost = getRequestAppHostFromRequest(req);
  const target = publicShortUrl(link.slug, requestHost);
  const svg = await QRCode.toString(target, { type: "svg", margin: 1, width: 256 });

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "private, max-age=300",
    },
  });
}
