import Link from "next/link";
import { prisma } from "@/server/db/prisma";
import { analyticsRepository } from "@/server/repositories/analytics-repository";
import { AnalyticsToolbar } from "@/features/analytics/components/analytics-toolbar";
import { AnalyticsLinkReport } from "@/features/analytics/components/analytics-link-report";
import { ShareAnalyticsViewButton } from "@/features/analytics/components/share-analytics-view-button";
import { getEnv } from "@/shared/validations/env";
import { InfoTip } from "@/shared/ui/info-tip";
import { publicAnalyticsShareUrl } from "@/shared/lib/public-analytics-share-url";
import { resolveAnalyticsRange, type AnalyticsRangePreset } from "@/shared/lib/analytics-date-range";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; campaignId?: string; range?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const slugRaw = sp.slug?.trim();
  const slug = slugRaw ? slugRaw.toLowerCase() : undefined;
  const campaignId = sp.campaignId?.trim();

  const resolved = resolveAnalyticsRange({
    range: sp.range,
    from: sp.from,
    to: sp.to,
    defaultPreset: "30d",
  });

  if (!resolved.ok) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {resolved.error}
        </p>
        <Link href="/analytics" className="text-sm text-primary underline">
          Reset filters
        </Link>
      </div>
    );
  }

  const { from, to, label, preset } = resolved.value;
  const cacheTtl = getEnv().ANALYTICS_CACHE_TTL_SEC;
  const appOrigin = getEnv().PUBLIC_APP_URL ?? getEnv().NEXTAUTH_URL;

  const scopeLink = slug
    ? await prisma.link.findUnique({
        where: { slug },
        select: { id: true, slug: true, destinationUrl: true, clickCount: true, visitCount: true },
      })
    : null;

  const scopeCampaign =
    campaignId && !slug
      ? await prisma.campaign.findFirst({
          where: { id: campaignId, archivedAt: null },
          select: { id: true, name: true },
        })
      : null;

  const scope = scopeLink
    ? { linkId: scopeLink.id }
    : scopeCampaign
      ? { campaignId: scopeCampaign.id }
      : undefined;

  const [series, metrics, referrers, devices] = await Promise.all([
    analyticsRepository.clicksByDayInRange(from, to, scope),
    analyticsRepository.rangeMetrics(from, to, scope),
    analyticsRepository.topReferrersInRange(from, to, scope, 8),
    analyticsRepository.deviceMixInRange(from, to, scope, 8),
  ]);

  const pageHint = `${label} (UTC) · rollup-backed reads · cache TTL ${cacheTtl}s. Clicks may lag ~1 min until the worker ingests; rollups refresh on cron. Unique visitors sum daily buckets${
    scopeLink ? "" : scopeCampaign ? " for this campaign" : " (not deduplicated across links)"
  }.`;

  const summaryHint = scopeLink
    ? `Total and unique clicks from daily rollups for ${scopeLink.slug}.`
    : scopeCampaign
      ? `Total and unique clicks from campaign rollups for ${scopeCampaign.name}.`
      : "Total and unique clicks from daily rollups · all links.";

  const shareUrl =
    scopeLink && appOrigin
      ? publicAnalyticsShareUrl(scopeLink.slug, resolved.value, appOrigin)
      : null;

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-start gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <InfoTip text={pageHint} label="Analytics data freshness" className="mt-1" />
        </div>
        <AnalyticsToolbar
          range={preset as AnalyticsRangePreset}
          from={sp.from}
          to={sp.to}
          slug={slug}
          campaignId={campaignId}
          initialSlugLabel={scopeLink?.slug}
        />
      </div>

      {slug && !scopeLink ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          No link found for slug <span className="font-mono">{slugRaw}</span>.
        </p>
      ) : null}

      {campaignId && !slug && !scopeCampaign ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Campaign not found.
        </p>
      ) : null}

      {scopeCampaign ? (
        <p className="text-sm text-muted-foreground">
          Showing campaign: <span className="font-medium text-foreground">{scopeCampaign.name}</span>
        </p>
      ) : null}

      <AnalyticsLinkReport
        label={label}
        summaryHint={summaryHint}
        metrics={metrics}
        series={series}
        referrers={referrers}
        devices={devices}
        link={scopeLink}
        shareSlot={shareUrl ? <ShareAnalyticsViewButton shareUrl={shareUrl} /> : undefined}
      />
    </div>
  );
}
