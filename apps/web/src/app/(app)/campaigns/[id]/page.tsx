import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { resolveAnalyticsRange } from "@/shared/lib/analytics-date-range";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { getRequestAppHost } from "@/server/request-app-host";
import { publicShortUrl } from "@/shared/lib/short-link-url";
import { Button } from "@/shared/ui/button";
import { IconLinkButton } from "@/shared/ui/icon-link-button";
import { LinkStatusBadge } from "@/shared/ui/status-badge";
import { BarChart3 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const requestHost = await getRequestAppHost();
  const { id } = await params;
  const campaign = await prisma.campaign.findFirst({
    where: { id, archivedAt: null },
    include: {
      links: {
        orderBy: { clickCount: "desc" },
        take: 100,
        select: { id: true, slug: true, clickCount: true, visitCount: true, status: true },
      },
    },
  });
  if (!campaign) notFound();

  const range = resolveAnalyticsRange({ defaultPreset: "30d" });
  if (!range.ok) notFound();
  const { from, to } = range.value;

  const rollupRows = await prisma.analyticsRollup.findMany({
    where: {
      scopeType: "CAMPAIGN",
      scopeId: id,
      bucketStart: { gte: from, lte: to },
    },
    select: { totalClicks: true, uniqueClicks: true },
  });

  let periodClicks = 0;
  let periodUnique = 0;
  for (const r of rollupRows) {
    periodClicks += r.totalClicks;
    periodUnique += r.uniqueClicks;
  }

  const lifetimeClicks = campaign.links.reduce((a, l) => a + l.clickCount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{campaign.name}</h1>
          <p className="text-muted-foreground">
            {campaign.status} · {campaign.links.length} links · {lifetimeClicks.toLocaleString()} lifetime clicks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <IconLinkButton
            href={`/analytics?campaignId=${id}&range=30d`}
            icon={BarChart3}
            label="Campaign analytics"
          />
          <Button variant="outline" size="sm" asChild>
            <Link href="/campaigns">Back to campaigns</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Last 30 days (rollup)</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-8 text-sm">
          <div>
            <p className="text-muted-foreground">Clicks</p>
            <p className="text-xl font-semibold">{periodClicks.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Unique (rollup sum)</p>
            <p className="text-xl font-semibold">{periodUnique.toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Links in campaign</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-md border text-sm">
            {campaign.links.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <Link href={`/analytics?slug=${l.slug}&range=30d`} className="font-mono text-primary hover:underline">
                  {publicShortUrl(l.slug, requestHost)}
                </Link>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{l.clickCount.toLocaleString()} clicks</span>
                  <LinkStatusBadge status={l.status} />
                  <IconLinkButton
                    href={`/analytics?slug=${encodeURIComponent(l.slug)}&range=30d`}
                    icon={BarChart3}
                    label={`Analytics for ${l.slug}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
