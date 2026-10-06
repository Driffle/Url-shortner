import Link from "next/link";
import { prisma } from "@/server/db/prisma";
import { getAppSession } from "@/server/auth-session";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { publicShortUrl } from "@/shared/lib/short-link-url";
import { can, Permissions } from "@/shared/lib/rbac";
import { LinkRowActions } from "@/features/links/components/link-row-actions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function LinksPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getAppSession();
  const canEdit = session?.user?.role ? can(session.user.role, Permissions.editLinks) : false;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [links, total] = await Promise.all([
    prisma.link.findMany({
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip,
      include: { campaign: { select: { name: true } } },
    }),
    prisma.link.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Links</h1>
          <p className="text-muted-foreground">
            Copy the tracked short URL (includes https and /go/). Instant redirect without a visit count: replace{" "}
            <span className="font-mono">/go/</span> with <span className="font-mono">/r/</span> in the same host.
            {canEdit ? " Use Pause or Edit URL to update redirects; changes apply within seconds." : null}
          </p>
        </div>
        {canEdit ? (
          <Button asChild>
            <Link href="/links/new">Create link</Link>
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Links</CardTitle>
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} · {total.toLocaleString()} total
          </p>
        </CardHeader>
        <CardContent>
          {links.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <p className="text-sm text-muted-foreground">No links yet. Create your first short link.</p>
              {canEdit ? (
                <Button asChild>
                  <Link href="/links/new">Create link</Link>
                </Button>
              ) : null}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">Short URL</th>
                      <th className="py-2 pr-4 font-medium">Destination</th>
                      <th className="py-2 pr-4 font-medium">Campaign</th>
                      <th className="py-2 pr-4 font-medium">Clicks</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      {canEdit ? <th className="py-2 font-medium">Actions</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {links.map((l) => (
                      <tr key={l.id} className="border-b border-border/60">
                        <td className="py-3 pr-4 font-mono text-xs">{publicShortUrl(l.slug)}</td>
                        <td className="max-w-xs truncate py-3 pr-4">{l.destinationUrl}</td>
                        <td className="py-3 pr-4">{l.campaign?.name ?? "—"}</td>
                        <td className="py-3 pr-4">{l.clickCount.toLocaleString()}</td>
                        <td className="py-3 pr-4">{l.status}</td>
                        {canEdit ? (
                          <td className="py-3">
                            <LinkRowActions
                              linkId={l.id}
                              slug={l.slug}
                              destinationUrl={l.destinationUrl}
                              status={l.status}
                              canEdit={canEdit}
                            />
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex gap-2">
                {page > 1 ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/links?page=${page - 1}`}>Previous</Link>
                  </Button>
                ) : null}
                {page < totalPages ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/links?page=${page + 1}`}>Next</Link>
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
