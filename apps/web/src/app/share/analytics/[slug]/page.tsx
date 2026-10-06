import { notFound } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { analyticsRepository } from "@/server/repositories/analytics-repository";
import { AnalyticsLinkReport } from "@/features/analytics/components/analytics-link-report";
import { ShareAnalyticsRangeToolbar } from "@/features/analytics/components/share-analytics-range-toolbar";
import { resolveAnalyticsRange, type AnalyticsRangePreset } from "@/shared/lib/analytics-date-range";

export const dynamic = "force-dynamic";

export default async function PublicAnalyticsSharePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const { slug: slugParam } = await params;
  const slug = decodeURIComponent(slugParam).trim().toLowerCase();
  if (!slug) notFound();

  const sp = await searchParams;
  const resolved = resolveAnalyticsRange({
    range: sp.range,
    from: sp.from,
    to: sp.to,
    defaultPreset: "30d",
  });

  if (!resolved.ok) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <h1 className="text-xl font-semibold">Link analytics</h1>
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {resolved.error}
        </p>
      </div>
    );
  }

  const { from, to, label, preset } = resolved.value;

  const link = await prisma.link.findUnique({
    where: { slug },
    select: { id: true, slug: true, clickCount: true, visitCount: true },
  });
  if (!link) notFound();

  const scope = { linkId: link.id };
  const [series, metrics, referrers, devices] = await Promise.all([
    analyticsRepository.clicksByDayInRange(from, to, scope),
    analyticsRepository.rangeMetrics(from, to, scope),
    analyticsRepository.topReferrersInRange(from, to, scope, 8),
    analyticsRepository.deviceMixInRange(from, to, scope, 8),
  ]);

  const summaryHint = `Total and unique clicks from daily rollups for ${link.slug}.`;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:py-10">
      <header className="space-y-1 border-b border-border pb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Driffle Links · shared report</p>
        <h1 className="font-mono text-2xl font-semibold tracking-tight">{link.slug}</h1>
        <p className="text-sm text-muted-foreground">Read-only analytics for this short link. Slug cannot be changed on this page.</p>
      </header>

      <ShareAnalyticsRangeToolbar
        slug={link.slug}
        range={preset as AnalyticsRangePreset}
        from={sp.from}
        to={sp.to}
      />

      <AnalyticsLinkReport
        label={label}
        summaryHint={summaryHint}
        metrics={metrics}
        series={series}
        referrers={referrers}
        devices={devices}
        link={link}
      />
    </div>
  );
}
