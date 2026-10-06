import Link from "next/link";
import { prisma } from "@/server/db/prisma";
import { analyticsRepository } from "@/server/repositories/analytics-repository";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { KpiStrip } from "@/features/dashboard/components/kpi-strip";
import { ClickTrendChart } from "@/features/analytics/components/click-trend-chart";
import { resolveAnalyticsRange, analyticsRangeQueryString } from "@/shared/lib/analytics-date-range";
import { Button } from "@/shared/ui/button";

function relTime(d: Date): string {
  const s = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const resolved = resolveAnalyticsRange({ range: sp.range, defaultPreset: "14d" });
  if (!resolved.ok) {
    throw new Error(resolved.error);
  }
  const { from, to, label } = resolved.value;
  const range = resolved.value;

  const [linkCount, campaignCount, clickSum, series, top, recent, rangeMetrics] = await Promise.all([
    prisma.link.count(),
    prisma.campaign.count({ where: { archivedAt: null } }),
    prisma.link.aggregate({ _sum: { clickCount: true } }),
    analyticsRepository.clicksByDayInRange(from, to),
    analyticsRepository.topCampaigns(5),
    analyticsRepository.recentClicks(12),
    analyticsRepository.rangeMetrics(from, to),
  ]);

  const totalClicks = clickSum._sum.clickCount ?? 0;
  const analyticsHref = `/analytics?${analyticsRangeQueryString(range)}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Internal overview · chart shows {label} (UTC).</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["7d", "14d", "30d"] as const).map((r) => (
            <Button key={r} variant={sp.range === r || (!sp.range && r === "14d") ? "default" : "outline"} size="sm" asChild>
              <Link href={`/dashboard?range=${r}`}>{r === "7d" ? "7 days" : r === "14d" ? "14 days" : "30 days"}</Link>
            </Button>
          ))}
          <Button variant="secondary" size="sm" asChild>
            <Link href={analyticsHref}>View in Analytics</Link>
          </Button>
        </div>
      </div>

      <KpiStrip
        items={[
          { label: "Lifetime clicks", value: totalClicks.toLocaleString() },
          { label: `Clicks (${label})`, value: rangeMetrics.totalClicks.toLocaleString() },
          { label: "Active links", value: linkCount.toLocaleString() },
          { label: "Campaigns", value: campaignCount.toLocaleString() },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Daily clicks</CardTitle>
            <CardDescription>From rollups · {label}</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ClickTrendChart data={series} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top campaigns</CardTitle>
            <CardDescription>By summed link clicks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {top.length === 0 ? (
              <p className="text-sm text-muted-foreground">No campaigns yet.</p>
            ) : (
              top.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <Link href={`/campaigns/${c.id}`} className="truncate font-medium text-primary hover:underline">
                    {c.name}
                  </Link>
                  <span className="text-muted-foreground">{c.clicks.toLocaleString()}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Latest non-bot clicks (cached briefly).</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-md border">
            {recent.length === 0 ? (
              <li className="p-4 text-sm text-muted-foreground">No clicks recorded yet.</li>
            ) : (
              recent.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <Link href={`/analytics?slug=${e.link.slug}&range=7d`} className="font-mono text-xs text-primary hover:underline">
                    {e.link.slug}
                  </Link>
                  <span className="text-muted-foreground">
                    {relTime(e.createdAt)}
                    {e.countryCode ? ` · ${e.countryCode}` : ""}
                  </span>
                </li>
              ))
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
