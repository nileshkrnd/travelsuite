"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Building2, Layers, Loader2 } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SearchableCombobox } from "@/components/shared/SearchableCombobox";
import { Button } from "@/components/ui/button";
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
    "bg-emerald-400 text-emerald-950 dark:bg-emerald-500/85 dark:text-emerald-50",
  OCCUPIED: "bg-sky-400 text-sky-950 dark:bg-sky-500/85 dark:text-sky-50",
  RESERVED: "bg-amber-400 text-amber-950 dark:bg-amber-500/85 dark:text-amber-50",
  MAINTENANCE: "bg-orange-400 text-orange-950 dark:bg-orange-500/85 dark:text-orange-50",
  BLOCKED: "bg-rose-400 text-rose-950 dark:bg-rose-600/85 dark:text-rose-50",
  UNDER_RENOVATION: "bg-orange-300 text-orange-950 dark:bg-orange-400/80 dark:text-orange-50",
  SOLD: "bg-zinc-300 text-zinc-800 dark:bg-zinc-600 dark:text-zinc-100",
  INACTIVE: "bg-zinc-200/80 text-zinc-500 dark:bg-zinc-700/60 dark:text-zinc-400",
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
  return STATUS_TILE[code] ?? "bg-background text-foreground";
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

function floorIndexLabel(floorNumber: number): string {
  if (floorNumber === 0) return "G";
  if (floorNumber < 0) return `B${Math.abs(floorNumber)}`;
  return String(floorNumber);
}

type OccupancyProps = {
  tenants: PropertyTenant[];
  tenantsHref: string;
  actorKey: number;
  canWrite: boolean;
  onUnitUpdated: (unit: PropertyUnit) => void;
};

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

  const selectedProperty = properties.find((p) => p.propertyId === propertyId);
  const propertyLabel =
    selectedProperty?.propertyDisplayName ||
    selectedProperty?.propertyName ||
    selectedProperty?.propertyCode ||
    "Property";

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
        description="Pick a property to see the building elevation. Click a window to allocate, vacate, or block."
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
          description="Choose a building to open its floor-by-floor elevation and unit windows."
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
      ) : (
        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_17.5rem] xl:items-start">
          <div className="order-2 flex min-w-0 flex-col gap-3 xl:order-1">
            {units.length === 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed bg-muted/40 px-3 py-2 text-sm">
                <p className="text-muted-foreground">Floors are in place. Add units to light up the windows.</p>
                <Button variant="outline" size="sm" nativeButton={false} render={<Link href={unitsHref} />}>
                  Go to Units
                </Button>
              </div>
            ) : null}
            <BuildingFacade
              propertyName={propertyLabel}
              propertyCode={selectedProperty?.propertyCode}
              bands={stackedFloors.bands}
              orphans={stackedFloors.orphans}
              statusFilter={statusFilter}
              unitsHref={unitsHref}
              occupancy={occupancyProps}
            />
          </div>

          <aside className="order-1 flex min-w-0 flex-col gap-4 xl:sticky xl:top-6 xl:order-2">
            <OccupancyStrip
              total={units.length}
              statusOrder={statusOrder}
              statusCounts={statusCounts}
              names={unitsByStatusName}
            />
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
                    swatch={swatchClass(code)}
                    onClick={() => setStatusFilter(code)}
                  />
                );
              })}
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Filter dims other windows so the building shape stays intact. Click a window to allocate a tenant or block the unit.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}

function OccupancyStrip({
  total,
  statusOrder,
  statusCounts,
  names,
}: {
  total: number;
  statusOrder: string[];
  statusCounts: Map<string, number>;
  names: Map<string, string>;
}) {
  const occupied = statusCounts.get("OCCUPIED") ?? 0;
  const available = statusCounts.get("AVAILABLE") ?? 0;
  const blocked = statusCounts.get("BLOCKED") ?? 0;
  const denom = total || 1;

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Occupancy</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{total}</p>
      <p className="text-xs text-muted-foreground">units in this building</p>
      <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-muted ring-1 ring-foreground/10">
        {statusOrder.map((code) => {
          const count = statusCounts.get(code) ?? 0;
          if (count === 0) return null;
          return (
            <div
              key={code}
              className={cn("h-full min-w-0", swatchClass(code))}
              style={{ width: `${(count / denom) * 100}%` }}
              title={`${names.get(code) ?? statusLabel(code)} ${count}`}
            />
          );
        })}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Free</dt>
          <dd className="text-sm font-semibold tabular-nums">{available}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">In use</dt>
          <dd className="text-sm font-semibold tabular-nums">{occupied}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Blocked</dt>
          <dd className="text-sm font-semibold tabular-nums">{blocked}</dd>
        </div>
      </dl>
    </div>
  );
}

function FilterChip({
  active,
  label,
  count,
  swatch,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  swatch?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "border-foreground/15 bg-foreground text-background"
          : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {swatch ? <span className={cn("h-2 w-2 rounded-full", swatch)} /> : null}
      {label}
      <span className="tabular-nums opacity-70">{count}</span>
    </button>
  );
}

function BuildingFacade({
  propertyName,
  propertyCode,
  bands,
  orphans,
  statusFilter,
  unitsHref,
  occupancy,
}: {
  propertyName: string;
  propertyCode?: string | null;
  bands: { floor: PropertyFloor; units: PropertyUnit[] }[];
  orphans: PropertyUnit[];
  statusFilter: string;
  unitsHref: string;
  occupancy: OccupancyProps;
}) {
  const cols = Math.max(4, ...bands.map((band) => band.units.length), orphans.length);
  const minWidth = `${Math.max(22, 4.75 + cols * 5.35)}rem`;

  return (
    <div className="min-w-0">
      <div className="overflow-x-auto pb-4">
        <div className="mx-auto w-full max-w-3xl" style={{ minWidth }}>
          <div className="relative mx-[10%] h-5">
            <div className="absolute inset-x-[18%] bottom-2 h-2 rounded-t-sm bg-foreground/25" />
            <div className="absolute inset-x-0 bottom-0 h-3 rounded-t-md bg-foreground/20" />
          </div>
          <div className="overflow-hidden rounded-t-xl border border-b-0 border-foreground/15 bg-[oklch(0.93_0.012_80)] shadow-[0_28px_60px_-18px_rgba(0,0,0,0.35)] dark:bg-zinc-800">
            <div className="border-b border-foreground/10 bg-foreground/[0.07] px-4 py-2.5 text-center">
              <p className="truncate text-sm font-semibold tracking-[0.12em] uppercase">{propertyName}</p>
              {propertyCode ? (
                <p className="truncate font-mono text-[10px] text-muted-foreground">{propertyCode}</p>
              ) : null}
            </div>
            <div className="divide-y divide-foreground/10">
              {bands.map(({ floor, units: floorUnits }) => (
                <BuildingStory
                  key={floor.propertyFloorId}
                  floor={floor}
                  units={floorUnits}
                  cols={cols}
                  statusFilter={statusFilter}
                  unitsHref={unitsHref}
                  {...occupancy}
                />
              ))}
            </div>
          </div>
          <div className="mx-[-1.5%] h-3 rounded-b-md bg-foreground/25" />
          <div className="mx-[-5%] h-2.5 rounded-b-sm bg-foreground/40" />
        </div>
      </div>

      {orphans.length > 0 ? (
        <div className="mx-auto mt-2 w-full max-w-3xl rounded-lg border border-dashed bg-muted/30 p-3">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Unassigned units
          </p>
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${Math.min(cols, orphans.length)}, minmax(4.5rem, 1fr))` }}
          >
            {orphans.map((unit) => (
              <UnitTile
                key={unit.unitId}
                unit={unit}
                dimmed={statusFilter !== "ALL" && statusCodeOf(unit) !== statusFilter}
                unitsHref={unitsHref}
                {...occupancy}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BuildingStory({
  floor,
  units,
  cols,
  statusFilter,
  unitsHref,
  tenants,
  tenantsHref,
  actorKey,
  canWrite,
  onUnitUpdated,
}: {
  floor: PropertyFloor;
  units: PropertyUnit[];
  cols: number;
  statusFilter: string;
  unitsHref: string;
} & OccupancyProps) {
  const empties = Math.max(0, cols - units.length);
  const available = units.filter((unit) => statusCodeOf(unit) === "AVAILABLE").length;
  const occupied = units.filter((unit) => statusCodeOf(unit) === "OCCUPIED").length;

  return (
    <div
      className="flex min-h-[5.75rem]"
      title={`${floor.floorName} · ${units.length} unit${units.length === 1 ? "" : "s"} · ${available} free · ${occupied} occupied`}
    >
      <div className="flex w-[4.5rem] shrink-0 flex-col items-center justify-center gap-0.5 border-r border-foreground/10 bg-foreground/[0.05] px-1">
        <span className="text-lg font-bold tabular-nums leading-none">{floorIndexLabel(floor.floorNumber)}</span>
        <span className="w-full truncate text-center text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
          {floor.floorCode}
        </span>
      </div>
      <div
        className="grid min-w-0 flex-1 gap-1.5 p-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {units.map((unit) => (
          <UnitTile
            key={unit.unitId}
            unit={unit}
            dimmed={statusFilter !== "ALL" && statusCodeOf(unit) !== statusFilter}
            unitsHref={unitsHref}
            tenants={tenants}
            tenantsHref={tenantsHref}
            actorKey={actorKey}
            canWrite={canWrite}
            onUnitUpdated={onUnitUpdated}
          />
        ))}
        {Array.from({ length: empties }, (_, index) => (
          <EmptyWindow key={`${floor.propertyFloorId}-empty-${index}`} />
        ))}
      </div>
    </div>
  );
}

function EmptyWindow() {
  return (
    <div
      className="min-h-[4.75rem] rounded-sm border border-dashed border-foreground/20 bg-foreground/[0.03]"
      aria-hidden
    />
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
  dimmed = false,
}: {
  unit: PropertyUnit;
  unitsHref: string;
  tenants: PropertyTenant[];
  tenantsHref: string;
  actorKey: number;
  canWrite: boolean;
  onUnitUpdated: (unit: PropertyUnit) => void;
  dimmed?: boolean;
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
            "group relative flex h-full min-h-[4.75rem] w-full flex-col rounded-sm bg-foreground/20 p-[3px] shadow-inner transition-[filter,opacity] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
            dimmed && "opacity-25 saturate-50"
          )}
        >
          <span
            className={cn(
              "relative flex h-full min-h-[4.5rem] flex-1 flex-col items-start justify-center overflow-hidden rounded-[3px] px-1.5 py-1 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]",
              "after:pointer-events-none after:absolute after:inset-0 after:bg-gradient-to-br after:from-white/35 after:to-transparent after:opacity-70",
              tileClass(code)
            )}
          >
            <span className="relative z-10 w-full truncate text-xs font-semibold leading-tight">
              {unit.unitNumber || unit.unitCode}
            </span>
            {tenantName ? (
              <span className="relative z-10 w-full truncate text-[10px] font-medium leading-tight">{tenantName}</span>
            ) : (
              <span className="relative z-10 w-full truncate text-[10px] leading-tight opacity-80">
                {unit.unitName || typeLine || label}
              </span>
            )}
          </span>
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
