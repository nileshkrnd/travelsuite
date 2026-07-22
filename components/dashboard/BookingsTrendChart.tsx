"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyChartState } from "@/components/shared/EmptyChartState";
import { ChartTooltip } from "./ChartTooltip";
import type { BookingsTrendPoint } from "@/lib/services/bookings.service";

export function BookingsTrendChart({ data, loading }: { data: BookingsTrendPoint[]; loading?: boolean }) {
  const isEmpty = data.every((d) => d.count === 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bookings trend</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : isEmpty ? (
          <EmptyChartState label="No bookings in the last 6 months" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={32}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              />
              <Tooltip
                content={<ChartTooltip formatter={(v) => `${v} booking${v === 1 ? "" : "s"}`} />}
                cursor={{ stroke: "var(--border)" }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="var(--chart-1)"
                strokeWidth={2}
                fill="var(--chart-1)"
                fillOpacity={0.1}
                dot={{ r: 4, fill: "var(--chart-1)", stroke: "var(--card)", strokeWidth: 2 }}
                activeDot={{ r: 5, fill: "var(--chart-1)", stroke: "var(--card)", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
