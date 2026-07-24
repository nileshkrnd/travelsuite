"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Home,
  Plus,
  Search,
  SearchX,
} from "lucide-react";
import type { ModuleKey } from "@/config/permissions";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ChartTooltip } from "@/components/dashboard/ChartTooltip";
import { Money } from "@/components/shared/Money";
import { ICONS } from "@/lib/icon-registry";
import { getModulePrototypeData } from "@/mock/data/modulePrototype";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Money as MoneyValue } from "@/types";

const PAGE_SIZE = 5;
const LOADING_MS = 600;
const STATUSES = ["Active", "Pending", "Confirmed", "Cancelled", "On Hold", "Draft", "Completed"];

interface ModulePrototypePageProps {
  moduleKey: ModuleKey;
  title: string;
  groupLabel?: string;
  description?: string;
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (["Active", "Confirmed", "Completed"].includes(status)) return "default";
  if (["Pending", "On Hold", "Draft"].includes(status)) return "secondary";
  if (status === "Cancelled") return "destructive";
  return "outline";
}

function formatAmount(amount: number | MoneyValue, isMoney: boolean): React.ReactNode {
  if (isMoney) return <Money money={amount as MoneyValue} />;
  return new Intl.NumberFormat("en").format(amount as number);
}

export function ModulePrototypePage({ moduleKey, title, groupLabel, description }: ModulePrototypePageProps) {
  const { role } = useParams<{ role: string }>();
  const data = useMemo(() => getModulePrototypeData(moduleKey), [moduleKey]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    const timer = window.setTimeout(() => setLoading(false), LOADING_MS);
    return () => window.clearTimeout(timer);
  }, [moduleKey]);

  const isMoneyColumn = data.amountColumnLabel === "Amount";

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.rows.filter((row) => {
      const matchesSearch =
        !query ||
        row.reference.toLowerCase().includes(query) ||
        row.name.toLowerCase().includes(query) ||
        row.owner.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [data.rows, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const breadcrumbGroup = groupLabel ?? "Modules";

  return (
    <div className="space-y-6 p-6">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link href={`/${role}/dashboard`} className="inline-flex items-center gap-1 hover:text-foreground">
          <Home className="h-3.5 w-3.5" />
          Home
        </Link>
        <span aria-hidden>/</span>
        <span>{breadcrumbGroup}</span>
        <span aria-hidden>/</span>
        <span className="font-medium text-foreground">{title}</span>
      </nav>

      <PageHeader
        title={title}
        description={description ?? `Sample workspace for ${title.toLowerCase()} — prototype data for demos.`}
        actions={
          <>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              New
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reference, name, or owner..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="ps-9"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value ?? "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue>{(value: string | null) => (value === "all" || !value ? "All statuses" : value)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" aria-label="From date" className="w-40" placeholder="From" />
          <Input type="date" aria-label="To date" className="w-40" placeholder="To" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((kpi) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            icon={ICONS[kpi.icon] ?? ICONS.Layers!}
            value={kpi.value}
            format={kpi.format}
            loading={loading}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity overview</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              {data.chartType === "bar" ? (
                <BarChart data={data.chart} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="label"
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
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
                  <Bar dataKey="value" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <AreaChart data={data.chart} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="label"
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
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border)" }} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--chart-2)"
                    strokeWidth={2}
                    fill="var(--chart-2)"
                    fillOpacity={0.12}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filteredRows.length === 0 ? (
            <EmptyState
              icon={SearchX}
              tone="muted"
              heading="No results found"
              description="Try adjusting your search or filters to find what you're looking for."
              size="compact"
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead className="text-end">{data.amountColumnLabel}</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs">{row.reference}</TableCell>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                      </TableCell>
                      <TableCell>{row.owner}</TableCell>
                      <TableCell className="text-end tabular-nums">
                        {formatAmount(row.amount, isMoneyColumn)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{row.updated}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {(safePage - 1) * PAGE_SIZE + 1}–
                  {Math.min(safePage * PAGE_SIZE, filteredRows.length)} of {filteredRows.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    Page {safePage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
