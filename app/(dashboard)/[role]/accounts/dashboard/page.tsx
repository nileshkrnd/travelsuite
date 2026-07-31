"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Banknote,
  BookOpen,
  CreditCard,
  FileSpreadsheet,
  Scale,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { Money } from "@/components/shared/Money";
import { ChartTooltip } from "@/components/dashboard/ChartTooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAccountGroupsStore } from "@/lib/store/account-groups.store";
import { useLedgersStore } from "@/lib/store/ledgers.store";
import { useVouchersStore } from "@/lib/store/vouchers.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { SAAS_BRAND } from "@/config/saasBrand";
import { buildFinanceDashboard } from "@/lib/finance-dashboard";
import type { CurrencyCode, RoleDef } from "@/types";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function moneyOf(value: number, currencyCode: CurrencyCode) {
  return { value: Math.round(value), currencyCode };
}

function formatCompact(n: number): string {
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

function FinanceDashboardView({ roleDef }: { roleDef: RoleDef }) {
  const tenant = useTenantStore((s) => s.tenant);
  const tenantId = useTenantStore((s) => s.tenantId);
  const groups = useAccountGroupsStore((s) => s.groups);
  const ledgers = useLedgersStore((s) => s.ledgers);
  const vouchers = useVouchersStore((s) => s.vouchers);
  const currency = (tenant.defaultCurrency ?? "AED") as CurrencyCode;
  const base = `/${roleDef.slug}`;

  useEffect(() => {
    document.title = `Finance Dashboard · ${SAAS_BRAND.name}`;
  }, []);

  const data = useMemo(
    () => buildFinanceDashboard(groups, ledgers, tenantId, vouchers),
    [groups, ledgers, tenantId, vouchers]
  );

  const monthlyChart = useMemo(
    () =>
      data.monthly.map((m) => ({
        ...m,
        profit: m.income - m.expense,
      })),
    [data.monthly]
  );

  const quickLinks = [
    { href: `${base}/accounts/reports/balance-sheet`, label: "Balance Sheet", icon: Scale },
    { href: `${base}/accounts/reports/profit-and-loss`, label: "Profit & Loss", icon: TrendingUp },
    { href: `${base}/accounts/reports/trial-balance`, label: "Trial Balance", icon: FileSpreadsheet },
    { href: `${base}/accounts/chart-of-accounts`, label: "Chart of Accounts", icon: BookOpen },
  ];

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Finance Dashboard"
        description={`${tenant.branding.name} · cash position, profitability, and recent vouchers (mock)`}
        actions={
          <div className="flex flex-wrap gap-2">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Button
                  key={link.href}
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href={link.href} />}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {link.label}
                </Button>
              );
            })}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Cash & bank"
          icon={Wallet}
          value={moneyOf(data.kpis.cashAndBank, currency)}
          format="money"
        />
        <KpiCard
          label="Receivables"
          icon={Banknote}
          value={moneyOf(data.kpis.receivables, currency)}
          format="money"
        />
        <KpiCard
          label="Payables"
          icon={CreditCard}
          value={moneyOf(data.kpis.payables, currency)}
          format="money"
        />
        <KpiCard
          label="Net profit (YTD)"
          icon={TrendingUp}
          value={moneyOf(data.kpis.netProfit, currency)}
          format="money"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Income vs expense</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyChart} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
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
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  tickFormatter={formatCompact}
                />
                <Tooltip
                  content={({ active, label, payload }) => {
                    if (!active || !payload?.length) return null;
                    const fmt = (v: number) =>
                      new Intl.NumberFormat(undefined, {
                        style: "currency",
                        currency,
                        maximumFractionDigits: 0,
                      }).format(v);
                    return (
                      <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md ring-1 ring-foreground/10">
                        <p className="mb-1 font-medium">{label}</p>
                        {payload.map((p) => (
                          <p key={String(p.dataKey)} className="text-muted-foreground">
                            {p.name}: {fmt(Number(p.value ?? 0))}
                          </p>
                        ))}
                      </div>
                    );
                  }}
                  cursor={{ stroke: "var(--border)" }}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  fill="var(--chart-1)"
                  fillOpacity={0.12}
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  name="Expense"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  fill="var(--chart-2)"
                  fillOpacity={0.1}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--chart-1)]" /> Income
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--chart-2)]" /> Expense
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expense mix (YTD)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data.expenseBreakdown}
                  dataKey="amount"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {data.expenseBreakdown.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={
                    <ChartTooltip
                      formatter={(v) =>
                        new Intl.NumberFormat(undefined, {
                          style: "currency",
                          currency,
                          maximumFractionDigits: 0,
                        }).format(v)
                      }
                    />
                  }
                />
              </PieChart>
            </ResponsiveContainer>
            <ul className="mt-2 space-y-1.5 text-xs">
              {data.expenseBreakdown.map((slice, i) => (
                <li key={slice.name} className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    {slice.name}
                  </span>
                  <span className="tabular-nums font-medium">
                    <Money money={moneyOf(slice.amount, currency)} />
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Receivables aging</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.receivablesAging} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={48}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  tickFormatter={formatCompact}
                />
                <Tooltip
                  content={
                    <ChartTooltip
                      formatter={(v) =>
                        new Intl.NumberFormat(undefined, {
                          style: "currency",
                          currency,
                          maximumFractionDigits: 0,
                        }).format(v)
                      }
                    />
                  }
                />
                <Bar dataKey="amount" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Recent vouchers</CardTitle>
            <Badge variant="secondary">Mock</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Voucher</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentVouchers.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {new Date(v.date + "T12:00:00").toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{v.voucherNo}</TableCell>
                    <TableCell>{v.type}</TableCell>
                    <TableCell className="max-w-[160px] truncate">{v.party}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <Money money={moneyOf(v.amount, currency)} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={v.status === "posted" ? "default" : "outline"}>
                        {v.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Gross profit (YTD)</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              <Money money={moneyOf(data.kpis.grossProfit, currency)} />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Active groups</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{data.kpis.groupCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Active ledgers</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{data.kpis.ledgerCount}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AccountsDashboardPage() {
  return (
    <AccessGate module="accountsDashboard">
      {(roleDef) => <FinanceDashboardView roleDef={roleDef} />}
    </AccessGate>
  );
}
