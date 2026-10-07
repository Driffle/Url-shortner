import Link from "next/link";
import { prisma } from "@/server/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { CreateCampaignForm } from "@/features/campaigns/components/create-campaign-form";
import { Button } from "@/shared/ui/button";
import { IconLinkButton } from "@/shared/ui/icon-link-button";
import { BarChart3, Eye } from "lucide-react";
import { analyticsRepository } from "@/server/repositories/analytics-repository";
import { defaultReportingRange } from "@/shared/lib/analytics-date-range";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const reporting = defaultReportingRange();

  const [campaigns, total] = await Promise.all([
    prisma.campaign.findMany({
      where: { archivedAt: null },
      orderBy: { updatedAt: "desc" },
      take: PAGE_SIZE,
      skip,
      include: {
        _count: { select: { links: true } },
      },
    }),
    prisma.campaign.count({ where: { archivedAt: null } }),
  ]);

  const clicksInRange = await analyticsRepository.campaignClickTotalsInRange(
    reporting.from,
    reporting.to,
    campaigns.map((c) => c.id),
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
        <p className="text-muted-foreground">Group links for attribution and reporting.</p>
      </div>

      <CreateCampaignForm />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All campaigns</CardTitle>
          <p className="text-sm text-muted-foreground">
            Page {page}/{totalPages}
          </p>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No campaigns yet.</p>
          ) : (
            <>
              <ul className="divide-y rounded-md border">
                {campaigns.map((c) => {
                  const clicks = clicksInRange.get(c.id) ?? 0;
                  return (
                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                      <div>
                        <Link href={`/campaigns/${c.id}`} className="font-medium text-primary hover:underline">
                          {c.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {c.status} · {c._count.links} links · {clicks.toLocaleString()} clicks (30d)
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <IconLinkButton href={`/campaigns/${c.id}`} icon={Eye} label={`View ${c.name}`} />
                        <IconLinkButton
                          href={`/analytics?campaignId=${c.id}&range=30d`}
                          icon={BarChart3}
                          label={`Analytics for ${c.name}`}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-4 flex gap-2">
                {page > 1 ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/campaigns?page=${page - 1}`}>Previous</Link>
                  </Button>
                ) : null}
                {page < totalPages ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/campaigns?page=${page + 1}`}>Next</Link>
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
