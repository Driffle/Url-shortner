"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { defaultCustomRangeIsoDates, type AnalyticsRangePreset } from "@/shared/lib/analytics-date-range";
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

type Props = {
  slug: string;
  range: AnalyticsRangePreset;
  from?: string;
  to?: string;
};

export function ShareAnalyticsRangeToolbar({ slug, range, from, to }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const defaults = defaultCustomRangeIsoDates();
  const [customFrom, setCustomFrom] = useState(from ?? defaults.from);
  const [customTo, setCustomTo] = useState(to ?? defaults.to);

  const basePath = `/share/analytics/${encodeURIComponent(slug)}`;

  const navigate = (params: URLSearchParams) => {
    startTransition(() => {
      router.push(`${basePath}?${params.toString()}`);
    });
  };

  const onPreset = (preset: AnalyticsRangePreset) => {
    const p = new URLSearchParams();
    p.set("range", preset);
    if (preset !== "custom") {
      navigate(p);
      return;
    }
    const { from: df, to: dt } = defaultCustomRangeIsoDates();
    p.set("from", from ?? df);
    p.set("to", to ?? dt);
    navigate(p);
  };

  const applyCustom = () => {
    const p = new URLSearchParams();
    p.set("range", "custom");
    p.set("from", customFrom);
    p.set("to", customTo);
    navigate(p);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
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
      {range === "custom" ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="share-from">From (UTC)</Label>
            <Input id="share-from" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="share-to">To (UTC)</Label>
            <Input id="share-to" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </div>
          <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={applyCustom}>
            Apply dates
          </Button>
        </div>
      ) : null}
    </div>
  );
}
