"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer } from "lucide-react";

export function formatMoney(value: number): string {
  const abs = Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (value < 0) return `(${abs})`;
  return abs;
}

export function FinanceReportChrome({
  companyName,
  reportTitle,
  subtitle,
  balanced,
  children,
}: {
  companyName: string;
  reportTitle: string;
  subtitle?: string;
  balanced?: boolean;
  children: React.ReactNode;
}) {
  const [asOf, setAsOf] = useState(() => new Date().toISOString().slice(0, 10));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 print:border-0 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {companyName}
          </p>
          <h2 className="text-lg font-semibold tracking-tight">{reportTitle}</h2>
          <p className="text-sm text-muted-foreground">
            As of{" "}
            {new Date(asOf + "T12:00:00").toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            {subtitle ? ` · ${subtitle}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {typeof balanced === "boolean" && (
            <Badge variant={balanced ? "default" : "destructive"}>
              {balanced ? "Balanced" : "Out of balance"}
            </Badge>
          )}
          <div className="w-40">
            <label className="mb-1 block text-xs text-muted-foreground">As of date</label>
            <Input
              type="date"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
              className="h-9"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-5 print:hidden"
            onClick={() => window.print()}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print
          </Button>
        </div>
      </div>
      {children}
      <p className="text-xs text-muted-foreground print:hidden">
        Sample report generated from mock ledger balances (opening / YTD figures).
      </p>
    </div>
  );
}
