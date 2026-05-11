import Link from "next/link";
import { prisma } from "@/server/db/prisma";
import { CreateLinkForm } from "@/features/links/components/create-link-form";
import { Button } from "@/shared/ui/button";

export const dynamic = "force-dynamic";

export default async function NewLinkPage({
  searchParams,
}: {
  searchParams: Promise<{ destinationUrl?: string }>;
}) {
  const sp = await searchParams;
  const campaigns = await prisma.campaign.findMany({
    where: { archivedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Create link</h1>
          <p className="text-muted-foreground">Destination is validated for safety before save.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/links">Back</Link>
        </Button>
      </div>
      <CreateLinkForm
        campaigns={campaigns}
        shortLinkHost={process.env.SHORT_LINK_HOST ?? process.env.NEXT_PUBLIC_SHORT_LINK_HOST ?? "go.driffle.com"}
        defaultDestination={sp.destinationUrl}
      />
    </div>
  );
}
