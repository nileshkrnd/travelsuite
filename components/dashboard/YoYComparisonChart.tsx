"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyChartState } from "@/components/shared/EmptyChartState";
import type { MonthlyPerformancePoint } from "@/lib/services/performance.service";

function money(n: number) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

function MultiTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: { name?: string; value?: number; color?: string }[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md ring-1 ring-foreground/10">
      {label && <p className="mb-1 font-medium text-popover-foreground">{label}</p>}
      <ul className="space-y-0.5">
        {payload.map((p) => (
          <li key={p.name} className="flex items-center gap-2 text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            <span>{p.name}</span>
            <span className="ms-auto font-medium text-popover-foreground">
              {money(p.value ?? 0)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function YoYComparisonChart({
  data,
  loading,
}: {
  data: MonthlyPerformancePoint[];
  loading?: boolean;
}) {
  const isEmpty = data.every((d) => d.actual === 0 && d.lastYear === 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>This year vs last year</CardTitle>
        <CardDescription>Month-by-month revenue comparison</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : isEmpty ? (
          <EmptyChartState label="No year-over-year data yet" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={48}
                tickFormatter={(v) => money(v)}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <Tooltip content={<MultiTooltip />} cursor={{ stroke: "var(--border)" }} />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                formatter={(value) => <span className="text-muted-foreground">{value}</span>}
              />
              <Line
                type="monotone"
                dataKey="lastYear"
                name="Last year"
                stroke="var(--chart-3)"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 3, fill: "var(--chart-3)", stroke: "var(--card)", strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="actual"
                name="This year"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--chart-1)", stroke: "var(--card)", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
