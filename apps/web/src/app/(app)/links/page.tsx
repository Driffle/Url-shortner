import { createHash } from "crypto";
import Link from "next/link";
import { LinkStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { getAppSession } from "@/server/auth-session";
import { getRedis, RedisKeys } from "@/server/redis/client";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { getRequestAppHost } from "@/server/request-app-host";
import { publicShortUrl } from "@/shared/lib/short-link-url";
import { can, Permissions } from "@/shared/lib/rbac";
import { LinkRowActions } from "@/features/links/components/link-row-actions";
import { LinkStatusBadge } from "@/shared/ui/status-badge";
import { analyticsRepository } from "@/server/repositories/analytics-repository";
import { defaultReportingRange } from "@/shared/lib/analytics-date-range";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;
const COUNT_CACHE_TTL = 30;

function buildLinksQuery(sp: { q?: string; status?: string; page?: string }) {
  const q = sp.q?.trim();
  const statusRaw = (sp.status ?? "ACTIVE").trim().toUpperCase();
  const status =
    statusRaw === "ALL"
      ? undefined
      : Object.values(LinkStatus).includes(statusRaw as LinkStatus)
        ? (statusRaw as LinkStatus)
        : LinkStatus.ACTIVE;
  const statusFormValue = sp.status ?? "ACTIVE";

  return {
    q,
    status,
    statusFormValue,
    where: {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { slug: { contains: q, mode: "insensitive" as const } },
              { destinationUrl: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
  };
}

async function countLinksCached(where: object, cacheKey: string): Promise<number> {
  try {
    const redis = getRedis();
    const hit = await redis.get(RedisKeys.linksListTotal(cacheKey));
    if (hit) return Number(hit);
  } catch {
    // ignore
  }
  const total = await prisma.link.count({ where });
  try {
    const redis = getRedis();
    await redis.set(RedisKeys.linksListTotal(cacheKey), String(total), "EX", COUNT_CACHE_TTL);
  } catch {
    // ignore
  }
  return total;
}

export default async function LinksPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  const requestHost = await getRequestAppHost();
  const session = await getAppSession();
  const canEdit = session?.user?.role ? can(session.user.role, Permissions.editLinks) : false;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;
  const { q, status, statusFormValue, where } = buildLinksQuery(sp);

  const cacheKey = createHash("sha256").update(JSON.stringify(where)).digest("hex").slice(0, 16);

  const reporting = defaultReportingRange();

  const [links, total] = await Promise.all([
    prisma.link.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip,
      include: { campaign: { select: { name: true } } },
    }),
    countLinksCached(where, cacheKey),
  ]);

  const clicksInRange = await analyticsRepository.linkClickTotalsInRange(
    reporting.from,
    reporting.to,
    links.map((l) => l.id),
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const querySuffix = (p: number) => {
    const params = new URLSearchParams();
    params.set("page", String(p));
    if (q) params.set("q", q);
    if (statusFormValue === "ALL") params.set("status", "ALL");
    else if (statusFormValue && statusFormValue !== "ACTIVE") params.set("status", statusFormValue);
    return params.toString();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Links</h1>
          <p className="text-muted-foreground">
            Search by slug or destination. Use <span className="font-mono">/r/</span> for instant redirects.
          </p>
        </div>
        {canEdit ? (
          <Button asChild>
            <Link href="/links/new">Create link</Link>
          </Button>
        ) : null}
      </div>

      <form method="get" className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label htmlFor="q" className="text-xs font-medium text-muted-foreground">
            Search
          </label>
          <Input id="q" name="q" defaultValue={q ?? ""} placeholder="slug or URL…" className="min-w-[220px]" />
        </div>
        <div className="space-y-1">
          <label htmlFor="status" className="text-xs font-medium text-muted-foreground">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={statusFormValue}
            className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="ACTIVE">Active</option>
            <option value="ALL">All</option>
            <option value="PAUSED">Paused</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Links</CardTitle>
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} · {total.toLocaleString()} matching
          </p>
        </CardHeader>
        <CardContent>
          {links.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No links match your filters.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">Short URL</th>
                      <th className="py-2 pr-4 font-medium">Destination</th>
                      <th className="py-2 pr-4 font-medium">Campaign</th>
                      <th className="py-2 pr-4 font-medium">Clicks (30d)</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {links.map((l) => (
                      <tr key={l.id} className="border-b border-border/60">
                        <td className="py-3 pr-4 font-mono text-xs">{publicShortUrl(l.slug, requestHost)}</td>
                        <td className="max-w-xs truncate py-3 pr-4">{l.destinationUrl}</td>
                        <td className="py-3 pr-4">{l.campaign?.name ?? "—"}</td>
                        <td className="py-3 pr-4">{(clicksInRange.get(l.id) ?? 0).toLocaleString()}</td>
                        <td className="py-3 pr-4">
                          <LinkStatusBadge status={l.status} />
                        </td>
                        <td className="py-3">
                          <LinkRowActions
                            linkId={l.id}
                            slug={l.slug}
                            destinationUrl={l.destinationUrl}
                            status={l.status}
                            canEdit={canEdit}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex gap-2">
                {page > 1 ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/links?${querySuffix(page - 1)}`}>Previous</Link>
                  </Button>
                ) : null}
                {page < totalPages ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/links?${querySuffix(page + 1)}`}>Next</Link>
                  </Button>
                ) : null}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
