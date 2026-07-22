"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyChartState } from "@/components/shared/EmptyChartState";
import { currencyMeta } from "@/mock/data/exchangeRates";
import type { RevenueByCurrencyPoint } from "@/lib/services/bookings.service";

function CurrencyTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: RevenueByCurrencyPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const meta = currencyMeta[point.currencyCode];
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md ring-1 ring-foreground/10">
      <p className="font-medium text-popover-foreground">
        {point.currencyCode} — {meta.name}
      </p>
      <p className="text-muted-foreground">
        {meta.symbol}
        {point.total.toLocaleString()}
      </p>
    </div>
  );
}

export function RevenueByCurrencyChart({
  data,
  loading,
}: {
  data: RevenueByCurrencyPoint[];
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue by currency</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : data.length === 0 ? (
          <EmptyChartState label="No revenue recorded yet" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ top: 24, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="currencyCode"
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
              <Tooltip content={<CurrencyTooltip />} cursor={{ fill: "var(--muted)" }} />
              <Bar dataKey="total" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={40}>
                <LabelList
                  dataKey="total"
                  position="top"
                  className="fill-foreground text-xs"
                  formatter={(v: unknown) => (typeof v === "number" ? v.toLocaleString() : String(v ?? ""))}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
