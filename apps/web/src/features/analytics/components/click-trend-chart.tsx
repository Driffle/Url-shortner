"use client";

import dynamic from "next/dynamic";
import type { ChartData } from "@/features/analytics/types";

const Inner = dynamic(() => import("./click-trend-chart-inner").then((m) => m.ClickTrendChartInner), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading chart…</div>,
});

export function ClickTrendChart({ data }: { data: ChartData[] }) {
  return <Inner data={data} />;
}
