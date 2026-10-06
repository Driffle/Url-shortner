import Link from "next/link";
import { prisma } from "@/server/db/prisma";
import { analyticsRepository } from "@/server/repositories/analytics-repository";
import { AnalyticsToolbar } from "@/features/analytics/components/analytics-toolbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { ClickTrendChart } from "@/features/analytics/components/click-trend-chart";
import { publicShortUrl } from "@/shared/lib/short-link-url";
import { getEnv } from "@/shared/validations/env";
import {
  analyticsRangeQueryString,
  resolveAnalyticsRange,
  type AnalyticsRangePreset,
} from "@/shared/lib/analytics-date-range";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; range?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const slugRaw = sp.slug?.trim();
  const slug = slugRaw ? slugRaw.toLowerCase() : undefined;

  const resolved = resolveAnalyticsRange({
    range: sp.range,
    from: sp.from,
    to: sp.to,
    defaultPreset: "30d",
  });

  if (!resolved.ok) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {resolved.error}
        </p>
        <Link href="/analytics" className="text-sm text-primary underline">
          Reset filters
        </Link>
      </div>
    );
  }

  const { from, to, label, preset } = resolved.value;
  const scopeLink = slug
    ? await prisma.link.findUnique({
        where: { slug },
        select: { id: true, slug: true, destinationUrl: true, clickCount: true, visitCount: true },
      })
    : null;

  const scope = scopeLink ? { linkId: scopeLink.id } : undefined;

  const [series, metrics, referrers, devices] = await Promise.all([
    analyticsRepository.clicksByDayInRange(from, to, scope),
    analyticsRepository.rangeMetrics(from, to, scope),
    analyticsRepository.topReferrersInRange(from, to, scope, 8),
    analyticsRepository.deviceMixInRange(from, to, scope, 8),
  ]);

  const cacheTtl = getEnv().ANALYTICS_CACHE_TTL_SEC;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            {label} (UTC) · rollup-backed reads · cache TTL {cacheTtl}s
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Clicks may lag ~1 min until the worker ingests; rollups refresh on cron. Unique visitors sum daily
            buckets{scope ? "" : " (not deduplicated across links)"}.
          </p>
        </div>
        <AnalyticsToolbar
          range={preset as AnalyticsRangePreset}
          from={sp.from}
          to={sp.to}
          slug={slug}
          initialSlugLabel={scopeLink?.slug}
        />
      </div>

      {slug && !scopeLink ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          No link found for slug <span className="font-mono">{slugRaw}</span>.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Range summary</CardTitle>
          <CardDescription>
            Total and unique clicks from daily rollups
            {scopeLink ? ` · ${scopeLink.slug}` : " · all links"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6 text-sm">
          <div>
            <p className="text-muted-foreground">Total clicks</p>
            <p className="text-2xl font-semibold">{metrics.totalClicks.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Unique clicks (rollup)</p>
            <p className="text-2xl font-semibold">{metrics.uniqueClicks.toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>

      {scopeLink ? (
        <Card>
          <CardHeader>
            <CardTitle>Selected short URL</CardTitle>
            <CardDescription>
              Lifetime counters ·{" "}
              <Link
                href={`/analytics?${analyticsRangeQueryString(resolved.value, scopeLink.slug)}`}
                className="text-primary underline"
              >
                Share this view
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="break-all font-mono text-base font-medium text-primary">{publicShortUrl(scopeLink.slug)}</p>
            <p className="text-muted-foreground">
              Lifetime clicks: {scopeLink.clickCount.toLocaleString()} · Visits: {scopeLink.visitCount.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Click trend</CardTitle>
          <CardDescription>Daily buckets — {label}</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ClickTrendChart data={series} />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top referrers</CardTitle>
            <CardDescription>Rollup merge · {label}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {referrers.length === 0 ? (
                <li className="text-muted-foreground">No data in range.</li>
              ) : (
                referrers.map((r) => (
                  <li key={r.domain} className="flex justify-between gap-2">
                    <span className="truncate">{r.domain}</span>
                    <span className="text-muted-foreground">{r.count}</span>
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Device mix</CardTitle>
            <CardDescription>Rollup merge · {label}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {devices.length === 0 ? (
                <li className="text-muted-foreground">No data in range.</li>
              ) : (
                devices.map((d) => (
                  <li key={d.deviceType} className="flex justify-between gap-2">
                    <span className="truncate">{d.deviceType}</span>
                    <span className="text-muted-foreground">{d.count}</span>
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
