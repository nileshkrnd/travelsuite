"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Store, MoreHorizontal, Search } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SortableTableHead, type SortDirection } from "@/components/shared/SortableTableHead";
import { Card } from "@/components/ui/card";
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
import { useTenantStore } from "@/lib/store/tenant.store";
import { useSuppliersStore } from "@/lib/store/suppliers.store";
import { listSuppliers, setSupplierActive, SuppliersApiError } from "@/lib/services/suppliers.service";
import { can } from "@/config/permissions";
import type { RoleDef, Supplier } from "@/types";

type SortKey = "code" | "name" | "type" | "city";
type StatusFilter = "all" | "active" | "inactive";

function SupplierList({ roleDef }: { roleDef: RoleDef }) {
  const { role } = useParams<{ role: string }>();
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;
  const actorKey = sessionUser?.userKey ?? 0;
  const suppliers = useSuppliersStore((s) => s.suppliers);
  const setSuppliers = useSuppliersStore((s) => s.setSuppliers);
  const upsertSupplier = useSuppliersStore((s) => s.upsertSupplier);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const canEdit = can(roleDef, "supplier", "edit");
  const canCreate = can(roleDef, "supplier", "create");

  const tenantSuppliers = useMemo(
    () => suppliers.filter((s) => s.tenantKey === tenantKey),
    [suppliers, tenantKey]
  );

  useEffect(() => {
    if (tenantKey <= 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    listSuppliers({ tenantId: tenantKey })
      .then((rows) => {
        if (cancelled) return;
        const others = useSuppliersStore.getState().suppliers.filter((s) => s.tenantKey !== tenantKey);
        setSuppliers([...others, ...rows]);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof SuppliersApiError ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantKey, setSuppliers]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  async function toggleActive(supplier: Supplier) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await setSupplierActive(supplier.supplierKey, !supplier.isActive, actorKey);
      upsertSupplier(saved);
      toast.success(saved.isActive ? "Activated" : "Deactivated");
    } catch (error) {
      toast.error(error instanceof SuppliersApiError ? error.message : "Could not update status");
    }
  }

  const visibleSuppliers = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = tenantSuppliers;
    if (term) {
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          s.code.toLowerCase().includes(term) ||
          (s.supplierTypeName ?? "").toLowerCase().includes(term)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((s) => (statusFilter === "active" ? s.isActive : !s.isActive));
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const av = sortKey === "type" ? (a.supplierTypeName ?? "") : sortKey === "city" ? (a.cityName ?? "") : a[sortKey];
        const bv = sortKey === "type" ? (b.supplierTypeName ?? "") : sortKey === "city" ? (b.cityName ?? "") : b[sortKey];
        const cmp = String(av).localeCompare(String(bv));
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [tenantSuppliers, search, statusFilter, sortKey, sortDirection]);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Supplier"
        description="Inventory partners — hoteliers, DMCs, tour operators, transport, and activity providers."
        actions={
          canCreate ? (
            <Button nativeButton={false} render={<Link href={`/${role}/masters/supplier/new`} />}>
              <Plus className="h-4 w-4" />
              Add supplier
            </Button>
          ) : undefined
        }
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {tenantSuppliers.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, code, type…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter((value as StatusFilter) ?? "all")}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <Card>
        {!loading && tenantSuppliers.length === 0 ? (
          <EmptyState
            icon={Store}
            tone="primary"
            heading="No suppliers yet"
            description="Add your first supplier to get started."
            size="compact"
          />
        ) : visibleSuppliers.length === 0 && !loading ? (
          <EmptyState
            icon={Search}
            tone="muted"
            heading="No matching suppliers"
            description="Try a different search term or status filter."
            size="compact"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Sr. No</TableHead>
                <SortableTableHead sortKey="code" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Code
                </SortableTableHead>
                <SortableTableHead sortKey="name" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Name
                </SortableTableHead>
                <SortableTableHead sortKey="type" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Type
                </SortableTableHead>
                <SortableTableHead sortKey="city" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  City
                </SortableTableHead>
                <TableHead>Extranet</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleSuppliers.map((supplier, index) => (
                <TableRow key={supplier.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{supplier.code}</TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/${role}/masters/supplier/${supplier.supplierKey}`} className="hover:underline">
                      {supplier.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{supplier.supplierTypeName ?? "—"}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{supplier.cityName ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={supplier.requiresExtranetAccess ? "default" : "secondary"}>
                      {supplier.requiresExtranetAccess ? "Yes" : "No"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={supplier.isActive ? "default" : "secondary"}>
                      {supplier.isActive ? "active" : "inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          nativeButton={false}
                          render={<Link href={`/${role}/masters/supplier/${supplier.supplierKey}`} />}
                        >
                          View
                        </DropdownMenuItem>
                        {canEdit && (
                          <>
                            <DropdownMenuItem
                              nativeButton={false}
                              render={<Link href={`/${role}/masters/supplier/${supplier.supplierKey}/edit`} />}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void toggleActive(supplier)}>
                              {supplier.isActive ? "Deactivate" : "Activate"}
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

export default function SupplierMasterPage() {
  return <AccessGate module="supplier">{(roleDef) => <SupplierList roleDef={roleDef} />}</AccessGate>;
}
