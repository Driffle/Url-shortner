import Link from "next/link";
import { prisma } from "@/server/db/prisma";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { publicShortUrl } from "@/shared/lib/short-link-url";

export const dynamic = "force-dynamic";

export default async function LinksPage() {
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
          <p className="text-muted-foreground">Copy the full short URL below (includes https and /r/).</p>
        </div>
        <Button asChild>
          <Link href="/links/new">Create link</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent links</CardTitle>
        </CardHeader>
        <CardContent>
          {links.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <p className="text-sm text-muted-foreground">No links yet. Create your first short link.</p>
              <Button asChild>
                <Link href="/links/new">Create link</Link>
              </Button>
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
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 font-medium"> </th>
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
                      <td className="py-3 pr-4">{l.status}</td>
                      <td className="py-3">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/analytics?slug=${encodeURIComponent(l.slug)}`}>Analytics</Link>
                        </Button>
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
