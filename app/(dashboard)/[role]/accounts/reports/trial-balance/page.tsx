"use client";

import { useEffect, useMemo } from "react";
import { Scale } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { FinanceReportChrome, formatMoney } from "@/components/finance/FinanceReportChrome";
import { useAccountGroupsStore } from "@/lib/store/account-groups.store";
import { useLedgersStore } from "@/lib/store/ledgers.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { SAAS_BRAND } from "@/config/saasBrand";
import { buildTrialBalance } from "@/lib/finance-reports";

function TrialBalanceView() {
  const tenant = useTenantStore((s) => s.tenant);
  const tenantId = useTenantStore((s) => s.tenantId);
  const allGroups = useAccountGroupsStore((s) => s.groups);
  const allLedgers = useLedgersStore((s) => s.ledgers);

  useEffect(() => {
    document.title = `Trial Balance · ${SAAS_BRAND.name}`;
  }, []);

  const groups = useMemo(
    () => allGroups.filter((g) => g.tenantId === tenantId),
    [allGroups, tenantId]
  );
  const ledgers = useMemo(
    () => allLedgers.filter((l) => l.tenantId === tenantId),
    [allLedgers, tenantId]
  );

  const report = useMemo(() => buildTrialBalance(groups, ledgers), [groups, ledgers]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trial Balance"
        description="Debit and credit balances of all active ledgers as of the selected date."
      />

      <FinanceReportChrome
        companyName={tenant.branding.name}
        reportTitle="Trial Balance"
        subtitle={`${report.lines.length} ledger accounts`}
        balanced={report.isBalanced}
      >
        {report.lines.length === 0 ? (
          <EmptyState
            icon={Scale}
            tone="muted"
            heading="No ledger balances"
            description="Add ledgers with opening balances to generate a trial balance."
            size="compact"
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Code</TableHead>
                    <TableHead>Particulars</TableHead>
                    <TableHead className="hidden md:table-cell">Group</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {line.code}
                      </TableCell>
                      <TableCell className="font-medium">{line.name}</TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {line.groupName}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {line.debit ? formatMoney(line.debit) : ""}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {line.credit ? formatMoney(line.credit) : ""}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/40 font-semibold">
                    <TableCell colSpan={3}>Total</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(report.totalDebit)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(report.totalCredit)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </FinanceReportChrome>
    </div>
  );
}

export default function TrialBalancePage() {
  return (
    <AccessGate module="reportTrialBalance">
      {() => <TrialBalanceView />}
    </AccessGate>
  );
}
