import { z } from "zod";

export const analyticsRangePresetSchema = z.enum([
  "today",
  "yesterday",
  "7d",
  "14d",
  "30d",
  "90d",
  "custom",
]);

export type AnalyticsRangePreset = z.infer<typeof analyticsRangePresetSchema>;

export type ResolvedAnalyticsRange = {
  preset: AnalyticsRangePreset;
  from: Date;
  to: Date;
  label: string;
};

function utcDayStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function utcDayEnd(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

function parseIsoDate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function resolveAnalyticsRange(input: {
  range?: string | null;
  from?: string | null;
  to?: string | null;
  defaultPreset?: AnalyticsRangePreset;
}): { ok: true; value: ResolvedAnalyticsRange } | { ok: false; error: string } {
  const defaultPreset = input.defaultPreset ?? "30d";
  const rawPreset = input.range?.trim() || defaultPreset;
  const presetParsed = analyticsRangePresetSchema.safeParse(rawPreset);
  if (!presetParsed.success) {
    return { ok: false, error: `Unknown range preset "${rawPreset}".` };
  }
  const preset = presetParsed.data;
  const now = new Date();

  if (preset === "custom") {
    const fromD = input.from ? parseIsoDate(input.from) : null;
    const toD = input.to ? parseIsoDate(input.to) : null;
    if (!fromD || !toD) {
      return { ok: false, error: "Custom range requires from and to (YYYY-MM-DD, UTC)." };
    }
    if (fromD > toD) {
      return { ok: false, error: "Start date must be on or before end date." };
    }
    return {
      ok: true,
      value: {
        preset,
        from: utcDayStart(fromD),
        to: utcDayEnd(toD),
        label: `${input.from} – ${input.to}`,
      },
    };
  }

  const todayStart = utcDayStart(now);
  let from = todayStart;
  let to = utcDayEnd(now);
  let label = "Today";

  switch (preset) {
    case "today":
      break;
    case "yesterday": {
      const y = new Date(todayStart);
      y.setUTCDate(y.getUTCDate() - 1);
      from = y;
      to = utcDayEnd(y);
      label = "Yesterday";
      break;
    }
    case "7d":
      from = utcDayStart(new Date(todayStart.getTime() - 6 * 86400000));
      label = "Last 7 days";
      break;
    case "14d":
      from = utcDayStart(new Date(todayStart.getTime() - 13 * 86400000));
      label = "Last 14 days";
      break;
    case "30d":
      from = utcDayStart(new Date(todayStart.getTime() - 29 * 86400000));
      label = "Last 30 days";
      break;
    case "90d":
      from = utcDayStart(new Date(todayStart.getTime() - 89 * 86400000));
      label = "Last 90 days";
      break;
    default:
      break;
  }

  return { ok: true, value: { preset, from, to, label } };
}

export function analyticsRangeQueryString(
  range: ResolvedAnalyticsRange,
  opts?: { slug?: string; campaignId?: string },
): string {
  const p = new URLSearchParams();
  p.set("range", range.preset);
  if (range.preset === "custom") {
    p.set("from", range.from.toISOString().slice(0, 10));
    p.set("to", range.to.toISOString().slice(0, 10));
  }
  if (opts?.slug) p.set("slug", opts.slug);
  if (opts?.campaignId) p.set("campaignId", opts.campaignId);
  return p.toString();
}
