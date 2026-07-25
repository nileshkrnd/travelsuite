"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { PerformanceRow } from "@/lib/services/performance.service";

function money(n: number) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function Pct({ value, goodWhenPositive = true }: { value: number; goodWhenPositive?: boolean }) {
  const positive = value >= 0;
  const good = goodWhenPositive ? positive : value >= 100;
  return (
    <span
      className={cn(
        "tabular-nums font-medium",
        good ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"
      )}
    >
      {positive && goodWhenPositive ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

export function PerformanceTable({
  title,
  description,
  rows,
  loading,
  showCompany,
}: {
  title: string;
  description: string;
  rows: PerformanceRow[];
  loading?: boolean;
  showCompany?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        {loading ? (
          <div className="space-y-2 px-6">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">No rows for this scope</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="ps-6">{showCompany ? "Branch" : "Company"}</TableHead>
                  {showCompany && <TableHead>Company</TableHead>}
                  <TableHead className="text-end">Actual</TableHead>
                  <TableHead className="text-end">Target</TableHead>
                  <TableHead className="text-end">vs target</TableHead>
                  <TableHead className="text-end">Last year</TableHead>
                  <TableHead className="pe-6 text-end">YoY</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="ps-6 font-medium">{row.name}</TableCell>
                    {showCompany && (
                      <TableCell className="text-muted-foreground">{row.companyName}</TableCell>
                    )}
                    <TableCell className="text-end tabular-nums">{money(row.actual)}</TableCell>
                    <TableCell className="text-end tabular-nums text-muted-foreground">
                      {money(row.target)}
                    </TableCell>
                    <TableCell className="text-end">
                      <Pct value={row.attainmentPct} goodWhenPositive={false} />
                    </TableCell>
                    <TableCell className="text-end tabular-nums text-muted-foreground">
                      {money(row.lastYear)}
                    </TableCell>
                    <TableCell className="pe-6 text-end">
                      <Pct value={row.yoyGrowthPct} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
