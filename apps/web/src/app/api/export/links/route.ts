import { getAppSession } from "@/server/auth-session";
import { prisma } from "@/server/db/prisma";
import { can, Permissions } from "@/shared/lib/rbac";
import { publicInstantShortUrl, publicShortUrl } from "@/shared/lib/short-link-url";

export const dynamic = "force-dynamic";

function csvEscape(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const session = await getAppSession();
  if (!session?.user?.role || !can(session.user.role, Permissions.readAnalytics)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const links = await prisma.link.findMany({
    orderBy: { createdAt: "desc" },
    take: 5000,
    include: { campaign: { select: { name: true } } },
  });

  const header = [
    "slug",
    "short_url_go",
    "short_url_instant",
    "destination",
    "campaign",
    "clicks",
    "status",
    "created_at",
  ].join(",");
  const rows = links.map((l) =>
    [
      l.slug,
      publicShortUrl(l.slug),
      publicInstantShortUrl(l.slug),
      l.destinationUrl,
      l.campaign?.name ?? "",
      String(l.clickCount),
      l.status,
      l.createdAt.toISOString(),
    ]
      .map(csvEscape)
      .join(","),
  );

  const body = [header, ...rows].join("\n");
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="driffle-links.csv"',
    },
  });
}
