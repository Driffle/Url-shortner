import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { analyticsRepository } from "@/server/repositories/analytics-repository";
import { getRequestAppHost } from "@/server/request-app-host";
import { AnalyticsLinkReport } from "@/features/analytics/components/analytics-link-report";
import { ShareAnalyticsRangeToolbar } from "@/features/analytics/components/share-analytics-range-toolbar";
import { resolveAnalyticsRange, type AnalyticsRangePreset } from "@/shared/lib/analytics-date-range";

export const dynamic = "force-dynamic";

function ShareShell({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:py-10">
      <header className="space-y-1 border-b border-border pb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Driffle Links · shared report</p>
        <h1 className="font-mono text-2xl font-semibold tracking-tight">{slug}</h1>
        <p className="text-sm text-muted-foreground">Read-only analytics for this short link. Slug cannot be changed on this page.</p>
      </header>
      {children}
    </div>
  );
}

export default async function PublicAnalyticsSharePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const requestHost = await getRequestAppHost();
  const { slug: slugParam } = await params;
  const slug = decodeURIComponent(slugParam).trim().toLowerCase();
  if (!slug) notFound();

  const link = await prisma.link.findUnique({
    where: { slug },
    select: { id: true, slug: true, clickCount: true, visitCount: true },
  });
  if (!link) notFound();

  const sp = await searchParams;
  const resolved = resolveAnalyticsRange({
    range: sp.range,
    from: sp.from,
    to: sp.to,
    defaultPreset: "30d",
  });

  if (!resolved.ok) {
    const customPending = sp.range?.trim() === "custom";
    return (
      <ShareShell slug={link.slug}>
        <ShareAnalyticsRangeToolbar slug={link.slug} range="custom" from={sp.from} to={sp.to} />
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-50">
          {customPending
            ? "Choose start and end dates (UTC), then click Apply dates."
            : resolved.error}
        </p>
      </ShareShell>
    );
  }

  const { from, to, label, preset } = resolved.value;

  const scope = { linkId: link.id };
  const [series, rangeMetrics, referrers, devices] = await Promise.all([
    analyticsRepository.clicksByDayInRange(from, to, scope),
    analyticsRepository.rangeMetrics(from, to, scope),
    analyticsRepository.topReferrersInRange(from, to, scope, 8),
    analyticsRepository.deviceMixInRange(from, to, scope, 8),
  ]);

  let metrics = rangeMetrics;
  if (preset === "all") {
    metrics = { totalClicks: link.clickCount, uniqueClicks: link.visitCount };
  }

  const summaryHint =
    preset === "all"
      ? `Lifetime clicks and visits for ${link.slug}. Charts use daily rollups where available.`
      : `Total and unique clicks from daily rollups for ${link.slug} (same window as the links list when set to 30d).`;

  return (
    <ShareShell slug={link.slug}>
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
        requestHost={requestHost}
      />
    </ShareShell>
  );
}
