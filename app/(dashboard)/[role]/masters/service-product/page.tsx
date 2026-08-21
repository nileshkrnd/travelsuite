"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Plus,
  Package,
  MoreHorizontal,
  Search,
  Star,
  Car,
  Ship,
  TrainFront,
  ShieldCheck,
  Compass,
  Sparkles,
  Binoculars,
  Plane,
  Building2,
  FileCheck,
  UserRound,
  UtensilsCrossed,
  Ticket as TicketIcon,
  type LucideIcon,
} from "lucide-react";
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
import { useTenantStore, isPlatformMode } from "@/lib/store/tenant.store";
import { useUsersStore } from "@/lib/store/users.store";
import { listServiceTypes, ServiceTypesApiError } from "@/lib/services/service-types.service";
import {
  listServiceProducts,
  setServiceProductActive,
  deleteServiceProduct,
  ServiceProductsApiError,
} from "@/lib/services/service-products.service";
import { can } from "@/config/permissions";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import type { RoleDef, ServiceProduct, ServiceType } from "@/types";

type SortKey = "serviceProductName" | "serviceProductCode" | "displayOrder";
type StatusFilter = "all" | "active" | "inactive";

const SERVICE_TYPE_ICONS: { match: RegExp; icon: LucideIcon }[] = [
  { match: /transfer|car hire|rail/i, icon: Car },
  { match: /cruise/i, icon: Ship },
  { match: /rail/i, icon: TrainFront },
  { match: /insurance|visa/i, icon: ShieldCheck },
  { match: /tour guide/i, icon: UserRound },
  { match: /tour/i, icon: Compass },
  { match: /activity/i, icon: Sparkles },
  { match: /sightseeing/i, icon: Binoculars },
  { match: /flight/i, icon: Plane },
  { match: /hotel/i, icon: Building2 },
  { match: /visa/i, icon: FileCheck },
  { match: /restaurant/i, icon: UtensilsCrossed },
  { match: /ticket/i, icon: TicketIcon },
];

function iconForServiceType(name: string): LucideIcon {
  return SERVICE_TYPE_ICONS.find((entry) => entry.match.test(name))?.icon ?? Package;
}

function ProductList({ roleDef }: { roleDef: RoleDef }) {
  const { role } = useParams<{ role: string }>();
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const activeTenant = useTenantStore((s) => s.tenant);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [typeCounts, setTypeCounts] = useState<Map<number, number>>(new Map());
  const [rows, setRows] = useState<ServiceProduct[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [serviceTypeFilter, setServiceTypeFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>("displayOrder");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const scopeTenantId = platformMode ? 0 : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);

  const canEdit = can(roleDef, "serviceProduct", "edit");
  const canCreate = can(roleDef, "serviceProduct", "create");
  const canDelete = can(roleDef, "serviceProduct", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  const selectedServiceType = serviceTypes.find((t) => t.serviceTypeId === serviceTypeFilter);

  async function loadServiceTypes() {
    if (scopeTenantId <= 0) {
      setServiceTypes([]);
      setLoadingTypes(false);
      setLoadError(platformMode ? "Select a tenant workspace to manage products." : "Missing tenant scope.");
      return;
    }
    setLoadingTypes(true);
    setLoadError(null);
    try {
      const [typeRows, allProducts] = await Promise.all([
        listServiceTypes({ tenantId: scopeTenantId, activeOnly: true }),
        listServiceProducts({ tenantId: scopeTenantId }),
      ]);
      setServiceTypes(typeRows);
      const counts = new Map<number, number>();
      for (const p of allProducts) {
        counts.set(p.serviceTypeId, (counts.get(p.serviceTypeId) ?? 0) + 1);
      }
      setTypeCounts(counts);
      setServiceTypeFilter((current) => {
        if (current && typeRows.some((t) => t.serviceTypeId === current)) return current;
        const withData = typeRows.find((t) => (counts.get(t.serviceTypeId) ?? 0) > 0);
        return withData?.serviceTypeId ?? typeRows[0]?.serviceTypeId ?? null;
      });
    } catch (error) {
      setLoadError(error instanceof ServiceTypesApiError ? error.message : "Failed to load service types");
      setServiceTypes([]);
    } finally {
      setLoadingTypes(false);
    }
  }

  useEffect(() => {
    void loadServiceTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeTenantId]);

  async function refreshRows() {
    if (!serviceTypeFilter || scopeTenantId <= 0) {
      setRows([]);
      return;
    }
    setLoadingRows(true);
    try {
      const productRows = await listServiceProducts({ tenantId: scopeTenantId, serviceTypeId: serviceTypeFilter });
      setRows(productRows);
      setTypeCounts((prev) => {
        const next = new Map(prev);
        next.set(serviceTypeFilter, productRows.length);
        return next;
      });
    } catch (error) {
      toast.error(error instanceof ServiceProductsApiError ? error.message : "Failed to load products");
      setRows([]);
    } finally {
      setLoadingRows(false);
    }
  }

  useEffect(() => {
    void refreshRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceTypeFilter, scopeTenantId]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = rows;
    if (term) {
      result = result.filter(
        (r) => r.serviceProductName.toLowerCase().includes(term) || r.serviceProductCode.toLowerCase().includes(term)
      );
    }
    if (statusFilter === "active") result = result.filter((r) => r.isActive);
    if (statusFilter === "inactive") result = result.filter((r) => !r.isActive);
    if (sortKey) {
      result = [...result].sort((a, b) => {
        if (sortKey === "displayOrder") {
          return sortDirection === "asc" ? a.displayOrder - b.displayOrder : b.displayOrder - a.displayOrder;
        }
        const cmp = String(a[sortKey]).localeCompare(String(b[sortKey]));
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [rows, search, statusFilter, sortKey, sortDirection]);

  async function toggleActive(row: ServiceProduct) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setServiceProductActive(row.serviceProductId, !row.isActive, userKey);
      await refreshRows();
      toast.success(row.isActive ? "Product deactivated" : "Product activated");
    } catch (error) {
      toast.error(error instanceof ServiceProductsApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: ServiceProduct) {
    try {
      await deleteServiceProduct(row.serviceProductId);
      await refreshRows();
      toast.success("Product deleted");
    } catch (error) {
      toast.error(error instanceof ServiceProductsApiError ? error.message : "Could not delete product");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Service Product"
        description="The sellable product catalog — browse by service type, then open a product for full details or modify."
        actions={
          canCreate && (platformMode || scopeTenantId > 0) ? (
            <Button nativeButton={false} render={<Link href={`/${role}/masters/service-product/new`} />}>
              <Plus className="h-4 w-4" />
              Add product
            </Button>
          ) : undefined
        }
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loadingTypes && <p className="text-sm text-muted-foreground">Loading service types…</p>}
      {!loadingTypes && scopeTenantId > 0 && serviceTypes.length === 0 && (
        <EmptyState icon={Package} tone="muted" heading="No service types yet" description="Create a service type first under Admin → Product → Service Type." size="compact" />
      )}

      {!loadingTypes && serviceTypes.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {serviceTypes.map((t) => {
            const Icon = iconForServiceType(t.serviceTypeName);
            const count = typeCounts.get(t.serviceTypeId) ?? 0;
            const isSelected = t.serviceTypeId === serviceTypeFilter;
            return (
              <button
                key={t.serviceTypeId}
                type="button"
                onClick={() => setServiceTypeFilter(t.serviceTypeId)}
                className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    isSelected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.serviceTypeName}</p>
                  <p className="text-xl font-semibold tabular-nums">
                    {count}
                    <span className="ms-1 text-xs font-normal text-muted-foreground">{count === 1 ? "product" : "products"}</span>
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedServiceType && rows.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search code or name…" value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
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

      {selectedServiceType && (
        <Card>
          {loadingRows ? (
            <p className="p-6 text-sm text-muted-foreground">Loading products…</p>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Package}
              tone="primary"
              heading="No products yet"
              description={`Add your first product under ${selectedServiceType.serviceTypeName}.`}
              size="compact"
              action={
                canCreate ? (
                  <Button nativeButton={false} render={<Link href={`/${role}/masters/service-product/new`} />}>
                    <Plus className="h-4 w-4" />
                    Add product
                  </Button>
                ) : undefined
              }
            />
          ) : visible.length === 0 ? (
            <EmptyState icon={Search} tone="muted" heading="No matching products" description="Try a different search or status filter." size="compact" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead sortKey="serviceProductCode" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                    Code
                  </SortableTableHead>
                  <SortableTableHead sortKey="serviceProductName" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                    Name
                  </SortableTableHead>
                  <TableHead>Classification</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => (
                  <TableRow key={row.serviceProductId}>
                    <TableCell className="font-mono text-xs font-medium">
                      <Link href={`/${role}/masters/service-product/${row.serviceProductId}`} className="hover:underline">
                        {row.serviceProductCode}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/${role}/masters/service-product/${row.serviceProductId}`} className="flex items-center gap-1.5 hover:underline">
                        {row.isFeatured && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                        {row.serviceProductName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.classificationName ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{row.supplierName ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.statusName ?? "—"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "active" : "inactive"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem nativeButton={false} render={<Link href={`/${role}/masters/service-product/${row.serviceProductId}`} />}>
                            View details
                          </DropdownMenuItem>
                          {canEdit && (
                            <>
                              <DropdownMenuItem nativeButton={false} render={<Link href={`/${role}/masters/service-product/${row.serviceProductId}/edit`} />}>
                                Modify
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => void toggleActive(row)}>
                                {row.isActive ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                            </>
                          )}
                          {canDelete && <DropdownMenuItem onClick={() => void removeRow(row)}>Delete</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}

export default function ServiceProductMasterPage() {
  return <AccessGate module="serviceProduct">{(roleDef) => <ProductList roleDef={roleDef} />}</AccessGate>;
}
