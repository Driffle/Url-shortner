import { getAppSession } from "@/server/auth-session";
import { prisma } from "@/server/db/prisma";
import { can, Permissions } from "@/shared/lib/rbac";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getAppSession();
  if (!session?.user?.role || !can(session.user.role, Permissions.readAnalytics)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await ctx.params;
  const link = await prisma.link.findUnique({ where: { id } });
  if (!link) return new Response("Not found", { status: 404 });

  const host = process.env.SHORT_LINK_HOST ?? "go.driffle.com";
  const target = `https://${host}/${link.slug}`;
  const svg = await QRCode.toString(target, { type: "svg", margin: 1, width: 256 });

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "private, max-age=300",
    },
  });
}
