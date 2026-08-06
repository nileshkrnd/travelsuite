"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Building,
  Building2,
  Hotel,
  MoreHorizontal,
  Search,
  Star,
  Sparkles,
  LayoutGrid,
  Rows3,
} from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SortableTableHead, type SortDirection } from "@/components/shared/SortableTableHead";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
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
import { listCompanies } from "@/lib/services/db-companies.service";
import { listPropertyTypes } from "@/lib/services/property-types.service";
import {
  listProperties,
  setPropertyActive,
  deleteProperty,
  PropertiesApiError,
} from "@/lib/services/properties.service";
import { can } from "@/config/permissions";
import { resolveSessionCompanyKey, shouldLockSessionCompany } from "@/lib/session-company";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import { cn } from "@/lib/utils";
import type { Property, PropertyType, RoleDef } from "@/types";

type StatusFilter = "all" | "active" | "inactive";
type ViewMode = "table" | "grid";
type SortKey = "name" | "code" | "rating" | "createdDtTm";
const ALL_TYPES = "all";
const ALL_COUNTRIES = "all";

function displayName(p: Property) {
  return p.propertyDisplayName || p.propertyName || p.propertyCode;
}

function PropertyList({ roleDef }: { roleDef: RoleDef }) {
  const { role } = useParams<{ role: string }>();
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const activeTenant = useTenantStore((s) => s.tenant);
  const [properties, setProperties] = useState<Property[]>([]);
  const [types, setTypes] = useState<PropertyType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>(ALL_TYPES);
  const [countryFilter, setCountryFilter] = useState<string>(ALL_COUNTRIES);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [sortKey, setSortKey] = useState<SortKey>("createdDtTm");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const scopeTenantId = platformMode ? 0 : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);

  const canEdit = can(roleDef, "property", "edit");
  const canCreate = can(roleDef, "property", "create");
  const canDelete = can(roleDef, "property", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  async function refresh() {
    if (scopeTenantId <= 0) {
      setProperties([]);
      setTypes([]);
      setLoading(false);
      setLoadError(platformMode ? "Select a tenant workspace to manage properties." : "Missing tenant scope.");
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const companyRows = await listCompanies({ tenantId: scopeTenantId, activeOnly: true });
      const scopedCompanies = companyRows.filter((c) => c.companyKey > 0);
      const { companyId: resolvedCompany } = shouldLockSessionCompany(user, scopedCompanies);
      const effectiveCompany =
        resolveSessionCompanyKey(user) ??
        resolvedCompany ??
        (scopedCompanies.length === 1 ? scopedCompanies[0]!.companyKey : null);

      if (!effectiveCompany) {
        setProperties([]);
        setTypes([]);
        setLoadError("Your user must be assigned to a company to manage properties.");
        return;
      }

      const [rows, typeRows] = await Promise.all([
        listProperties({ tenantId: scopeTenantId, companyId: effectiveCompany }),
        listPropertyTypes({ activeOnly: true }),
      ]);
      setProperties(rows);
      setTypes(typeRows);
    } catch (error) {
      setLoadError(error instanceof PropertiesApiError ? error.message : "Failed to load properties");
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeTenantId, user?.companyKey, user?.employeeCompanyKey]);

  const typeStats = useMemo(() => {
    return types.map((t) => {
      const count = properties.filter((p) => p.isActive && p.propertyTypeIds.includes(t.key)).length;
      const featured = properties.filter(
        (p) => p.isActive && p.isFeatured && p.propertyTypeIds.includes(t.key)
      ).length;
      return { ...t, count, featured };
    });
  }, [types, properties]);

  const countries = useMemo(() => {
    const names = new Set<string>();
    for (const p of properties) if (p.countryName) names.add(p.countryName);
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [properties]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection(key === "createdDtTm" || key === "rating" ? "desc" : "asc");
    }
  }

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = properties;
    if (typeFilter !== ALL_TYPES) {
      const typeId = Number(typeFilter);
      result = result.filter((p) => p.propertyTypeIds.includes(typeId));
    }
    if (countryFilter !== ALL_COUNTRIES) {
      result = result.filter((p) => p.countryName === countryFilter);
    }
    if (term) {
      result = result.filter(
        (p) =>
          p.propertyCode.toLowerCase().includes(term) ||
          (p.propertyName ?? "").toLowerCase().includes(term) ||
          (p.propertyDisplayName ?? "").toLowerCase().includes(term) ||
          p.propertyTypeNames.some((n) => n.toLowerCase().includes(term)) ||
          p.propertyCategoryNames.some((n) => n.toLowerCase().includes(term)) ||
          (p.propertyBrandName ?? "").toLowerCase().includes(term) ||
          (p.cityName ?? "").toLowerCase().includes(term) ||
          (p.countryName ?? "").toLowerCase().includes(term) ||
          (p.addressLine1 ?? "").toLowerCase().includes(term)
      );
    }
    if (statusFilter === "active") result = result.filter((p) => p.isActive);
    if (statusFilter === "inactive") result = result.filter((p) => !p.isActive);

    const sorted = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = displayName(a).localeCompare(displayName(b));
      else if (sortKey === "code") cmp = a.propertyCode.localeCompare(b.propertyCode);
      else if (sortKey === "rating") cmp = (a.rating ?? -1) - (b.rating ?? -1);
      else cmp = new Date(a.createdDtTm).getTime() - new Date(b.createdDtTm).getTime();
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [properties, search, typeFilter, countryFilter, statusFilter, sortKey, sortDirection]);

  async function toggleActive(row: Property) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setPropertyActive(row.propertyId, !row.isActive, userKey);
      await refresh();
      toast.success(row.isActive ? "Property deactivated" : "Property activated");
    } catch (error) {
      toast.error(error instanceof PropertiesApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: Property) {
    try {
      await deleteProperty(row.propertyId);
      await refresh();
      toast.success("Property deleted");
    } catch (error) {
      toast.error(error instanceof PropertiesApiError ? error.message : "Could not delete property");
    }
  }

  function RowActions({ row }: { row: Property }) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem nativeButton={false} render={<Link href={`/${role}/masters/property/${row.propertyId}`} />}>
            View details
          </DropdownMenuItem>
          {canEdit && (
            <>
              <DropdownMenuItem
                nativeButton={false}
                render={<Link href={`/${role}/masters/property/${row.propertyId}/edit`} />}
              >
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
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Property"
        description="Browse inventory by type, then open a property for full details or modify."
        actions={
          canCreate && scopeTenantId > 0 ? (
            <Button nativeButton={false} render={<Link href={`/${role}/masters/property/new`} />}>
              <Plus className="h-4 w-4" />
              Add property
            </Button>
          ) : undefined
        }
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading properties…</p>}

      {!loading && scopeTenantId > 0 && types.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight">By property type</h2>
              <p className="text-sm text-muted-foreground">
                Select a type to filter the inventory list below.
              </p>
            </div>
            {typeFilter !== ALL_TYPES && (
              <Button variant="outline" size="sm" onClick={() => setTypeFilter(ALL_TYPES)}>
                Clear filter
              </Button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <button
              type="button"
              onClick={() => setTypeFilter(ALL_TYPES)}
              className={cn(
                "rounded-xl border p-4 text-start transition-colors",
                typeFilter === ALL_TYPES
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border bg-card hover:bg-muted/40"
              )}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Building2 className="h-5 w-5 text-foreground" />
              </div>
              <p className="font-medium">All properties</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {properties.filter((p) => p.isActive).length}
              </p>
              <p className="text-xs text-muted-foreground">Active inventory</p>
            </button>
            {typeStats.map((t) => {
              const selected = typeFilter === String(t.key);
              const Icon = /hotel/i.test(t.name) ? Hotel : Building;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTypeFilter(String(t.key))}
                  className={cn(
                    "rounded-xl border p-4 text-start transition-colors",
                    selected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border bg-card hover:bg-muted/40"
                  )}
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-5 w-5 text-foreground" />
                  </div>
                  <p className="font-medium">{t.name}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{t.count}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.featured > 0 ? `${t.featured} featured` : "No featured yet"}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Inventory</h2>
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading…" : `Showing ${visible.length} of ${properties.length} properties`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, code, city, brand…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9"
              />
            </div>
            {countries.length > 1 && (
              <Select value={countryFilter} onValueChange={(v) => setCountryFilter(v ?? ALL_COUNTRIES)}>
                <SelectTrigger className="w-40">
                  <SelectValue>
                    {(value: string | null) => (!value || value === ALL_COUNTRIES ? "All countries" : value)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_COUNTRIES}>All countries</SelectItem>
                  {countries.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter((value as StatusFilter) ?? "all")}
            >
              <SelectTrigger className="w-36">
                <SelectValue>
                  {(value: string | null) => {
                    if (value === "active") return "Active";
                    if (value === "inactive") return "Inactive";
                    return "All statuses";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <div className="inline-flex rounded-lg border border-border p-0.5">
              <Button
                type="button"
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => setViewMode("table")}
                aria-label="Table view"
              >
                <Rows3 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {!loading && properties.length === 0 && scopeTenantId > 0 ? (
          <EmptyState
            icon={Building}
            tone="primary"
            heading="No properties yet"
            description="Add your first hotel or property for this company."
            size="compact"
            action={
              canCreate ? (
                <Button nativeButton={false} render={<Link href={`/${role}/masters/property/new`} />}>
                  <Plus className="h-4 w-4" />
                  Add property
                </Button>
              ) : undefined
            }
          />
        ) : visible.length === 0 && !loading && scopeTenantId > 0 ? (
          <EmptyState
            icon={Search}
            tone="muted"
            heading="No matching properties"
            description="Try a different search, type card, or status filter."
            size="compact"
          />
        ) : viewMode === "table" ? (
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">Sr.</TableHead>
                    <SortableTableHead sortKey="name" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                      Property
                    </SortableTableHead>
                    <SortableTableHead sortKey="code" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                      Code
                    </SortableTableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Category</TableHead>
                    <SortableTableHead sortKey="rating" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                      Rating
                    </SortableTableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-14 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((row, index) => (
                    <TableRow key={row.propertyId}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="max-w-64">
                        <Link
                          href={`/${role}/masters/property/${row.propertyId}`}
                          className="font-medium hover:underline"
                        >
                          {displayName(row)}
                        </Link>
                        {row.isFeatured && (
                          <span className="ms-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Sparkles className="h-3 w-3" />
                            Featured
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{row.propertyCode}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {row.propertyTypeNames.slice(0, 2).map((name) => (
                            <Badge key={name} variant="secondary" className="whitespace-nowrap">
                              {name}
                            </Badge>
                          ))}
                          {row.propertyTypeNames.length > 2 && (
                            <Badge variant="secondary">+{row.propertyTypeNames.length - 2}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {[row.cityName, row.countryName].filter(Boolean).join(", ") || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.propertyCategoryNames.join(", ") || "—"}
                      </TableCell>
                      <TableCell>
                        {row.rating != null ? (
                          <span className="inline-flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            {row.rating.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.isActive ? "default" : "secondary"}>
                          {row.isActive ? "active" : "inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <RowActions row={row} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((row) => (
              <Card key={row.propertyId} className="overflow-hidden p-0">
                <Link
                  href={`/${role}/masters/property/${row.propertyId}`}
                  className="flex h-28 items-end bg-gradient-to-br from-[#001C35] via-[#0a3558] to-[#1a5a7a] p-4 text-white"
                >
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold">{displayName(row)}</p>
                    <p className="truncate text-sm text-white/75">
                      {row.propertyCode}
                      {row.cityName ? ` · ${row.cityName}` : ""}
                    </p>
                  </div>
                </Link>
                <div className="space-y-3 p-4">
                  {row.shortDescription && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{row.shortDescription}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {row.propertyTypeNames.map((name) => (
                      <Badge key={name} variant="secondary">
                        {name}
                      </Badge>
                    ))}
                    {row.propertyCategoryNames.map((name) => (
                      <Badge key={name} variant="outline">
                        {name}
                      </Badge>
                    ))}
                    {row.propertyBrandName && <Badge variant="outline">{row.propertyBrandName}</Badge>}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {row.starRating != null && (
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          {row.starRating}
                        </span>
                      )}
                      {row.rating != null && <span>{row.rating.toFixed(2)}</span>}
                      {row.isFeatured && (
                        <span className="inline-flex items-center gap-1 text-foreground">
                          <Sparkles className="h-3.5 w-3.5" />
                          Featured
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant={row.isActive ? "default" : "secondary"}>
                        {row.isActive ? "active" : "inactive"}
                      </Badge>
                      <RowActions row={row} />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function PropertyMasterPage() {
  return <AccessGate module="property">{(roleDef) => <PropertyList roleDef={roleDef} />}</AccessGate>;
}
