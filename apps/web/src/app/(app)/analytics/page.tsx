import { prisma } from "@/server/db/prisma";
import { analyticsRepository } from "@/server/repositories/analytics-repository";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { ClickTrendChart } from "@/features/analytics/components/click-trend-chart";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 30);
  const [series, refAgg, deviceAgg] = await Promise.all([
    analyticsRepository.clicksByDaySince(since),
    prisma.clickEvent.groupBy({
      by: ["referrerId"],
      _count: { _all: true },
      where: { createdAt: { gte: since }, isBot: false, referrerId: { not: null } },
    }),
    prisma.clickEvent.groupBy({
      by: ["deviceId"],
      _count: { _all: true },
      where: { createdAt: { gte: since }, isBot: false },
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Rollup-backed trends and dimensional breakdowns.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Click trend</CardTitle>
          <CardDescription>Last 30 days, daily buckets from link-level rollups.</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ClickTrendChart data={series} />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top referrers</CardTitle>
            <CardDescription>Non-bot clicks in window.</CardDescription>
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
            <CardDescription>Top device fingerprints in window.</CardDescription>
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
