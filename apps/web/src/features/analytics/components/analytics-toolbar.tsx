"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import type { AnalyticsRangePreset } from "@/shared/lib/analytics-date-range";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

const PRESETS: { id: AnalyticsRangePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7d", label: "7d" },
  { id: "30d", label: "30d" },
  { id: "90d", label: "90d" },
  { id: "custom", label: "Custom" },
];

type LinkOption = { slug: string; destinationUrl: string };

type Props = {
  range: AnalyticsRangePreset;
  from?: string;
  to?: string;
  slug?: string;
  campaignId?: string;
  initialSlugLabel?: string;
};

export function AnalyticsToolbar({ range, from, to, slug, campaignId, initialSlugLabel }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [suggestions, setSuggestions] = useState<LinkOption[]>([]);
  const [customFrom, setCustomFrom] = useState(from ?? "");
  const [customTo, setCustomTo] = useState(to ?? "");

  const navigate = useCallback(
    (params: URLSearchParams) => {
      startTransition(() => {
        router.push(`/analytics?${params.toString()}`);
      });
    },
    [router],
  );

  const buildBase = useCallback(() => {
    const p = new URLSearchParams();
    if (slug) p.set("slug", slug);
    if (campaignId) p.set("campaignId", campaignId);
    return p;
  }, [slug, campaignId]);

  const onPreset = (preset: AnalyticsRangePreset) => {
    const p = buildBase();
    p.set("range", preset);
    if (preset !== "custom") {
      p.delete("from");
      p.delete("to");
    }
    navigate(p);
  };

  const onSlugSearch = async (value: string) => {
    if (value.length < 1) {
      setSuggestions([]);
      return;
    }
    const res = await fetch(`/api/links/search?q=${encodeURIComponent(value)}&limit=8`);
    if (!res.ok) return;
    const data = (await res.json()) as { links: LinkOption[] };
    setSuggestions(data.links);
  };

  const applySlug = (s: string) => {
    const p = new URLSearchParams();
    p.set("range", range);
    if (range === "custom" && from && to) {
      p.set("from", from);
      p.set("to", to);
    }
    if (s) p.set("slug", s);
    if (campaignId) p.delete("campaignId");
    setSuggestions([]);
    navigate(p);
  };

  const applyCustom = () => {
    const p = buildBase();
    p.set("range", "custom");
    p.set("from", customFrom);
    p.set("to", customTo);
    navigate(p);
  };

  const clearFiltersHref = `/analytics?range=${range}${range === "custom" && from && to ? `&from=${from}&to=${to}` : ""}`;

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-col-reverse gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="relative min-w-0 flex-1 space-y-1 lg:max-w-md">
          <Label htmlFor="slug-search" className="sr-only">
            Filter by short link
          </Label>
          <Input
            id="slug-search"
            placeholder="Search slug or destination…"
            defaultValue={initialSlugLabel ?? slug ?? ""}
            onChange={(e) => void onSlugSearch(e.target.value)}
          />
          {suggestions.length > 0 ? (
            <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover p-1 text-sm shadow-md">
              {suggestions.map((l) => (
                <li key={l.slug}>
                  <button
                    type="button"
                    className="w-full rounded px-2 py-1.5 text-left hover:bg-accent"
                    onClick={() => applySlug(l.slug)}
                  >
                    <span className="font-mono">{l.slug}</span>
                    <span className="ml-2 truncate text-muted-foreground">{l.destinationUrl.slice(0, 40)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {PRESETS.map((p) => (
            <Button
              key={p.id}
              type="button"
              size="sm"
              variant={range === p.id ? "default" : "outline"}
              disabled={pending}
              onClick={() => onPreset(p.id)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {range === "custom" ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="from">From (UTC)</Label>
            <Input id="from" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to">To (UTC)</Label>
            <Input id="to" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </div>
          <Button type="button" variant="secondary" disabled={pending} onClick={applyCustom}>
            Apply dates
          </Button>
        </div>
      ) : null}

      {slug || campaignId ? (
        <Button type="button" variant="ghost" size="sm" className="w-fit" asChild>
          <Link href={clearFiltersHref}>Clear filters</Link>
        </Button>
      ) : null}
    </div>
  );
}
