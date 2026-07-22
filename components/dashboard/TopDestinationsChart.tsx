"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyChartState } from "@/components/shared/EmptyChartState";
import { ChartTooltip } from "./ChartTooltip";
import type { TopDestinationPoint } from "@/lib/services/bookings.service";

export function TopDestinationsChart({ data, loading }: { data: TopDestinationPoint[]; loading?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top destinations</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : data.length === 0 ? (
          <EmptyChartState label="No bookings yet" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} layout="vertical" margin={{ top: 8, right: 28, left: 0, bottom: 0 }}>
              <CartesianGrid horizontal={false} stroke="var(--border)" />
              <XAxis
                type="number"
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              />
              <YAxis
                type="category"
                dataKey="destination"
                tickLine={false}
                axisLine={false}
                width={84}
                tick={{ fill: "var(--foreground)", fontSize: 12 }}
              />
              <Tooltip
                content={<ChartTooltip formatter={(v) => `${v} booking${v === 1 ? "" : "s"}`} />}
                cursor={{ fill: "var(--muted)" }}
              />
              <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 4, 4, 0]} maxBarSize={20}>
                <LabelList dataKey="count" position="right" className="fill-foreground text-xs" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
