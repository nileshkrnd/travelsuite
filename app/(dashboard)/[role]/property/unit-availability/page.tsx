"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Building2, Layers, LayoutGrid, Loader2 } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SearchableCombobox } from "@/components/shared/SearchableCombobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore, isPlatformMode } from "@/lib/store/tenant.store";
import { useUsersStore } from "@/lib/store/users.store";
import { listCompanies } from "@/lib/services/db-companies.service";
import { listProperties, PropertiesApiError } from "@/lib/services/properties.service";
import { listPropertyFloors, PropertyFloorsApiError } from "@/lib/services/property-floors.service";
import {
  listPropertyUnits,
  updateUnitOccupancy,
  PropertyUnitsApiError,
} from "@/lib/services/property-units.service";
import { listPropertyTenants, PropertyTenantsApiError } from "@/lib/services/property-tenants.service";
import { resolveSessionCompanyKey, shouldLockSessionCompany } from "@/lib/session-company";
import { can } from "@/config/permissions";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import { cn } from "@/lib/utils";
import type { Property, PropertyFloor, PropertyTenant, PropertyUnit, RoleDef } from "@/types";

const CANONICAL_STATUSES = [
  "AVAILABLE",
  "OCCUPIED",
  "RESERVED",
  "MAINTENANCE",
  "BLOCKED",
  "UNDER_RENOVATION",
  "SOLD",
  "INACTIVE",
] as const;

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Available",
  OCCUPIED: "Occupied",
  RESERVED: "Reserved",
  MAINTENANCE: "Maintenance",
  BLOCKED: "Blocked",
  UNDER_RENOVATION: "Under renovation",
  SOLD: "Sold",
  INACTIVE: "Inactive",
};

const STATUS_TILE: Record<string, string> = {
  AVAILABLE:
    "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
  OCCUPIED: "border-primary/25 bg-primary/10 text-primary",
  RESERVED:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
  MAINTENANCE:
    "border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-800 dark:bg-orange-950/50 dark:text-orange-200",
  BLOCKED: "border-destructive/30 bg-destructive/10 text-destructive",
  UNDER_RENOVATION:
    "border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-800 dark:bg-orange-950/50 dark:text-orange-200",
  SOLD: "border-border bg-muted text-muted-foreground",
  INACTIVE: "border-border bg-muted/40 text-muted-foreground/80 opacity-70",
};

const STATUS_SWATCH: Record<string, string> = {
  AVAILABLE: "bg-emerald-500",
  OCCUPIED: "bg-primary",
  RESERVED: "bg-amber-500",
  MAINTENANCE: "bg-orange-500",
  BLOCKED: "bg-destructive",
  UNDER_RENOVATION: "bg-orange-500",
  SOLD: "bg-muted-foreground/50",
  INACTIVE: "bg-muted-foreground/30",
};

function statusCodeOf(unit: PropertyUnit): string {
  const code = (unit.unitStatusCode ?? "").trim().toUpperCase();
  if (code) return code;
  if (!unit.isActive) return "INACTIVE";
  return "UNKNOWN";
}

function statusLabel(code: string, name?: string | null): string {
  if (name?.trim()) return name.trim();
  return STATUS_LABELS[code] ?? titleCase(code);
}

function titleCase(code: string): string {
  if (!code || code === "UNKNOWN") return "Unknown";
  return code
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function tileClass(code: string): string {
  return STATUS_TILE[code] ?? "border-border bg-card text-foreground";
}

function swatchClass(code: string): string {
  return STATUS_SWATCH[code] ?? "bg-muted-foreground";
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function compareUnits(a: PropertyUnit, b: PropertyUnit): number {
  return a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true, sensitivity: "base" });
}

function UnitAvailabilityBoard({ roleDef }: { roleDef: RoleDef }) {
  const { role } = useParams<{ role: string }>();
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const activeTenant = useTenantStore((s) => s.tenant);
  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const scopeTenantId = platformMode ? 0 : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);
  const actorKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;
  const canWrite = can(roleDef, "unitAvailability", "edit") || can(roleDef, "propertyUnit", "edit");

  const [properties, setProperties] = useState<Property[]>([]);
  const [floors, setFloors] = useState<PropertyFloor[]>([]);
  const [units, setUnits] = useState<PropertyUnit[]>([]);
  const [tenants, setTenants] = useState<PropertyTenant[]>([]);
  const [propertyId, setPropertyId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const roleSlug = typeof role === "string" ? role : roleDef.slug;
  const floorsHref = `/${roleSlug}/masters/property-floor`;
  const unitsHref = `/${roleSlug}/masters/unit`;
  const tenantsHref = `/${roleSlug}/masters/propertyTenant`;

  useEffect(() => {
    let cancelled = false;
    async function loadLookups() {
      setLoading(true);
      setLoadError(null);
      try {
        let propertyRows: Property[] = [];
        if (platformMode) {
          propertyRows = await listProperties({ global: true, activeOnly: true });
        } else if (scopeTenantId > 0) {
          const companyRows = await listCompanies({ tenantId: scopeTenantId, activeOnly: true });
          const scopedCompanies = companyRows.filter((c) => c.companyKey > 0);
          const { companyId: resolvedCompany } = shouldLockSessionCompany(user, scopedCompanies);
          const effectiveCompany =
            resolveSessionCompanyKey(user) ??
            resolvedCompany ??
            (scopedCompanies.length === 1 ? scopedCompanies[0]!.companyKey : null);
          if (effectiveCompany) {
            propertyRows = await listProperties({
              tenantId: scopeTenantId,
              companyId: effectiveCompany,
              includeGlobal: true,
              activeOnly: true,
            });
          }
        }
        if (cancelled) return;
        setProperties(propertyRows);
        try {
          const tenantRows =
            scopeTenantId > 0
              ? await listPropertyTenants({ tenantId: scopeTenantId, activeOnly: true })
              : await listPropertyTenants({ activeOnly: true });
          if (!cancelled) setTenants(tenantRows);
        } catch (error) {
          if (!cancelled) {
            setLoadError(error instanceof PropertyTenantsApiError ? error.message : "Failed to load tenants");
          }
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof PropertiesApiError ? error.message : "Failed to load properties");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadLookups();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeTenantId, platformMode, user?.companyKey, user?.employeeCompanyKey]);

  useEffect(() => {
    if (propertyId == null) {
      setFloors([]);
      setUnits([]);
      setStatusFilter("ALL");
      return;
    }
    let cancelled = false;
    setLoadingBoard(true);
    setLoadError(null);
    Promise.all([listPropertyFloors({ propertyId }), listPropertyUnits({ propertyId })])
      .then(([floorRows, unitRows]) => {
        if (cancelled) return;
        setFloors(floorRows);
        setUnits(unitRows);
        setStatusFilter("ALL");
      })
      .catch((error) => {
        if (cancelled) return;
        const message =
          error instanceof PropertyFloorsApiError || error instanceof PropertyUnitsApiError
            ? error.message
            : "Failed to load floors and units";
        setLoadError(message);
        setFloors([]);
        setUnits([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingBoard(false);
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const unit of units) {
      const code = statusCodeOf(unit);
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }
    return counts;
  }, [units]);

  const statusOrder = useMemo(() => {
    const extra = [...statusCounts.keys()].filter((code) => !CANONICAL_STATUSES.includes(code as (typeof CANONICAL_STATUSES)[number]));
    extra.sort();
    return [...CANONICAL_STATUSES, ...extra];
  }, [statusCounts]);

  const stackedFloors = useMemo(() => {
    const ordered = [...floors].sort((a, b) => {
      if (b.floorNumber !== a.floorNumber) return b.floorNumber - a.floorNumber;
      return a.displayOrder - b.displayOrder;
    });
    const byFloor = new Map<number, PropertyUnit[]>();
    const assigned = new Set<number>();
    for (const unit of units) {
      const list = byFloor.get(unit.propertyFloorId) ?? [];
      list.push(unit);
      byFloor.set(unit.propertyFloorId, list);
    }
    const bands = ordered.map((floor) => {
      const floorUnits = (byFloor.get(floor.propertyFloorId) ?? []).slice().sort(compareUnits);
      assigned.add(floor.propertyFloorId);
      return { floor, units: floorUnits };
    });
    const orphans: PropertyUnit[] = [];
    for (const [floorId, floorUnits] of byFloor) {
      if (!assigned.has(floorId)) orphans.push(...floorUnits);
    }
    orphans.sort(compareUnits);
    return { bands, orphans };
  }, [floors, units]);

  const unitsByStatusName = useMemo(() => {
    const names = new Map<string, string>();
    for (const unit of units) {
      const code = statusCodeOf(unit);
      if (!names.has(code)) names.set(code, statusLabel(code, unit.unitStatusName));
    }
    return names;
  }, [units]);

  function filterUnits(list: PropertyUnit[]): PropertyUnit[] {
    if (statusFilter === "ALL") return list;
    return list.filter((unit) => statusCodeOf(unit) === statusFilter);
  }

  function handleUnitUpdated(updated: PropertyUnit) {
    const unitId = Number(updated.unitId);
    setUnits((prev) => prev.map((unit) => (unit.unitId === unitId ? { ...unit, ...updated, unitId } : unit)));
    if (propertyId != null) {
      void listPropertyUnits({ propertyId })
        .then(setUnits)
        .catch(() => {});
    }
  }

  const occupancyProps = {
    tenants,
    tenantsHref,
    actorKey,
    canWrite,
    onUnitUpdated: handleUnitUpdated,
  };

  return (
    <div className="flex min-w-0 flex-col gap-4 p-6">
      <PageHeader
        title="Unit Availability"
        description="Building stack of every unit by floor and status. Allocate a tenant or block a unit from the tile."
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </p>
      )}

      <div className="w-full max-w-xl space-y-2">
        <Label required>Property</Label>
        <SearchableCombobox
          value={propertyId}
          onChange={setPropertyId}
          placeholder="Select property…"
          options={properties.map((p) => ({
            value: p.propertyId,
            label: p.propertyDisplayName || p.propertyName || p.propertyCode,
            sublabel: p.propertyCode,
          }))}
        />
      </div>

      {propertyId == null ? (
        <EmptyState
          icon={Building2}
          tone="muted"
          heading="Select a property"
          description="Choose a building to see floors stacked from the top down, with units color-coded by status."
          size="compact"
        />
      ) : loadingBoard ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading floors and units…
        </p>
      ) : floors.length === 0 ? (
        <EmptyState
          icon={Layers}
          tone="muted"
          heading="No floors yet"
          description="Add floors for this property first, then return here to see the building stack."
          size="compact"
          action={
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href={floorsHref} />}>
              Go to Floors
            </Button>
          }
        />
      ) : units.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          tone="muted"
          heading="No units yet"
          description="Floors are ready. Add units to see availability tiles on each floor."
          size="compact"
          action={
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href={unitsHref} />}>
              Go to Units
            </Button>
          }
        />
      ) : (
        <div className="flex min-w-0 flex-col gap-4">
          <Card size="sm">
            <CardContent className="flex flex-wrap gap-x-6 gap-y-3">
              <SummaryStat label="Total units" value={units.length} />
              {statusOrder.map((code) => {
                const count = statusCounts.get(code) ?? 0;
                if (count === 0 && !CANONICAL_STATUSES.includes(code as (typeof CANONICAL_STATUSES)[number])) return null;
                return (
                  <SummaryStat
                    key={code}
                    label={unitsByStatusName.get(code) ?? statusLabel(code)}
                    value={count}
                    swatch={swatchClass(code)}
                  />
                );
              })}
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Legend</p>
            {statusOrder.map((code) => {
              const count = statusCounts.get(code) ?? 0;
              if (count === 0 && !CANONICAL_STATUSES.includes(code as (typeof CANONICAL_STATUSES)[number])) return null;
              return (
                <span key={code} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={cn("h-2.5 w-2.5 rounded-sm", swatchClass(code))} />
                  {unitsByStatusName.get(code) ?? statusLabel(code)}
                </span>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <FilterChip
              active={statusFilter === "ALL"}
              label="All"
              count={units.length}
              onClick={() => setStatusFilter("ALL")}
            />
            {statusOrder.map((code) => {
              const count = statusCounts.get(code) ?? 0;
              if (count === 0) return null;
              return (
                <FilterChip
                  key={code}
                  active={statusFilter === code}
                  label={unitsByStatusName.get(code) ?? statusLabel(code)}
                  count={count}
                  onClick={() => setStatusFilter(code)}
                />
              );
            })}
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            {stackedFloors.bands.map(({ floor, units: floorUnits }) => {
              const visible = filterUnits(floorUnits);
              if (statusFilter !== "ALL" && visible.length === 0) return null;
              return (
                <FloorBand
                  key={floor.propertyFloorId}
                  floor={floor}
                  allUnits={floorUnits}
                  units={visible}
                  unitsHref={unitsHref}
                  {...occupancyProps}
                />
              );
            })}
            {stackedFloors.orphans.length > 0 && filterUnits(stackedFloors.orphans).length > 0 && (
              <FloorBand
                floor={{
                  floorName: "Unassigned",
                  floorCode: "—",
                  floorTypeName: "No floor",
                }}
                allUnits={stackedFloors.orphans}
                units={filterUnits(stackedFloors.orphans)}
                unitsHref={unitsHref}
                {...occupancyProps}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryStat({ label, value, swatch }: { label: string; value: number; swatch?: string }) {
  return (
    <div className="min-w-[5.5rem]">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="flex items-center gap-1.5 text-xl font-semibold tabular-nums tracking-tight">
        {swatch ? <span className={cn("h-2 w-2 rounded-sm", swatch)} /> : null}
        {value}
      </p>
    </div>
  );
}

function FilterChip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <Button type="button" size="sm" variant={active ? "default" : "outline"} onClick={onClick}>
      {label}
      <span className="tabular-nums opacity-80">{count}</span>
    </Button>
  );
}

function FloorBand({
  floor,
  allUnits,
  units,
  unitsHref,
  tenants,
  tenantsHref,
  actorKey,
  canWrite,
  onUnitUpdated,
}: {
  floor: Pick<PropertyFloor, "floorName" | "floorCode"> & { floorTypeName?: string | null };
  allUnits: PropertyUnit[];
  units: PropertyUnit[];
  unitsHref: string;
  tenants: PropertyTenant[];
  tenantsHref: string;
  actorKey: number;
  canWrite: boolean;
  onUnitUpdated: (unit: PropertyUnit) => void;
}) {
  const totalOnFloor = allUnits.length;
  const available = allUnits.filter((u) => statusCodeOf(u) === "AVAILABLE").length;
  const occupied = allUnits.filter((u) => statusCodeOf(u) === "OCCUPIED").length;
  const counts = `${totalOnFloor} unit${totalOnFloor === 1 ? "" : "s"} · ${available} available · ${occupied} occupied`;

  return (
    <Card size="sm" className="min-w-0">
      <CardHeader className="border-b pb-3">
        <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <CardTitle className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="truncate">{floor.floorName}</span>
            <span className="font-normal text-muted-foreground">{floor.floorCode}</span>
            {floor.floorTypeName ? (
              <Badge variant="outline" className="font-normal">
                {floor.floorTypeName}
              </Badge>
            ) : null}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{counts}</p>
        </div>
      </CardHeader>
      <CardContent>
        {units.length === 0 ? (
          <p className="text-sm text-muted-foreground">No units on this floor.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {units.map((unit) => (
              <UnitTile
                key={unit.unitId}
                unit={unit}
                unitsHref={unitsHref}
                tenants={tenants}
                tenantsHref={tenantsHref}
                actorKey={actorKey}
                canWrite={canWrite}
                onUnitUpdated={onUnitUpdated}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function UnitTile({
  unit,
  unitsHref,
  tenants,
  tenantsHref,
  actorKey,
  canWrite,
  onUnitUpdated,
}: {
  unit: PropertyUnit;
  unitsHref: string;
  tenants: PropertyTenant[];
  tenantsHref: string;
  actorKey: number;
  canWrite: boolean;
  onUnitUpdated: (unit: PropertyUnit) => void;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [dialog, setDialog] = useState<"allocate" | "block" | "vacate" | null>(null);
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState<number | null>(unit.currentTenantId ?? null);
  const [allocatedFrom, setAllocatedFrom] = useState(unit.allocatedFrom || todayIso());
  const [blockReason, setBlockReason] = useState(unit.blockReason ?? "");

  const code = statusCodeOf(unit);
  const label = statusLabel(code, unit.unitStatusName);
  const typeLine = [unit.unitTypeName, unit.unitCategoryName].filter(Boolean).join(" · ");
  const tenantName = unit.currentTenantName;
  const isSold = code === "SOLD" || code === "INACTIVE";
  const isBlocked = code === "BLOCKED";
  const hasTenant = !!unit.currentTenantId;

  async function runOccupancy(
    action: "allocate" | "vacate" | "block" | "unblock",
    extra?: { propertyTenantId?: number; allocatedFrom?: string; notes?: string | null }
  ) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateUnitOccupancy(unit.unitId, {
        action,
        modifiedBy: actorKey,
        ...extra,
      });
      onUnitUpdated(updated);
      setPopoverOpen(false);
      setDialog(null);
      toast.success(
        action === "allocate"
          ? "Tenant allocated"
          : action === "vacate"
            ? "Tenant vacated"
            : action === "block"
              ? "Unit blocked"
              : "Unit unblocked"
      );
    } catch (error) {
      toast.error(error instanceof PropertyUnitsApiError ? error.message : "Could not update unit");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={(open) => { if (!dialog) setPopoverOpen(open); }}>
        <PopoverTrigger
          className={cn(
            "flex h-[4.25rem] w-[6.5rem] min-w-0 flex-col items-start justify-center rounded-md border px-1.5 py-1 text-left transition-colors hover:ring-2 hover:ring-ring/40 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
            tileClass(code)
          )}
        >
          <span className="w-full truncate text-xs font-semibold leading-tight">{unit.unitNumber || unit.unitCode}</span>
          <span className="w-full truncate text-[10px] leading-tight opacity-90">{unit.unitName || unit.unitCode}</span>
          {tenantName ? (
            <span className="w-full truncate text-[10px] font-medium leading-tight">{tenantName}</span>
          ) : typeLine ? (
            <span className="w-full truncate text-[10px] leading-tight opacity-70">{typeLine}</span>
          ) : null}
        </PopoverTrigger>
        <PopoverContent className="w-72" align="start">
          <PopoverHeader>
            <PopoverTitle>
              {unit.unitNumber || unit.unitCode}
              {unit.unitName && unit.unitName !== unit.unitNumber ? ` · ${unit.unitName}` : ""}
            </PopoverTitle>
            <PopoverDescription>{label}</PopoverDescription>
          </PopoverHeader>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <dt className="text-muted-foreground">Code</dt>
            <dd className="truncate font-medium">{unit.unitCode}</dd>
            <dt className="text-muted-foreground">Floor</dt>
            <dd className="truncate font-medium">{unit.floorName || unit.floorCode || "—"}</dd>
            <dt className="text-muted-foreground">Type</dt>
            <dd className="truncate font-medium">{unit.unitTypeName || "—"}</dd>
            {unit.unitCategoryName ? (
              <>
                <dt className="text-muted-foreground">Category</dt>
                <dd className="truncate font-medium">{unit.unitCategoryName}</dd>
              </>
            ) : null}
            <dt className="text-muted-foreground">Status</dt>
            <dd className="truncate font-medium">{label}</dd>
            <dt className="text-muted-foreground">Tenant</dt>
            <dd className="truncate font-medium">{tenantName || "Unallocated"}</dd>
            {isBlocked && unit.blockReason ? (
              <>
                <dt className="text-muted-foreground">Block</dt>
                <dd className="truncate font-medium">{unit.blockReason}</dd>
              </>
            ) : null}
          </dl>
          {canWrite && (
            <div className="flex flex-col gap-1.5">
              {!hasTenant && !isSold && (
                <Button
                  size="sm"
                  onClick={() => {
                    setTenantId(null);
                    setAllocatedFrom(todayIso());
                    setPopoverOpen(false);
                    setDialog("allocate");
                  }}
                >
                  Allocate tenant
                </Button>
              )}
              {hasTenant && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setPopoverOpen(false);
                    setDialog("vacate");
                  }}
                >
                  Vacate tenant
                </Button>
              )}
              {!isBlocked && !isSold && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setBlockReason("");
                    setPopoverOpen(false);
                    setDialog("block");
                  }}
                >
                  Block unit
                </Button>
              )}
              {isBlocked && (
                <Button size="sm" variant="outline" disabled={saving} onClick={() => void runOccupancy("unblock")}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Unblock unit
                </Button>
              )}
            </div>
          )}
          <Button size="sm" variant="outline" className="w-full" nativeButton={false} render={<Link href={unitsHref} />}>
            Open Units master
          </Button>
        </PopoverContent>
      </Popover>

      <Dialog open={dialog === "allocate"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Allocate tenant</DialogTitle>
            <DialogDescription>
              Assign a property tenant to {unit.unitNumber || unit.unitCode}. The unit will be marked occupied.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label required>Tenant</Label>
              <SearchableCombobox
                value={tenantId}
                onChange={setTenantId}
                placeholder="Select tenant…"
                emptyLabel="No tenants found."
                options={tenants.map((t) => ({
                  value: t.propertyTenantId,
                  label: t.tenantName,
                  sublabel: t.tenantCode,
                }))}
              />
              {tenants.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No tenants yet.{" "}
                  <Link href={tenantsHref} className="underline underline-offset-2">
                    Add a property tenant
                  </Link>
                  .
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label required>From date</Label>
              <Input type="date" value={allocatedFrom} onChange={(e) => setAllocatedFrom(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              disabled={saving || !tenantId}
              onClick={() =>
                void runOccupancy("allocate", {
                  propertyTenantId: tenantId ?? undefined,
                  allocatedFrom,
                })
              }
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Allocate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "block"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Block unit</DialogTitle>
            <DialogDescription>
              {unit.unitNumber || unit.unitCode} will be unavailable until you unblock it.
              {hasTenant ? " The current tenant stays assigned." : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea
              rows={3}
              maxLength={250}
              placeholder="Optional — maintenance, owner use, …"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button variant="destructive" disabled={saving} onClick={() => void runOccupancy("block", { notes: blockReason.trim() || null })}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Block unit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "vacate"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vacate tenant</DialogTitle>
            <DialogDescription>
              Remove {tenantName || "the tenant"} from {unit.unitNumber || unit.unitCode}.
              {isBlocked ? " The unit stays blocked." : " The unit will become available."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button disabled={saving} onClick={() => void runOccupancy("vacate")}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Vacate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function UnitAvailabilityPage() {
  return <AccessGate module="unitAvailability">{(roleDef) => <UnitAvailabilityBoard roleDef={roleDef} />}</AccessGate>;
}
