"use client";

import { useEffect, useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { FinanceReportChrome, formatMoney } from "@/components/finance/FinanceReportChrome";
import { useAccountGroupsStore } from "@/lib/store/account-groups.store";
import { useLedgersStore } from "@/lib/store/ledgers.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { buildProfitAndLoss, type StatementLine } from "@/lib/finance-reports";
import { cn } from "@/lib/utils";

function StatementTable({ lines }: { lines: StatementLine[] }) {
  return (
    <Table>
      <TableBody>
        {lines.map((line) => {
          const isTotal = line.kind === "total";
          const isGroup = line.kind === "group";
          return (
            <TableRow
              key={line.id}
              className={cn(
                isTotal && "bg-muted/40 font-semibold",
                isGroup && "font-medium"
              )}
            >
              <TableCell
                className={cn("py-2", line.depth > 0 && "pl-8 text-muted-foreground")}
              >
                {line.code ? (
                  <span className="mr-2 font-mono text-xs text-muted-foreground">{line.code}</span>
                ) : null}
                {line.name}
              </TableCell>
              <TableCell className="py-2 text-right tabular-nums">{formatMoney(line.amount)}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function ProfitAndLossView() {
  const tenant = useTenantStore((s) => s.tenant);
  const tenantId = useTenantStore((s) => s.tenantId);
  const allGroups = useAccountGroupsStore((s) => s.groups);
  const allLedgers = useLedgersStore((s) => s.ledgers);

  useEffect(() => {
    document.title = "Profit and Loss · Klyra";
  }, []);

  const groups = useMemo(
    () => allGroups.filter((g) => g.tenantId === tenantId),
    [allGroups, tenantId]
  );
  const ledgers = useMemo(
    () => allLedgers.filter((l) => l.tenantId === tenantId),
    [allLedgers, tenantId]
  );

  const report = useMemo(() => buildProfitAndLoss(groups, ledgers), [groups, ledgers]);
  const hasData = report.totalIncome > 0 || report.totalExpenses > 0;
  const profitLabel = report.netProfit >= 0 ? "Net profit" : "Net loss";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profit and Loss"
        description="Income and expenses for the period, with gross and net profit."
      />

      <FinanceReportChrome
        companyName={tenant.branding.name}
        reportTitle="Profit and Loss Account"
        subtitle={`${profitLabel}: ${formatMoney(Math.abs(report.netProfit))}`}
      >
        {!hasData ? (
          <EmptyState
            icon={TrendingUp}
            tone="muted"
            heading="No P&L figures"
            description="Post income and expense ledger balances to populate this report."
            size="compact"
          />
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Gross profit</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums">
                    {formatMoney(report.grossProfit)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Total income</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums">
                    {formatMoney(report.totalIncome)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">{profitLabel}</p>
                  <p
                    className={cn(
                      "mt-1 text-xl font-semibold tabular-nums",
                      report.netProfit >= 0
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-destructive"
                    )}
                  >
                    {formatMoney(Math.abs(report.netProfit))}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Income</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <StatementTable lines={report.income} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Expenses</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <StatementTable lines={report.expenses} />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </FinanceReportChrome>
    </div>
  );
}

export default function ProfitAndLossPage() {
  return (
    <AccessGate module="reportProfitAndLoss">
      {() => <ProfitAndLossView />}
    </AccessGate>
  );
}
