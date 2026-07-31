"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Layers,
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
import { listSubscriptionProducts } from "@/lib/services/subscription-products.service";
import {
  listSubscriptionModules,
  setSubscriptionModuleActive,
  SubscriptionModulesApiError,
} from "@/lib/services/subscription-modules.service";
import { can } from "@/config/permissions";
import type { RoleDef, SubscriptionModule, SubscriptionProduct } from "@/types";

type SortKey = "subscriptionModuleName" | "subscriptionProductName" | "createdDtTm";

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

function ModuleList({ roleDef }: { roleDef: RoleDef }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const [rows, setRows] = useState<SubscriptionModule[]>([]);
  const [products, setProducts] = useState<SubscriptionProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const canCreate = can(roleDef, "subscriptionModule", "create");
  const canEdit = can(roleDef, "subscriptionModule", "edit");
  const actorKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [moduleRows, productRows] = await Promise.all([
        listSubscriptionModules(),
        listSubscriptionProducts(),
      ]);
      setRows(moduleRows);
      setProducts(productRows);
    } catch (err) {
      setError(err instanceof SubscriptionModulesApiError ? err.message : "Failed to load");
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
    if (productFilter !== "all") {
      const pid = Number(productFilter);
      result = result.filter((r) => r.subscriptionProductId === pid);
    }
    if (term) {
      result = result.filter(
        (r) =>
          r.subscriptionModuleName.toLowerCase().includes(term) ||
          (r.subscriptionProductName ?? "").toLowerCase().includes(term) ||
          r.description.toLowerCase().includes(term)
      );
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const av =
          sortKey === "subscriptionProductName"
            ? (a.subscriptionProductName ?? "")
            : String(a[sortKey as keyof SubscriptionModule] ?? "");
        const bv =
          sortKey === "subscriptionProductName"
            ? (b.subscriptionProductName ?? "")
            : String(b[sortKey as keyof SubscriptionModule] ?? "");
        const cmp = av.localeCompare(bv);
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [rows, search, productFilter, sortKey, sortDirection]);

  const activeCount = rows.filter((r) => r.isActive).length;

  async function toggleStatus(row: SubscriptionModule) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setSubscriptionModuleActive(row.subscriptionModuleId, !row.isActive, actorKey);
      toast.success(row.isActive ? "Module deactivated" : "Module activated");
      await refresh();
    } catch (err) {
      toast.error(err instanceof SubscriptionModulesApiError ? err.message : "Could not update status");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Subscription Module"
        description="Modules under each subscription product — Super Admin Tenant Configuration."
        actions={
          canCreate ? (
            <Button
              nativeButton={false}
              render={<Link href={`/${role}/masters/subscription-module/new`} />}
            >
              <Plus className="h-4 w-4" />
              Add module
            </Button>
          ) : undefined
        }
      />

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading modules from database…
        </div>
      )}

      {error && !loading && (
        <EmptyState
          icon={Layers}
          tone="muted"
          heading="Could not load modules"
          description={error}
          size="compact"
        />
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:max-w-xl">
          <StatCard icon={Layers} label="Total modules" value={rows.length} />
          <StatCard icon={CheckCircle2} label="Active" value={activeCount} />
          <StatCard icon={CircleDashed} label="Inactive" value={rows.length - activeCount} />
        </div>
      )}

      {!loading && !error && (rows.length > 0 || products.length > 0) && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>
          <Select value={productFilter} onValueChange={(v) => setProductFilter(v ?? "all")}>
            <SelectTrigger className="w-52">
              <SelectValue>
                {(value: string | null) => {
                  if (!value || value === "all") return "All products";
                  return (
                    products.find((p) => String(p.subscriptionProductId) === value)
                      ?.subscriptionProductName ?? "All products"
                  );
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All products</SelectItem>
              {products.map((p) => (
                <SelectItem key={p.subscriptionProductId} value={String(p.subscriptionProductId)}>
                  {p.subscriptionProductName}
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
            icon={Layers}
            tone="primary"
            heading="No subscription modules yet"
            description={
              products.length === 0
                ? "Create a subscription product first, then add modules."
                : "Add your first subscription module to get started."
            }
            size="compact"
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Search}
            tone="muted"
            heading="No matching modules"
            description="Try a different search or product filter."
            size="compact"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Sr. No</TableHead>
                <SortableTableHead
                  sortKey="subscriptionModuleName"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Subscription Module Name
                </SortableTableHead>
                <SortableTableHead
                  sortKey="subscriptionProductName"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Subscription Product
                </SortableTableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row, index) => (
                <TableRow
                  key={row.subscriptionModuleId}
                  onClick={() =>
                    router.push(`/${role}/masters/subscription-module/${row.subscriptionModuleId}`)
                  }
                  className="cursor-pointer"
                >
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Layers className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-medium">{row.subscriptionModuleName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.subscriptionProductName ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {row.description || "—"}
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
                              href={`/${role}/masters/subscription-module/${row.subscriptionModuleId}`}
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
                                  href={`/${role}/masters/subscription-module/${row.subscriptionModuleId}/edit`}
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

export default function SubscriptionModuleMasterPage() {
  return (
    <AccessGate module="subscriptionModule">{(roleDef) => <ModuleList roleDef={roleDef} />}</AccessGate>
  );
}
