"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { ChartData } from "@/features/analytics/types";

export function ClickTrendChartInner({ data }: { data: ChartData[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="fillClicks" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(224, 76%, 48%)" stopOpacity={0.28} />
            <stop offset="95%" stopColor="hsl(224, 76%, 48%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis width={32} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
        />
        <Area type="monotone" dataKey="clicks" stroke="hsl(224, 76%, 48%)" fill="url(#fillClicks)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
