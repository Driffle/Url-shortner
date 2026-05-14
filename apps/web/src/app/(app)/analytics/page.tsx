import Link from "next/link";
import { prisma } from "@/server/db/prisma";
import { analyticsRepository } from "@/server/repositories/analytics-repository";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { ClickTrendChart } from "@/features/analytics/components/click-trend-chart";
import { Button } from "@/shared/ui/button";
import { publicShortUrl } from "@/shared/lib/short-link-url";
import { getEnv } from "@/shared/validations/env";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  const sp = await searchParams;
  const slugRaw = sp.slug?.trim();
  const slug = slugRaw ? slugRaw.toLowerCase() : undefined;

  const filteredLink = slug
    ? await prisma.link.findUnique({
        where: { slug },
        select: { id: true, slug: true, destinationUrl: true, clickCount: true, visitCount: true },
      })
    : null;

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 30);
  const scope = filteredLink ? { linkId: filteredLink.id } : undefined;

  const clickWindowWhere = {
    createdAt: { gte: since },
    isBot: false,
    ...(filteredLink ? { linkId: filteredLink.id } : {}),
  } as const;

  const [series, refAgg, deviceAgg, windowClicks, linkChoices] = await Promise.all([
    analyticsRepository.clicksByDaySince(since, scope),
    prisma.clickEvent.groupBy({
      by: ["referrerId"],
      _count: { _all: true },
      where: { ...clickWindowWhere, referrerId: { not: null } },
    }),
    prisma.clickEvent.groupBy({
      by: ["deviceId"],
      _count: { _all: true },
      where: clickWindowWhere,
    }),
    prisma.clickEvent.count({ where: clickWindowWhere }),
    prisma.link.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      select: { id: true, slug: true, destinationUrl: true },
    }),
  ]);

  const refSorted = [...refAgg].sort((a, b) => b._count._all - a._count._all).slice(0, 8);
  const devSorted = [...deviceAgg].sort((a, b) => b._count._all - a._count._all).slice(0, 8);

  const referrerIds = refSorted.map((r) => r.referrerId).filter(Boolean) as string[];
  const deviceIds = devSorted.map((d) => d.deviceId).filter(Boolean) as string[];

  const [referrers, devices] = await Promise.all([
    referrerIds.length
      ? prisma.referrer.findMany({ where: { id: { in: referrerIds } } })
      : [],
    deviceIds.length ? prisma.device.findMany({ where: { id: { in: deviceIds } } }) : [],
  ]);

  const refMap = Object.fromEntries(referrers.map((r) => [r.id, r.domain]));
  const devMap = Object.fromEntries(devices.map((d) => [d.id, `${d.deviceType} · ${d.browserName ?? "?"}`]));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Rollup-backed trends and dimensional breakdowns.</p>
        </div>

        <form method="get" className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <label htmlFor="slug" className="text-xs font-medium text-muted-foreground">
              Filter by short link
            </label>
            <select
              id="slug"
              name="slug"
              defaultValue={slug ?? ""}
              className="flex h-9 min-w-[220px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">All links</option>
              {linkChoices.map((l) => (
                <option key={l.id} value={l.slug}>
                  {l.slug} — {l.destinationUrl.slice(0, 48)}
                  {l.destinationUrl.length > 48 ? "…" : ""}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" variant="secondary">
            Apply
          </Button>
          {slug ? (
            <Button type="button" variant="outline" asChild>
              <Link href="/analytics">Clear</Link>
            </Button>
          ) : null}
        </form>
      </div>

      {slug && !filteredLink ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          No link found for slug <span className="font-mono">{slugRaw}</span>. Choose another from the list.
        </p>
      ) : null}

      {filteredLink ? (
        <Card>
          <CardHeader>
            <CardTitle>Selected short URL</CardTitle>
            <CardDescription>
              Use this exact URL in browsers and campaigns. Visits are counted after {getEnv().VISIT_HOLD_SECONDS}s on the
              interstitial page, then the user is sent to the destination.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="break-all font-mono text-base font-medium text-primary">{publicShortUrl(filteredLink.slug)}</p>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Destination:</span>{" "}
              <span className="break-all">{filteredLink.destinationUrl}</span>
            </p>
            <p className="text-muted-foreground">
              Lifetime clicks (counter):{" "}
              <span className="font-medium text-foreground">{filteredLink.clickCount.toLocaleString()}</span>
              {" · "}
              Visits (completed {getEnv().VISIT_HOLD_SECONDS}s dwell on /go/…):{" "}
              <span className="font-medium text-foreground">{filteredLink.visitCount.toLocaleString()}</span>
              {" · "}
              Non-bot clicks in last 30 days:{" "}
              <span className="font-medium text-foreground">{windowClicks.toLocaleString()}</span>
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Click trend</CardTitle>
          <CardDescription>
            Last 30 days, daily buckets from link-level rollups
            {filteredLink ? ` — ${filteredLink.slug} only` : " — all links combined"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ClickTrendChart data={series} />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top referrers</CardTitle>
            <CardDescription>Non-bot clicks in window{filteredLink ? ` · ${filteredLink.slug}` : ""}.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {refSorted.map((r) => (
                <li key={r.referrerId ?? "x"} className="flex justify-between gap-2">
                  <span className="truncate">{r.referrerId ? refMap[r.referrerId] ?? r.referrerId : "—"}</span>
                  <span className="text-muted-foreground">{r._count._all}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Device mix</CardTitle>
            <CardDescription>Top device fingerprints in window{filteredLink ? ` · ${filteredLink.slug}` : ""}.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {devSorted.map((d) => (
                <li key={d.deviceId ?? "x"} className="flex justify-between gap-2">
                  <span className="truncate">{d.deviceId ? devMap[d.deviceId] ?? d.deviceId : "—"}</span>
                  <span className="text-muted-foreground">{d._count._all}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
