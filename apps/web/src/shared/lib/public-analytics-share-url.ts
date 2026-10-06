import type { ResolvedAnalyticsRange } from "@/shared/lib/analytics-date-range";
import { analyticsRangeQueryString } from "@/shared/lib/analytics-date-range";

/**
 * Public read-only analytics for a single slug. Slug is fixed in the path; range lives in query params.
 */
export function publicAnalyticsSharePath(slug: string, range: ResolvedAnalyticsRange): string {
  const normalized = slug.trim().toLowerCase();
  const query = analyticsRangeQueryString(range);
  return `/share/analytics/${encodeURIComponent(normalized)}?${query}`;
}

export function publicAnalyticsShareUrl(slug: string, range: ResolvedAnalyticsRange, appOrigin: string): string {
  const origin = appOrigin.replace(/\/$/, "");
  return `${origin}${publicAnalyticsSharePath(slug, range)}`;
}
