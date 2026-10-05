import Link from "next/link";
import { prisma } from "@/server/db/prisma";
import { getAppSession } from "@/server/auth-session";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { publicShortUrl } from "@/shared/lib/short-link-url";
import { can, Permissions } from "@/shared/lib/rbac";
import { LinkRowActions } from "@/features/links/components/link-row-actions";

export const dynamic = "force-dynamic";

export default async function LinksPage() {
  const session = await getAppSession();
  const canEdit = session?.user?.role ? can(session.user.role, Permissions.editLinks) : false;

  const links = await prisma.link.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { campaign: { select: { name: true } } },
  });

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
        <CardHeader>
          <CardTitle>Recent links</CardTitle>
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
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Short URL</th>
                    <th className="pb-2 pr-4 font-medium">Destination</th>
                    <th className="pb-2 pr-4 font-medium">Campaign</th>
                    <th className="pb-2 pr-4 font-medium">Clicks</th>
                    <th className="pb-2 pr-4 font-medium">Visits</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {links.map((l) => (
                    <tr key={l.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <a
                          href={publicShortUrl(l.slug)}
                          className="break-all font-mono text-xs text-primary underline-offset-2 hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {publicShortUrl(l.slug)}
                        </a>
                      </td>
                      <td className="max-w-xs truncate py-3 pr-4 text-muted-foreground">{l.destinationUrl}</td>
                      <td className="py-3 pr-4">{l.campaign?.name ?? "—"}</td>
                      <td className="py-3 pr-4">{l.clickCount.toLocaleString()}</td>
                      <td className="py-3 pr-4">{l.visitCount.toLocaleString()}</td>
                      <td className="py-3 pr-4">{l.status}</td>
                      <td className="py-3 align-top">
                        <div className="flex flex-col items-end gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/analytics?slug=${encodeURIComponent(l.slug)}`}>Analytics</Link>
                          </Button>
                          <LinkRowActions
                            linkId={l.id}
                            slug={l.slug}
                            status={l.status}
                            destinationUrl={l.destinationUrl}
                            canEdit={canEdit}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
