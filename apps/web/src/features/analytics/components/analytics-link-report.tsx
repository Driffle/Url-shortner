import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { ClickTrendChart } from "@/features/analytics/components/click-trend-chart";
import { InfoTip } from "@/shared/ui/info-tip";
import { publicShortUrl } from "@/shared/lib/short-link-url";
import type { DeviceRow, RangeMetrics, ReferrerRow } from "@/server/repositories/analytics-repository";

type LinkInfo = {
  slug: string;
  clickCount: number;
  visitCount: number;
};

type Props = {
  label: string;
  summaryHint: string;
  metrics: RangeMetrics;
  series: { day: string; clicks: number }[];
  referrers: ReferrerRow[];
  devices: DeviceRow[];
  link?: LinkInfo | null;
  /** Host the user is viewing (for short URL display). */
  requestHost?: string;
  shareSlot?: React.ReactNode;
};

export function AnalyticsLinkReport({
  label,
  summaryHint,
  metrics,
  series,
  referrers,
  devices,
  link,
  requestHost,
  shareSlot,
}: Props) {
  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">Reporting window: {label} (UTC)</p>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <CardTitle>Range summary</CardTitle>
          <InfoTip text={summaryHint} label="Range summary help" />
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

      {link ? (
        <Card>
          <CardHeader>
            <CardTitle>Short URL</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="break-all font-mono text-base font-medium text-primary">
              {publicShortUrl(link.slug, requestHost)}
            </p>
            <p className="text-muted-foreground">
              Lifetime clicks: {link.clickCount.toLocaleString()} · Visits: {link.visitCount.toLocaleString()}
            </p>
            {shareSlot}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Click trend</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ClickTrendChart data={series} />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top referrers</CardTitle>
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
