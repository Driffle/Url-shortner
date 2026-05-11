import { prisma } from "@/server/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { CreateCampaignForm } from "@/features/campaigns/components/create-campaign-form";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const campaigns = await prisma.campaign.findMany({
    where: { archivedAt: null },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { links: true } } },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
        <p className="text-muted-foreground">Group links for attribution and reporting.</p>
      </div>

      <CreateCampaignForm />

      <Card>
        <CardHeader>
          <CardTitle>All campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No campaigns yet. Create one on the left.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {campaigns.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.status} · {c._count.links} links
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
