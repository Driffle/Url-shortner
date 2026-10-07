import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { analyticsRepository } from "@/server/repositories/analytics-repository";
import { defaultReportingRange } from "@/shared/lib/analytics-date-range";
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
        take: 100,
        select: { id: true, slug: true, clickCount: true, visitCount: true, status: true },
      },
    },
  });
  if (!campaign) notFound();

  const reporting = defaultReportingRange();
  const { from, to, label } = reporting;

  const [periodMetrics, clicksByLink] = await Promise.all([
    analyticsRepository.rangeMetrics(from, to, { campaignId: id }),
    analyticsRepository.linkClickTotalsInRange(
      from,
      to,
      campaign.links.map((l) => l.id),
    ),
  ]);

  const linksSorted = [...campaign.links].sort(
    (a, b) => (clicksByLink.get(b.id) ?? 0) - (clicksByLink.get(a.id) ?? 0),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{campaign.name}</h1>
          <p className="text-muted-foreground">
            {campaign.status} · {campaign.links.length} links ·{" "}
            {periodMetrics.totalClicks.toLocaleString()} clicks ({label.toLowerCase()})
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
          <CardTitle>{label}</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-8 text-sm">
          <div>
            <p className="text-muted-foreground">Clicks</p>
            <p className="text-xl font-semibold">{periodMetrics.totalClicks.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Unique (rollup sum)</p>
            <p className="text-xl font-semibold">{periodMetrics.uniqueClicks.toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Links in campaign</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-md border text-sm">
            {linksSorted.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <Link href={`/analytics?slug=${l.slug}&range=30d`} className="font-mono text-primary hover:underline">
                  {publicShortUrl(l.slug, requestHost)}
                </Link>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {(clicksByLink.get(l.id) ?? 0).toLocaleString()} clicks (30d)
                  </span>
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
