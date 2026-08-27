"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { LayoutGrid, Layers, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SearchableCombobox } from "@/components/shared/SearchableCombobox";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore, isPlatformMode } from "@/lib/store/tenant.store";
import { useUsersStore } from "@/lib/store/users.store";
import { listCompanies } from "@/lib/services/db-companies.service";
import { listProperties, PropertiesApiError } from "@/lib/services/properties.service";
import { listRoomSizeUnits } from "@/lib/services/room-size-units.service";
import { listViewTypes } from "@/lib/services/view-types.service";
import {
  furnishedStatusesService,
  unitCategoriesService,
  unitStatusesService,
  unitTypesService,
} from "@/lib/services/global-code-lookup.service";
import { listPropertyFloors } from "@/lib/services/property-floors.service";
import {
  listPropertyUnits,
  savePropertyUnitsBatch,
  deletePropertyUnit,
  PropertyUnitsApiError,
} from "@/lib/services/property-units.service";
import { resolveSessionCompanyKey, shouldLockSessionCompany } from "@/lib/session-company";
import { can } from "@/config/permissions";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import { cn } from "@/lib/utils";
import type {
  FurnishedStatus,
  Property,
  PropertyFloor,
  PropertyUnit,
  RoleDef,
  RoomSizeUnit,
  UnitCategory,
  UnitStatus,
  UnitType,
  ViewType,
} from "@/types";

const NONE = "__none__";
const cellInput = "h-8 w-full min-w-0 px-2 text-sm";
const cellSelect =
  "h-8 w-full min-w-0 max-w-full justify-between overflow-hidden px-2 text-sm whitespace-nowrap";

function requiredArea() {
  return z.preprocess((v) => {
    if (v === "" || v == null) return NaN;
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  }, z.number().positive("Required"));
}

function optionalCount() {
  return z.preprocess((v) => {
    if (v === "" || v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }, z.number().int().min(0).nullable());
}

const rowSchema = z.object({
  unitId: z.number().int().positive().nullable(),
  propertyFloorId: z.number().int().positive("Required"),
  unitCode: z.string().trim().min(1, "Required").max(50),
  unitNumber: z.string().trim().min(1, "Required").max(50),
  unitName: z.string().trim().min(1, "Required").max(150),
  unitTypeId: z.number().int().positive("Required"),
  unitCategoryId: z.number().int().positive().nullable(),
  unitStatusId: z.number().int().positive("Required"),
  area: requiredArea(),
  areaUnitId: z.number().int().positive("Required"),
  bedroomCount: optionalCount(),
  bathroomCount: optionalCount(),
  parkingCount: optionalCount(),
  balconyCount: optionalCount(),
  furnishedStatusId: z.number().int().positive().nullable(),
  viewTypeId: z.number().int().positive().nullable(),
  unitDescription: z.string().trim().max(1000).optional().or(z.literal("")),
  isRentable: z.boolean(),
  isSaleable: z.boolean(),
  isActive: z.boolean(),
});

const schema = z.object({
  rows: z.array(rowSchema).min(1, "Add at least one unit"),
});

type RowValues = z.infer<typeof rowSchema>;
type FormValues = z.infer<typeof schema>;

type BlankDefaults = {
  floorId: number;
  hint: { unitCode: string; unitNumber: string };
  types: UnitType[];
  unitTypeId?: number;
  unitCategoryId?: number | null;
  unitStatusId?: number;
  area?: number | "";
  areaUnitId?: number;
  furnishedStatusId?: number | null;
  viewTypeId?: number | null;
  isRentable?: boolean;
  isSaleable?: boolean;
  isActive?: boolean;
};

function nextNumericHint(rows: RowValues[]): { unitCode: string; unitNumber: string } {
  const nums = (rows ?? [])
    .flatMap((r) => [Number.parseInt(String(r.unitNumber ?? ""), 10), Number.parseInt(String(r.unitCode ?? ""), 10)])
    .filter((n) => Number.isFinite(n) && n > 0);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return { unitCode: String(next), unitNumber: String(next) };
}

function blankRow(defaults: BlankDefaults): RowValues {
  return {
    unitId: null,
    propertyFloorId: defaults.floorId,
    unitCode: defaults.hint.unitCode,
    unitNumber: defaults.hint.unitNumber,
    unitName: "",
    unitTypeId: defaults.unitTypeId || defaults.types[0]?.key || 0,
    unitCategoryId: defaults.unitCategoryId ?? null,
    unitStatusId: defaults.unitStatusId ?? 0,
    area: (defaults.area ?? "") as unknown as number,
    areaUnitId: defaults.areaUnitId ?? 0,
    bedroomCount: null,
    bathroomCount: null,
    parkingCount: null,
    balconyCount: null,
    furnishedStatusId: defaults.furnishedStatusId ?? null,
    viewTypeId: defaults.viewTypeId ?? null,
    unitDescription: "",
    isRentable: defaults.isRentable ?? true,
    isSaleable: defaults.isSaleable ?? false,
    isActive: defaults.isActive ?? true,
  };
}

function rowFromUnit(unit: PropertyUnit): RowValues {
  return {
    unitId: unit.unitId,
    propertyFloorId: unit.propertyFloorId,
    unitCode: unit.unitCode,
    unitNumber: unit.unitNumber,
    unitName: unit.unitName ?? "",
    unitTypeId: unit.unitTypeId,
    unitCategoryId: unit.unitCategoryId,
    unitStatusId: unit.unitStatusId,
    area: unit.area,
    areaUnitId: unit.areaUnitId,
    bedroomCount: unit.bedroomCount,
    bathroomCount: unit.bathroomCount,
    parkingCount: unit.parkingCount,
    balconyCount: unit.balconyCount,
    furnishedStatusId: unit.furnishedStatusId,
    viewTypeId: unit.viewTypeId,
    unitDescription: unit.unitDescription ?? "",
    isRentable: unit.isRentable,
    isSaleable: unit.isSaleable,
    isActive: unit.isActive,
  };
}

function floorLabel(floor: PropertyFloor): string {
  return `${floor.floorName} (${floor.floorCode})`;
}

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <span className="text-[10px] font-medium uppercase leading-tight text-muted-foreground">
      {children}
      {required ? <span className="text-destructive"> *</span> : null}
    </span>
  );
}

function Cell({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("min-w-0 space-y-1 overflow-hidden", className)}>{children}</div>;
}

function UnitSheet({ roleDef }: { roleDef: RoleDef }) {
  const { role } = useParams<{ role: string }>();
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const activeTenant = useTenantStore((s) => s.tenant);
  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const scopeTenantId = platformMode ? 0 : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);

  const [properties, setProperties] = useState<Property[]>([]);
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([]);
  const [unitCategories, setUnitCategories] = useState<UnitCategory[]>([]);
  const [unitStatuses, setUnitStatuses] = useState<UnitStatus[]>([]);
  const [furnishedStatuses, setFurnishedStatuses] = useState<FurnishedStatus[]>([]);
  const [viewTypes, setViewTypes] = useState<ViewType[]>([]);
  const [areaUnits, setAreaUnits] = useState<RoomSizeUnit[]>([]);
  const [floors, setFloors] = useState<PropertyFloor[]>([]);
  const [existing, setExisting] = useState<PropertyUnit[]>([]);
  const [propertyId, setPropertyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const canEdit = can(roleDef, "propertyUnit", "edit");
  const canCreate = can(roleDef, "propertyUnit", "create");
  const canDelete = can(roleDef, "propertyUnit", "delete");
  const canWrite = canCreate || canEdit;
  const actorKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;
  const defaultStatusId = unitStatuses[0]?.key ?? 0;
  const defaultAreaUnitId = areaUnits[0]?.roomSizeUnitKey ?? 0;

  const emptySheet = () =>
    blankRow({
      floorId: 0,
      hint: { unitCode: "1", unitNumber: "1" },
      types: unitTypes,
      unitStatusId: defaultStatusId,
      areaUnitId: defaultAreaUnitId,
    });

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { rows: [emptySheet()] },
  });

  const rowArray = useFieldArray({ control, name: "rows" });
  const rows = watch("rows");

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
        const [types, categories, statuses, furnished, views, unitRows] = await Promise.all([
          unitTypesService.list({ activeOnly: true }),
          unitCategoriesService.list({ activeOnly: true }),
          unitStatusesService.list({ activeOnly: true }),
          furnishedStatusesService.list({ activeOnly: true }),
          listViewTypes({ activeOnly: true }),
          listRoomSizeUnits({ activeOnly: true }),
        ]);
        if (cancelled) return;
        setProperties(propertyRows);
        setUnitTypes(types);
        setUnitCategories(categories);
        setUnitStatuses(statuses);
        setFurnishedStatuses(furnished);
        setViewTypes(views);
        setAreaUnits(unitRows);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof PropertiesApiError ? error.message : "Failed to load lookups");
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
      setExisting([]);
      setFloors([]);
      reset({ rows: [emptySheet()] });
      return;
    }
    let cancelled = false;
    setLoadingUnits(true);
    Promise.all([listPropertyFloors({ propertyId }), listPropertyUnits({ propertyId })])
      .then(([floorRows, unitRows]) => {
        if (cancelled) return;
        setFloors(floorRows);
        setExisting(unitRows);
        const mapped = unitRows.map(rowFromUnit);
        const firstFloorId = floorRows[0]?.propertyFloorId ?? 0;
        reset({
          rows:
            mapped.length > 0
              ? mapped
              : [
                  blankRow({
                    floorId: firstFloorId,
                    hint: { unitCode: "1", unitNumber: "1" },
                    types: unitTypes,
                    unitStatusId: defaultStatusId,
                    areaUnitId: defaultAreaUnitId,
                  }),
                ],
        });
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(error instanceof PropertyUnitsApiError ? error.message : "Failed to load units");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingUnits(false);
      });
    return () => {
      cancelled = true;
    };
    // Lookups load before a property can be chosen; only reload when the property changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, reset]);

  const firstFloorId = floors[0]?.propertyFloorId ?? 0;
  const nextHint = useMemo(() => nextNumericHint(rows ?? []), [rows]);

  function addRow() {
    const last = rows[rows.length - 1];
    rowArray.append(
      blankRow({
        floorId: last?.propertyFloorId || firstFloorId,
        hint: nextHint,
        types: unitTypes,
        unitTypeId: last?.unitTypeId,
        unitCategoryId: last?.unitCategoryId,
        unitStatusId: last?.unitStatusId || defaultStatusId,
        area: last?.area ?? "",
        areaUnitId: last?.areaUnitId || defaultAreaUnitId,
        furnishedStatusId: last?.furnishedStatusId,
        viewTypeId: last?.viewTypeId,
        isRentable: last?.isRentable,
        isSaleable: last?.isSaleable,
        isActive: last?.isActive,
      })
    );
  }

  function handleCancel() {
    const mapped = existing.map(rowFromUnit);
    reset({
      rows:
        mapped.length > 0
          ? mapped
          : [
              blankRow({
                floorId: firstFloorId,
                hint: { unitCode: "1", unitNumber: "1" },
                types: unitTypes,
                unitStatusId: defaultStatusId,
                areaUnitId: defaultAreaUnitId,
              }),
            ],
    });
  }

  function removeRow(index: number) {
    const row = rows[index];
    if (row?.unitId && !canDelete) {
      toast.error("You cannot delete units.");
      return;
    }
    if (rowArray.fields.length <= 1) {
      reset({
        rows: [
          blankRow({
            floorId: firstFloorId,
            hint: { unitCode: "1", unitNumber: "1" },
            types: unitTypes,
            unitStatusId: defaultStatusId,
            areaUnitId: defaultAreaUnitId,
          }),
        ],
      });
      return;
    }
    rowArray.remove(index);
  }

  async function onSubmit(values: FormValues) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again before saving.");
      return;
    }
    if (propertyId == null) {
      toast.error("Select a property first.");
      return;
    }
    if (floors.length === 0) {
      toast.error("Add floors for this property first.");
      return;
    }

    const seenCodes = new Set<string>();
    for (const row of values.rows) {
      const code = row.unitCode.trim().toUpperCase();
      if (seenCodes.has(code)) {
        toast.error(`Duplicate unit code: ${code}`);
        return;
      }
      seenCodes.add(code);
    }

    const keptIds = new Set(values.rows.map((row) => row.unitId).filter((id): id is number => id != null && id > 0));
    const toDelete = existing.filter((unit) => !keptIds.has(unit.unitId));
    if (toDelete.length > 0 && !canDelete) {
      toast.error("You cannot delete units.");
      return;
    }

    setSaving(true);
    try {
      for (const unit of toDelete) {
        await deletePropertyUnit(unit.unitId);
      }
      const saved = await savePropertyUnitsBatch({
        propertyId,
        createdBy: actorKey,
        modifiedBy: actorKey,
        rows: values.rows.map((row) => ({
          propertyId,
          unitId: row.unitId,
          propertyFloorId: row.propertyFloorId,
          unitCode: row.unitCode.trim().toUpperCase(),
          unitNumber: row.unitNumber.trim(),
          unitName: row.unitName.trim(),
          unitTypeId: row.unitTypeId,
          unitCategoryId: row.unitCategoryId,
          unitStatusId: row.unitStatusId,
          area: row.area,
          areaUnitId: row.areaUnitId,
          bedroomCount: row.bedroomCount,
          bathroomCount: row.bathroomCount,
          parkingCount: row.parkingCount,
          balconyCount: row.balconyCount,
          furnishedStatusId: row.furnishedStatusId,
          viewTypeId: row.viewTypeId,
          unitDescription: row.unitDescription?.trim() || null,
          isRentable: row.isRentable,
          isSaleable: row.isSaleable,
          isActive: row.isActive,
        })),
      });
      setExisting(saved);
      reset({ rows: saved.map(rowFromUnit) });
      toast.success(`${saved.length} unit${saved.length === 1 ? "" : "s"} saved`);
    } catch (error) {
      toast.error(error instanceof PropertyUnitsApiError ? error.message : "Could not save units");
    } finally {
      setSaving(false);
    }
  }

  const readOnly = !canWrite;
  const rowHasFieldError = Array.isArray(errors.rows) && errors.rows.some((row) => row != null);
  const floorsHref = typeof role === "string" && role ? `/${role}/masters/property-floor` : null;

  return (
    <div className="flex min-w-0 flex-col gap-4 p-6">
      <PageHeader title="Units" description="Select a property, then enter units in the sheet. Add more rows, then save." />

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
          icon={LayoutGrid}
          tone="muted"
          heading="Select a property"
          description="Choose a building first, then add multiple units in the sheet below."
          size="compact"
        />
      ) : loadingUnits ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading units…
        </p>
      ) : floors.length === 0 ? (
        <EmptyState
          icon={Layers}
          tone="muted"
          heading="No floors yet"
          description="Add floors for this property first, then come back to enter units."
          size="compact"
          action={
            floorsHref ? (
              <Button variant="outline" size="sm" nativeButton={false} render={<Link href={floorsHref} />}>
                Go to Floors
              </Button>
            ) : undefined
          }
        />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex min-w-0 flex-col gap-3 overflow-visible" noValidate>
          <div className="min-w-0 space-y-3 overflow-visible">
            {rowArray.fields.map((field, index) => {
              const rowErrors = errors.rows?.[index];
              return (
                <div key={field.id} className="min-w-0 space-y-2 overflow-visible rounded-lg border border-border bg-muted/20 p-3">
                  {/* Line 1: identity */}
                  <div className="flex min-w-0 flex-nowrap items-end gap-2">
                    <span className="w-6 shrink-0 pb-2 text-xs text-muted-foreground">{index + 1}</span>
                    <Cell className="flex-[1.1]">
                      <FieldLabel required>Floor</FieldLabel>
                      <Controller
                        control={control}
                        name={`rows.${index}.propertyFloorId`}
                        render={({ field: f }) => (
                          <Select
                            value={f.value ? String(f.value) : undefined}
                            onValueChange={(v) => f.onChange(Number(v))}
                            disabled={readOnly}
                          >
                            <SelectTrigger size="sm" className={cellSelect} aria-invalid={!!rowErrors?.propertyFloorId}>
                              <SelectValue placeholder="Floor" className="min-w-0 truncate">
                                {() => floors.find((fl) => fl.propertyFloorId === f.value)?.floorCode ?? "Floor"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent align="start">
                              {floors.map((fl) => (
                                <SelectItem key={fl.propertyFloorId} value={String(fl.propertyFloorId)}>
                                  {floorLabel(fl)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </Cell>
                    <Cell className="w-[5.5rem] shrink-0">
                      <FieldLabel required>Code</FieldLabel>
                      <Input
                        className={`${cellInput} font-mono uppercase`}
                        disabled={readOnly}
                        aria-invalid={!!rowErrors?.unitCode}
                        {...register(`rows.${index}.unitCode`)}
                      />
                    </Cell>
                    <Cell className="w-[5.5rem] shrink-0">
                      <FieldLabel required>Number</FieldLabel>
                      <Input
                        className={cellInput}
                        disabled={readOnly}
                        aria-invalid={!!rowErrors?.unitNumber}
                        {...register(`rows.${index}.unitNumber`)}
                      />
                    </Cell>
                    <Cell className="flex-[1.3]">
                      <FieldLabel required>Name</FieldLabel>
                      <Input
                        className={cellInput}
                        disabled={readOnly}
                        aria-invalid={!!rowErrors?.unitName}
                        {...register(`rows.${index}.unitName`)}
                      />
                    </Cell>
                    <Cell className="flex-1">
                      <FieldLabel required>Type</FieldLabel>
                      <Controller
                        control={control}
                        name={`rows.${index}.unitTypeId`}
                        render={({ field: f }) => (
                          <Select
                            value={f.value ? String(f.value) : undefined}
                            onValueChange={(v) => f.onChange(Number(v))}
                            disabled={readOnly}
                          >
                            <SelectTrigger size="sm" className={cellSelect} aria-invalid={!!rowErrors?.unitTypeId}>
                              <SelectValue placeholder="Type" className="min-w-0 truncate">
                                {() => unitTypes.find((t) => t.key === f.value)?.name ?? "Type"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent align="start">
                              {unitTypes.map((t) => (
                                <SelectItem key={t.key} value={String(t.key)}>
                                  {t.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </Cell>
                    <Cell className="flex-1">
                      <FieldLabel>Category</FieldLabel>
                      <Controller
                        control={control}
                        name={`rows.${index}.unitCategoryId`}
                        render={({ field: f }) => (
                          <Select
                            value={f.value ? String(f.value) : NONE}
                            onValueChange={(v) => f.onChange(v === NONE ? null : Number(v))}
                            disabled={readOnly}
                          >
                            <SelectTrigger size="sm" className={cellSelect}>
                              <SelectValue placeholder="—" className="min-w-0 truncate">
                                {() => unitCategories.find((c) => c.key === f.value)?.name ?? "—"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent align="start">
                              <SelectItem value={NONE}>—</SelectItem>
                              {unitCategories.map((c) => (
                                <SelectItem key={c.key} value={String(c.key)}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </Cell>
                    <Cell className="flex-1">
                      <FieldLabel required>Status</FieldLabel>
                      <Controller
                        control={control}
                        name={`rows.${index}.unitStatusId`}
                        render={({ field: f }) => (
                          <Select
                            value={f.value ? String(f.value) : undefined}
                            onValueChange={(v) => f.onChange(Number(v))}
                            disabled={readOnly}
                          >
                            <SelectTrigger size="sm" className={cellSelect} aria-invalid={!!rowErrors?.unitStatusId}>
                              <SelectValue placeholder="Status" className="min-w-0 truncate">
                                {() => unitStatuses.find((s) => s.key === f.value)?.name ?? "Status"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent align="start">
                              {unitStatuses.map((s) => (
                                <SelectItem key={s.key} value={String(s.key)}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </Cell>
                  </div>

                  {/* Line 2: specs */}
                  <div className="flex min-w-0 flex-nowrap items-end gap-2">
                    <span className="w-6 shrink-0" aria-hidden />
                    <Cell className="flex-1">
                      <FieldLabel>Furnished</FieldLabel>
                      <Controller
                        control={control}
                        name={`rows.${index}.furnishedStatusId`}
                        render={({ field: f }) => (
                          <Select
                            value={f.value ? String(f.value) : NONE}
                            onValueChange={(v) => f.onChange(v === NONE ? null : Number(v))}
                            disabled={readOnly}
                          >
                            <SelectTrigger size="sm" className={cellSelect}>
                              <SelectValue placeholder="—" className="min-w-0 truncate">
                                {() => furnishedStatuses.find((s) => s.key === f.value)?.name ?? "—"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent align="start">
                              <SelectItem value={NONE}>—</SelectItem>
                              {furnishedStatuses.map((s) => (
                                <SelectItem key={s.key} value={String(s.key)}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </Cell>
                    <Cell className="w-16">
                      <FieldLabel required>Area</FieldLabel>
                      <Input
                        type="number"
                        step="0.01"
                        className={cellInput}
                        disabled={readOnly}
                        aria-invalid={!!rowErrors?.area}
                        {...register(`rows.${index}.area`)}
                      />
                    </Cell>
                    <Cell className="w-[4.5rem]">
                      <FieldLabel required>Unit</FieldLabel>
                      <Controller
                        control={control}
                        name={`rows.${index}.areaUnitId`}
                        render={({ field: f }) => (
                          <Select
                            value={f.value ? String(f.value) : undefined}
                            onValueChange={(v) => f.onChange(Number(v))}
                            disabled={readOnly}
                          >
                            <SelectTrigger size="sm" className={cellSelect} aria-invalid={!!rowErrors?.areaUnitId}>
                              <SelectValue placeholder="Unit" className="min-w-0 truncate">
                                {() => areaUnits.find((u) => u.roomSizeUnitKey === f.value)?.code ?? "Unit"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent align="start">
                              {areaUnits.map((u) => (
                                <SelectItem key={u.roomSizeUnitKey} value={String(u.roomSizeUnitKey)}>
                                  {u.code}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </Cell>
                    <Cell className="flex-1">
                      <FieldLabel>View</FieldLabel>
                      <Controller
                        control={control}
                        name={`rows.${index}.viewTypeId`}
                        render={({ field: f }) => (
                          <Select
                            value={f.value ? String(f.value) : NONE}
                            onValueChange={(v) => f.onChange(v === NONE ? null : Number(v))}
                            disabled={readOnly}
                          >
                            <SelectTrigger size="sm" className={cellSelect}>
                              <SelectValue placeholder="—" className="min-w-0 truncate">
                                {() => viewTypes.find((v) => v.viewTypeKey === f.value)?.name ?? "—"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent align="start">
                              <SelectItem value={NONE}>—</SelectItem>
                              {viewTypes.map((v) => (
                                <SelectItem key={v.viewTypeKey} value={String(v.viewTypeKey)}>
                                  {v.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </Cell>
                    <Cell className="w-12">
                      <FieldLabel>Beds</FieldLabel>
                      <Input
                        type="number"
                        min={0}
                        className={`${cellInput} px-1`}
                        disabled={readOnly}
                        {...register(`rows.${index}.bedroomCount`)}
                      />
                    </Cell>
                    <Cell className="w-12">
                      <FieldLabel>Baths</FieldLabel>
                      <Input
                        type="number"
                        min={0}
                        className={`${cellInput} px-1`}
                        disabled={readOnly}
                        {...register(`rows.${index}.bathroomCount`)}
                      />
                    </Cell>
                    <Cell className="w-12">
                      <FieldLabel>Park</FieldLabel>
                      <Input
                        type="number"
                        min={0}
                        className={`${cellInput} px-1`}
                        disabled={readOnly}
                        {...register(`rows.${index}.parkingCount`)}
                      />
                    </Cell>
                    <Cell className="w-12">
                      <FieldLabel>Balc</FieldLabel>
                      <Input
                        type="number"
                        min={0}
                        className={`${cellInput} px-1`}
                        disabled={readOnly}
                        {...register(`rows.${index}.balconyCount`)}
                      />
                    </Cell>
                    <Cell className="flex-[1.4]">
                      <FieldLabel>Description</FieldLabel>
                      <Input
                        className={cellInput}
                        disabled={readOnly}
                        {...register(`rows.${index}.unitDescription`)}
                      />
                    </Cell>
                    <Cell className="w-9 shrink-0">
                      <FieldLabel>Rent</FieldLabel>
                      <div className="flex h-8 items-center">
                        <Controller
                          control={control}
                          name={`rows.${index}.isRentable`}
                          render={({ field: f }) => (
                            <Checkbox
                              checked={f.value}
                              disabled={readOnly}
                              onCheckedChange={(c) => f.onChange(c === true)}
                              aria-label="Rentable"
                            />
                          )}
                        />
                      </div>
                    </Cell>
                    <Cell className="w-9 shrink-0">
                      <FieldLabel>Sale</FieldLabel>
                      <div className="flex h-8 items-center">
                        <Controller
                          control={control}
                          name={`rows.${index}.isSaleable`}
                          render={({ field: f }) => (
                            <Checkbox
                              checked={f.value}
                              disabled={readOnly}
                              onCheckedChange={(c) => f.onChange(c === true)}
                              aria-label="Saleable"
                            />
                          )}
                        />
                      </div>
                    </Cell>
                    <Cell className="w-10 shrink-0">
                      <FieldLabel>Active</FieldLabel>
                      <div className="flex h-8 items-center">
                        <Controller
                          control={control}
                          name={`rows.${index}.isActive`}
                          render={({ field: f }) => (
                            <Checkbox
                              checked={f.value}
                              disabled={readOnly}
                              onCheckedChange={(c) => f.onChange(c === true)}
                              aria-label="Active"
                            />
                          )}
                        />
                      </div>
                    </Cell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="mb-0.5 size-8 shrink-0"
                      disabled={readOnly || (!canDelete && !!rows[index]?.unitId)}
                      onClick={() => removeRow(index)}
                      aria-label="Remove row"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {typeof errors.rows?.message === "string" && <p className="text-sm text-destructive">{errors.rows.message}</p>}
          {rowHasFieldError && (
            <p className="text-sm text-destructive">
              Fill required cells (floor, code, number, name, type, status, area, area unit) before saving.
            </p>
          )}

          {canCreate && (
            <div>
              <Button type="button" variant="outline" size="sm" onClick={addRow}>
                <Plus className="h-4 w-4" />
                Add more
              </Button>
            </div>
          )}

          {canWrite && (
            <div className="flex items-center gap-2 border-t border-border pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </Button>
              <Button type="button" variant="outline" disabled={saving || !isDirty} onClick={handleCancel}>
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}

export default function PropertyUnitMasterPage() {
  return (
    <AccessGate module="propertyUnit">
      {(roleDef) => <UnitSheet roleDef={roleDef} />}
    </AccessGate>
  );
}
