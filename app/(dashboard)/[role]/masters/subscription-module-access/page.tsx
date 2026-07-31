"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  KeyRound,
  MoreHorizontal,
  Search,
  Eye,
  Pencil,
  Power,
  PowerOff,
  CheckCircle2,
  CircleDashed,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SortableTableHead, type SortDirection } from "@/components/shared/SortableTableHead";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSessionStore } from "@/lib/store/session.store";
import { useUsersStore } from "@/lib/store/users.store";
import { listTenants } from "@/lib/services/tenants.service";
import {
  listSubscriptionModuleAccess,
  setSubscriptionModuleAccessActive,
  SubscriptionModuleAccessApiError,
} from "@/lib/services/subscription-module-access.service";
import { can } from "@/config/permissions";
import type { RoleDef, SubscriptionModuleAccess, Tenant } from "@/types";

type SortKey = "tenantName" | "subscriptionModuleName" | "subscriptionProductName" | "createdDtTm";

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

function AccessList({ roleDef }: { roleDef: RoleDef }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const [rows, setRows] = useState<SubscriptionModuleAccess[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tenantFilter, setTenantFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const canCreate = can(roleDef, "subscriptionModuleAccess", "create");
  const canEdit = can(roleDef, "subscriptionModuleAccess", "edit");
  const actorKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [accessRows, tenantRows] = await Promise.all([
        listSubscriptionModuleAccess(),
        listTenants(),
      ]);
      setRows(accessRows);
      setTenants(tenantRows);
    } catch (err) {
      setError(err instanceof SubscriptionModuleAccessApiError ? err.message : "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = rows;
    if (tenantFilter !== "all") {
      const tid = Number(tenantFilter);
      result = result.filter((r) => r.tenantId === tid);
    }
    if (term) {
      result = result.filter(
        (r) =>
          (r.tenantName ?? "").toLowerCase().includes(term) ||
          (r.tenantCode ?? "").toLowerCase().includes(term) ||
          (r.subscriptionModuleName ?? "").toLowerCase().includes(term) ||
          (r.subscriptionProductName ?? "").toLowerCase().includes(term)
      );
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const av = String(a[sortKey] ?? "");
        const bv = String(b[sortKey] ?? "");
        const cmp = av.localeCompare(bv);
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [rows, search, tenantFilter, sortKey, sortDirection]);

  const activeCount = rows.filter((r) => r.isActive).length;

  async function toggleStatus(row: SubscriptionModuleAccess) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setSubscriptionModuleAccessActive(
        row.subscriptionModuleAccessId,
        !row.isActive,
        actorKey
      );
      toast.success(row.isActive ? "Access deactivated" : "Access activated");
      await refresh();
    } catch (err) {
      toast.error(
        err instanceof SubscriptionModuleAccessApiError ? err.message : "Could not update status"
      );
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Subscription Module Access"
        description="Grant subscription modules to tenants — Super Admin Tenant Configuration."
        actions={
          canCreate ? (
            <Button
              nativeButton={false}
              render={<Link href={`/${role}/masters/subscription-module-access/new`} />}
            >
              <Plus className="h-4 w-4" />
              Grant access
            </Button>
          ) : undefined
        }
      />

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading access grants from database…
        </div>
      )}

      {error && !loading && (
        <EmptyState
          icon={KeyRound}
          tone="muted"
          heading="Could not load access grants"
          description={error}
          size="compact"
        />
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:max-w-xl">
          <StatCard icon={KeyRound} label="Total grants" value={rows.length} />
          <StatCard icon={CheckCircle2} label="Active" value={activeCount} />
          <StatCard icon={CircleDashed} label="Inactive" value={rows.length - activeCount} />
        </div>
      )}

      {!loading && !error && (rows.length > 0 || tenants.length > 0) && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tenant or module…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>
          <Select value={tenantFilter} onValueChange={(v) => setTenantFilter(v ?? "all")}>
            <SelectTrigger className="w-52">
              <SelectValue>
                {(value: string | null) => {
                  if (!value || value === "all") return "All tenants";
                  return (
                    tenants.find((t) => String(t.tenantKey) === value)?.branding.name ??
                    "All tenants"
                  );
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tenants</SelectItem>
              {tenants.map((t) => (
                <SelectItem key={t.tenantKey} value={String(t.tenantKey)}>
                  {t.branding.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Card>
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : error ? null : rows.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            tone="primary"
            heading="No module access grants yet"
            description="Grant a subscription module to a tenant to get started."
            size="compact"
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Search}
            tone="muted"
            heading="No matching grants"
            description="Try a different search or tenant filter."
            size="compact"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Sr. No</TableHead>
                <SortableTableHead
                  sortKey="tenantName"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Tenant
                </SortableTableHead>
                <SortableTableHead
                  sortKey="subscriptionModuleName"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Module
                </SortableTableHead>
                <SortableTableHead
                  sortKey="subscriptionProductName"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Product
                </SortableTableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row, index) => (
                <TableRow
                  key={row.subscriptionModuleAccessId}
                  onClick={() =>
                    router.push(
                      `/${role}/masters/subscription-module-access/${row.subscriptionModuleAccessId}`
                    )
                  }
                  className="cursor-pointer"
                >
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <KeyRound className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-medium">{row.tenantName ?? "—"}</span>
                        {row.tenantCode ? (
                          <p className="text-xs text-muted-foreground">{row.tenantCode}</p>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.subscriptionModuleName ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.subscriptionProductName ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.isActive ? "default" : "secondary"} className="gap-1">
                      {row.isActive ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <CircleDashed className="h-3 w-3" />
                      )}
                      {row.isActive ? "active" : "inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          render={
                            <Link
                              href={`/${role}/masters/subscription-module-access/${row.subscriptionModuleAccessId}`}
                            />
                          }
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        {canEdit && (
                          <>
                            <DropdownMenuItem
                              render={
                                <Link
                                  href={`/${role}/masters/subscription-module-access/${row.subscriptionModuleAccessId}/edit`}
                                />
                              }
                            >
                              <Pencil className="h-4 w-4" />
                              Modify
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void toggleStatus(row)}>
                              {row.isActive ? (
                                <PowerOff className="h-4 w-4" />
                              ) : (
                                <Power className="h-4 w-4" />
                              )}
                              {row.isActive ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

export default function SubscriptionModuleAccessMasterPage() {
  return (
    <AccessGate module="subscriptionModuleAccess">
      {(roleDef) => <AccessList roleDef={roleDef} />}
    </AccessGate>
  );
}
