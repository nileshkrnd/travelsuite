"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ListTree,
  BookMarked,
  Search,
  Expand,
  Minimize2,
} from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAccountGroupsStore } from "@/lib/store/account-groups.store";
import { useLedgersStore } from "@/lib/store/ledgers.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import {
  buildChartOfAccounts,
  countCoaNodes,
  filterCoaTree,
  flattenCoaTree,
  type CoaNode,
} from "@/lib/coa-tree";
import { can } from "@/config/permissions";
import {
  ACCOUNT_GROUP_NATURES,
  ACCOUNT_GROUP_REPORT_TYPES,
  accountGroupNatureLabel,
  accountGroupReportLabel,
  type RoleDef,
} from "@/types";

const nativeSelectClass =
  "flex h-10 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-48";

function formatAmount(value: number): string {
  if (!value) return "—";
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function collectExpandableIds(nodes: CoaNode[]): string[] {
  const ids: string[] = [];
  function walk(list: CoaNode[]) {
    for (const n of list) {
      if (n.kind === "group" && n.children.length > 0) {
        ids.push(n.id);
        walk(n.children);
      }
    }
  }
  walk(nodes);
  return ids;
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ChartOfAccountsView({ roleDef }: { roleDef: RoleDef }) {
  const { role } = useParams<{ role: string }>();
  const tenantId = useTenantStore((s) => s.tenantId);
  const allGroups = useAccountGroupsStore((s) => s.groups);
  const allLedgers = useLedgersStore((s) => s.ledgers);

  const [search, setSearch] = useState("");
  const [natureFilter, setNatureFilter] = useState("all");
  const [reportFilter, setReportFilter] = useState("all");
  const [activeOnly, setActiveOnly] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const groups = useMemo(
    () => allGroups.filter((g) => g.tenantId === tenantId),
    [allGroups, tenantId]
  );
  const ledgers = useMemo(
    () => allLedgers.filter((l) => l.tenantId === tenantId),
    [allLedgers, tenantId]
  );

  const tree = useMemo(() => buildChartOfAccounts(groups, ledgers), [groups, ledgers]);

  const filteredTree = useMemo(
    () =>
      filterCoaTree(tree, {
        search,
        nature: natureFilter,
        reportType: reportFilter,
        activeOnly,
      }),
    [tree, search, natureFilter, reportFilter, activeOnly]
  );

  const flat = useMemo(() => flattenCoaTree(filteredTree), [filteredTree]);
  const counts = useMemo(() => countCoaNodes(filteredTree), [filteredTree]);
  const fullCounts = useMemo(() => countCoaNodes(tree), [tree]);

  // Expand all roots by default when tree first loads / filters change meaningfully
  useEffect(() => {
    const rootIds = filteredTree.filter((n) => n.children.length > 0).map((n) => n.id);
    setExpanded(new Set(rootIds));
  }, [natureFilter, reportFilter, activeOnly, tenantId]);

  const visibleRows = useMemo(() => {
    const rows: CoaNode[] = [];
    function walk(list: CoaNode[]) {
      for (const n of list) {
        rows.push(n);
        if (n.kind === "group" && n.children.length > 0 && expanded.has(n.id)) {
          walk(n.children);
        }
      }
    }
    walk(filteredTree);
    return rows;
  }, [filteredTree, expanded]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    setExpanded(new Set(collectExpandableIds(filteredTree)));
  }

  function collapseAll() {
    setExpanded(new Set());
  }

  const canManageGroups = can(roleDef, "accountGroup", "create");
  const canManageLedgers = can(roleDef, "ledger", "create");

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Chart of Accounts"
        description="Hierarchical view of account groups and ledgers — industry-standard COA structure (mock data)."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canManageGroups && (
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href={`/${role}/accounts/group`} />}
              >
                <ListTree className="h-4 w-4" />
                Groups
              </Button>
            )}
            {canManageLedgers && (
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href={`/${role}/accounts/ledger`} />}
              >
                <BookMarked className="h-4 w-4" />
                Ledgers
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3 sm:max-w-2xl">
        <StatCard icon={ListTree} label="Groups" value={fullCounts.groups} />
        <StatCard icon={BookMarked} label="Ledgers" value={fullCounts.ledgers} />
        <StatCard icon={BookOpen} label="Showing" value={counts.groups + counts.ledgers} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search code or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
        <select
          className={nativeSelectClass}
          value={natureFilter}
          onChange={(e) => setNatureFilter(e.target.value)}
        >
          <option value="all">All natures</option>
          {ACCOUNT_GROUP_NATURES.map((n) => (
            <option key={n.value} value={n.value}>
              {n.label}
            </option>
          ))}
        </select>
        <select
          className={nativeSelectClass}
          value={reportFilter}
          onChange={(e) => setReportFilter(e.target.value)}
        >
          <option value="all">All reports</option>
          {ACCOUNT_GROUP_REPORT_TYPES.map((n) => (
            <option key={n.value} value={n.value}>
              {n.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
            className="size-4 rounded border-input"
          />
          Active only
        </label>
        <div className="flex items-center gap-2 lg:ms-auto">
          <Button type="button" variant="outline" size="sm" onClick={expandAll}>
            <Expand className="h-3.5 w-3.5" />
            Expand all
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={collapseAll}>
            <Minimize2 className="h-3.5 w-3.5" />
            Collapse
          </Button>
        </div>
      </div>

      <Card>
        {visibleRows.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            tone="muted"
            heading="No accounts to show"
            description="Add account groups and ledgers, or clear filters. Primary groups seed the chart."
            size="compact"
            action={
              canManageGroups ? (
                <Button nativeButton={false} render={<Link href={`/${role}/accounts/group`} />}>
                  <ListTree className="h-4 w-4" />
                  Manage groups
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead className="w-28">Code</TableHead>
                <TableHead>Account name</TableHead>
                <TableHead className="w-24">Type</TableHead>
                <TableHead>Nature</TableHead>
                <TableHead>Report</TableHead>
                <TableHead className="text-right">Opening</TableHead>
                <TableHead className="w-20">Dr / Cr</TableHead>
                <TableHead className="w-24">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((node, index) => {
                const hasChildren = node.kind === "group" && node.children.length > 0;
                const isOpen = expanded.has(node.id);
                return (
                  <TableRow
                    key={`${node.kind}-${node.id}`}
                    className={node.kind === "group" ? "bg-muted/30" : undefined}
                  >
                    <TableCell className="text-muted-foreground tabular-nums">{index + 1}</TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{node.code}</code>
                    </TableCell>
                    <TableCell>
                      <div
                        className="flex min-w-0 items-center gap-1.5"
                        style={{ paddingInlineStart: `${node.depth * 1.25}rem` }}
                      >
                        {hasChildren ? (
                          <button
                            type="button"
                            onClick={() => toggle(node.id)}
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label={isOpen ? "Collapse" : "Expand"}
                          >
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        ) : (
                          <span className="inline-block w-6 shrink-0" />
                        )}
                        {node.kind === "group" ? (
                          <ListTree className="h-3.5 w-3.5 shrink-0 text-primary" />
                        ) : (
                          <BookMarked className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <span
                          className={
                            node.kind === "group" ? "truncate font-semibold" : "truncate font-medium"
                          }
                        >
                          {node.name}
                        </span>
                        {node.isSystem && (
                          <Badge variant="secondary" className="shrink-0 text-[10px]">
                            System
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={node.kind === "group" ? "default" : "outline"}>
                        {node.kind === "group" ? "Group" : "Ledger"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{accountGroupNatureLabel(node.nature)}</TableCell>
                    <TableCell className="text-sm">{accountGroupReportLabel(node.reportType)}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {node.kind === "ledger" ? formatAmount(node.openingBalance) : "—"}
                    </TableCell>
                    <TableCell className="capitalize text-sm">
                      {node.kind === "ledger" ? node.normalBalance : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={node.status === "active" ? "default" : "secondary"}>
                        {node.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <p className="text-xs text-muted-foreground">
        Showing {visibleRows.length} of {flat.length} filtered account line(s). Structure comes from Account
        Group and Ledger masters.
      </p>
    </div>
  );
}

export default function ChartOfAccountsPage() {
  return (
    <AccessGate module="chartOfAccounts">
      {(roleDef) => <ChartOfAccountsView roleDef={roleDef} />}
    </AccessGate>
  );
}
