import Link from "next/link";
import { LinkStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { analyticsRepository } from "@/server/repositories/analytics-repository";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { KpiStrip } from "@/features/dashboard/components/kpi-strip";
import { ClickTrendChart } from "@/features/analytics/components/click-trend-chart";
import { resolveAnalyticsRange, analyticsRangeQueryString } from "@/shared/lib/analytics-date-range";
import { Button } from "@/shared/ui/button";
import { IconLinkButton } from "@/shared/ui/icon-link-button";
import { BarChart3 } from "lucide-react";

function relTime(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  const s = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
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
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {resolved.error}
        </p>
        <Link href="/dashboard" className="text-sm text-primary underline">
          Reset range
        </Link>
      </div>
    );
  }
  const { from, to, label } = resolved.value;
  const range = resolved.value;

  const [linkCount, campaignCount, clickSum, series, top, recent] = await Promise.all([
    prisma.link.count({ where: { status: LinkStatus.ACTIVE } }),
    prisma.campaign.count({ where: { archivedAt: null } }),
    prisma.link.aggregate({ _sum: { clickCount: true } }),
    analyticsRepository.clicksByDayInRange(from, to),
    analyticsRepository.topCampaigns(5),
    analyticsRepository.recentClicks(12),
  ]);

  const totalClicks = clickSum._sum.clickCount ?? 0;
  const analyticsHref = `/analytics?${analyticsRangeQueryString(range)}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Internal growth overview for Driffle Links.</p>
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
          { label: "Total clicks", value: totalClicks.toLocaleString() },
          { label: "Active links", value: linkCount.toLocaleString() },
          { label: "Campaigns", value: campaignCount.toLocaleString() },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Daily clicks</CardTitle>
            <CardDescription>Aggregated from rollups · {label}</CardDescription>
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
                <div key={c.id} className="flex items-center justify-between gap-2 text-sm">
                  <Link href={`/campaigns/${c.id}`} className="truncate font-medium text-primary hover:underline">
                    {c.name}
                  </Link>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="text-muted-foreground">{c.clicks.toLocaleString()}</span>
                    <IconLinkButton
                      href={`/analytics?${analyticsRangeQueryString(range, { campaignId: c.id })}`}
                      icon={BarChart3}
                      label={`Analytics for ${c.name}`}
                    />
                  </div>
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
