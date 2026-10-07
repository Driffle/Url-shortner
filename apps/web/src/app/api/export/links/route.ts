import { getAppSession } from "@/server/auth-session";
import { prisma } from "@/server/db/prisma";
import { can, Permissions } from "@/shared/lib/rbac";
import { getRequestAppHostFromRequest } from "@/server/request-app-host";
import { publicInstantShortUrl, publicShortUrl } from "@/shared/lib/short-link-url";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function csvEscape(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const BATCH = 500;

export async function GET(req: NextRequest) {
  const requestHost = getRequestAppHostFromRequest(req);
  const session = await getAppSession();
  if (!session?.user?.role || !can(session.user.role, Permissions.readAnalytics)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
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

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`${header}\n`));
      let cursor: string | undefined;
      for (;;) {
        const batch = await prisma.link.findMany({
          take: BATCH,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
          orderBy: { id: "asc" },
          include: { campaign: { select: { name: true } } },
        });
        if (batch.length === 0) break;
        for (const l of batch) {
          const row = [
            l.slug,
            publicShortUrl(l.slug, requestHost),
            publicInstantShortUrl(l.slug, requestHost),
            l.destinationUrl,
            l.campaign?.name ?? "",
            String(l.clickCount),
            l.status,
            l.createdAt.toISOString(),
          ]
            .map(csvEscape)
            .join(",");
          controller.enqueue(encoder.encode(`${row}\n`));
        }
        cursor = batch[batch.length - 1]?.id;
        if (batch.length < BATCH) break;
      }
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="driffle-links.csv"',
      "Transfer-Encoding": "chunked",
    },
  });
}
