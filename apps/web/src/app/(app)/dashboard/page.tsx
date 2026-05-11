import { prisma } from "@/server/db/prisma";
import { analyticsRepository } from "@/server/repositories/analytics-repository";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { KpiStrip } from "@/features/dashboard/components/kpi-strip";
import { ClickTrendChart } from "@/features/analytics/components/click-trend-chart";
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

export default async function DashboardPage() {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 14);

  const [linkCount, campaignCount, clickSum, series, top, recent] = await Promise.all([
    prisma.link.count(),
    prisma.campaign.count({ where: { archivedAt: null } }),
    prisma.link.aggregate({ _sum: { clickCount: true } }),
    analyticsRepository.clicksByDaySince(since),
    analyticsRepository.topCampaigns(5),
    analyticsRepository.recentClicks(12),
  ]);

  const totalClicks = clickSum._sum.clickCount ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Internal growth overview for Driffle Links.</p>
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
            <CardDescription>Aggregated from rollups (bots excluded in feed; rollups count all).</CardDescription>
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
                  <span className="truncate font-medium">{c.name}</span>
                  <span className="text-muted-foreground">{c.clicks.toLocaleString()} clicks</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Latest non-bot clicks across all links.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-md border">
            {recent.length === 0 ? (
              <li className="p-4 text-sm text-muted-foreground">No clicks recorded yet.</li>
            ) : (
              recent.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <span className="font-mono text-xs">{e.link.slug}</span>
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
