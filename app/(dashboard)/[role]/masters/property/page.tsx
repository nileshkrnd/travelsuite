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
} from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card } from "@/components/ui/card";
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
const ALL_TYPES = "all";

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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

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
        listPropertyTypes({ tenantId: scopeTenantId, companyId: effectiveCompany, activeOnly: true }),
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
      const count = properties.filter(
        (p) => p.isActive && p.propertyTypeIds.includes(t.propertyTypeId)
      ).length;
      const featured = properties.filter(
        (p) => p.isActive && p.isFeatured && p.propertyTypeIds.includes(t.propertyTypeId)
      ).length;
      return { ...t, count, featured };
    });
  }, [types, properties]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = properties;
    if (typeFilter !== ALL_TYPES) {
      const typeId = Number(typeFilter);
      result = result.filter((p) => p.propertyTypeIds.includes(typeId));
    }
    if (term) {
      result = result.filter(
        (p) =>
          p.propertyCode.toLowerCase().includes(term) ||
          (p.propertyName ?? "").toLowerCase().includes(term) ||
          (p.propertyDisplayName ?? "").toLowerCase().includes(term) ||
          p.propertyTypeNames.some((n) => n.toLowerCase().includes(term)) ||
          (p.propertyBrandName ?? "").toLowerCase().includes(term) ||
          (p.cityName ?? "").toLowerCase().includes(term)
      );
    }
    if (statusFilter === "active") result = result.filter((p) => p.isActive);
    if (statusFilter === "inactive") result = result.filter((p) => !p.isActive);
    return [...result].sort(
      (a, b) => new Date(b.createdDtTm).getTime() - new Date(a.createdDtTm).getTime()
    );
  }, [properties, search, typeFilter, statusFilter]);

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
              const selected = typeFilter === String(t.propertyTypeId);
              const Icon = /hotel/i.test(t.propertyTypeName) ? Hotel : Building;
              return (
                <button
                  key={t.propertyTypeId}
                  type="button"
                  onClick={() => setTypeFilter(String(t.propertyTypeId))}
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
                  <p className="font-medium">{t.propertyTypeName}</p>
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Latest properties</h2>
            <p className="text-sm text-muted-foreground">Newest first — open any card for full details.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, code, city, brand…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter((value as StatusFilter) ?? "all")}
            >
              <SelectTrigger className="w-40">
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
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            nativeButton={false}
                            render={<Link href={`/${role}/masters/property/${row.propertyId}`} />}
                          >
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
                          {canDelete && (
                            <DropdownMenuItem onClick={() => void removeRow(row)}>Delete</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
