"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Layers, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SearchableCombobox } from "@/components/shared/SearchableCombobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore, isPlatformMode } from "@/lib/store/tenant.store";
import { useUsersStore } from "@/lib/store/users.store";
import { listCompanies } from "@/lib/services/db-companies.service";
import { listProperties, PropertiesApiError } from "@/lib/services/properties.service";
import { listRoomSizeUnits } from "@/lib/services/room-size-units.service";
import { floorTypesService } from "@/lib/services/global-code-lookup.service";
import {
  listPropertyFloors,
  savePropertyFloorsBatch,
  deletePropertyFloor,
  PropertyFloorsApiError,
} from "@/lib/services/property-floors.service";
import { resolveSessionCompanyKey, shouldLockSessionCompany } from "@/lib/session-company";
import { can } from "@/config/permissions";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import type { FloorType, Property, PropertyFloor, RoleDef, RoomSizeUnit } from "@/types";

const NONE = "__none__";
const cellInput = "h-8 w-full min-w-0 px-2 text-sm";
const cellSelect =
  "h-8 w-full min-w-0 max-w-full justify-between overflow-hidden px-2 text-sm whitespace-nowrap";
/** One row, columns shrink together so the sheet never needs a horizontal scrollbar. */
const sheetGrid =
  "grid w-full min-w-0 grid-cols-[2rem_minmax(0,6.5rem)_4.25rem_minmax(0,1fr)_minmax(0,8.5rem)_3.75rem_5rem_5rem_2rem] items-center gap-x-1.5";

function optionalArea() {
  return z.preprocess((v) => {
    if (v === "" || v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }, z.number().nonnegative().nullable());
}

const rowSchema = z.object({
  propertyFloorId: z.number().int().positive().nullable(),
  floorCode: z.string().trim().min(1, "Required").max(50),
  floorNumber: z.preprocess((v) => (v === "" || v == null ? NaN : Number(v)), z.number().int("Required")),
  floorName: z.string().trim().min(1, "Required").max(100),
  floorTypeId: z.number().int().positive("Required"),
  displayOrder: z.preprocess((v) => (v === "" || v == null ? 0 : Number(v)), z.number().int()),
  floorArea: optionalArea(),
  areaUnitId: z.number().int().positive().nullable(),
});

const schema = z.object({
  rows: z.array(rowSchema).min(1, "Add at least one floor"),
});

type RowValues = z.infer<typeof rowSchema>;
type FormValues = z.infer<typeof schema>;

function ordinalName(n: number): string {
  if (n === 0) return "Ground Floor";
  if (n < 0) return n === -1 ? "Basement" : `Basement ${Math.abs(n)}`;
  const abs = Math.abs(n);
  const mod100 = abs % 100;
  const suffix =
    mod100 >= 11 && mod100 <= 13 ? "th" : abs % 10 === 1 ? "st" : abs % 10 === 2 ? "nd" : abs % 10 === 3 ? "rd" : "th";
  return `${abs}${suffix} Floor`;
}

function suggestFloorTypeId(floorNumber: number, types: FloorType[]): number {
  const code = floorNumber === 0 ? "GROUND" : floorNumber < 0 ? "BASEMENT" : "NORMAL";
  return types.find((t) => t.code === code)?.key ?? types[0]?.key ?? 0;
}

function blankRow(floorNumber: number, displayOrder: number, types: FloorType[] = []): RowValues {
  return {
    propertyFloorId: null,
    floorCode: floorNumber === 0 ? "G" : floorNumber < 0 ? `B${Math.abs(floorNumber)}` : `F${floorNumber}`,
    floorNumber,
    floorName: ordinalName(floorNumber),
    floorTypeId: suggestFloorTypeId(floorNumber, types),
    displayOrder,
    floorArea: null,
    areaUnitId: null,
  };
}

function rowFromFloor(floor: PropertyFloor): RowValues {
  return {
    propertyFloorId: floor.propertyFloorId,
    floorCode: floor.floorCode,
    floorNumber: floor.floorNumber,
    floorName: floor.floorName,
    floorTypeId: floor.floorTypeId,
    displayOrder: floor.displayOrder,
    floorArea: floor.floorArea,
    areaUnitId: floor.areaUnitId,
  };
}

function FloorSheet({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const activeTenant = useTenantStore((s) => s.tenant);
  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const scopeTenantId = platformMode ? 0 : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);

  const [properties, setProperties] = useState<Property[]>([]);
  const [floorTypes, setFloorTypes] = useState<FloorType[]>([]);
  const [areaUnits, setAreaUnits] = useState<RoomSizeUnit[]>([]);
  const [existing, setExisting] = useState<PropertyFloor[]>([]);
  const [propertyId, setPropertyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingFloors, setLoadingFloors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const canEdit = can(roleDef, "propertyFloor", "edit");
  const canCreate = can(roleDef, "propertyFloor", "create");
  const canDelete = can(roleDef, "propertyFloor", "delete");
  const canWrite = canCreate || canEdit;
  const actorKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { rows: [blankRow(0, 0, [])] },
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
        const [typeRows, unitRows] = await Promise.all([
          floorTypesService.list({ activeOnly: true }),
          listRoomSizeUnits({ activeOnly: true }),
        ]);
        if (cancelled) return;
        setProperties(propertyRows);
        setFloorTypes(typeRows);
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
      reset({ rows: [blankRow(0, 0, floorTypes)] });
      return;
    }
    let cancelled = false;
    setLoadingFloors(true);
    listPropertyFloors({ propertyId })
      .then((floors) => {
        if (cancelled) return;
        setExisting(floors);
        const mapped = floors.map(rowFromFloor);
        reset({ rows: mapped.length > 0 ? mapped : [blankRow(0, 0, floorTypes)] });
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(error instanceof PropertyFloorsApiError ? error.message : "Failed to load floors");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingFloors(false);
      });
    return () => {
      cancelled = true;
    };
    // floorTypes is only used for the empty-sheet default; lookups load before a property can be chosen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, reset]);

  const nextFloorNumber = useMemo(() => {
    const nums = (rows ?? []).map((r) => Number(r.floorNumber)).filter((n) => Number.isFinite(n));
    if (nums.length === 0) return 0;
    return Math.max(...nums) + 1;
  }, [rows]);

  function addRow() {
    rowArray.append(blankRow(nextFloorNumber, nextFloorNumber, floorTypes));
  }

  function handleCancel() {
    const mapped = existing.map(rowFromFloor);
    reset({ rows: mapped.length > 0 ? mapped : [blankRow(0, 0, floorTypes)] });
  }

  function removeRow(index: number) {
    const row = rows[index];
    if (row?.propertyFloorId && !canDelete) {
      toast.error("You cannot delete floors.");
      return;
    }
    if (rowArray.fields.length <= 1) {
      reset({ rows: [blankRow(0, 0, floorTypes)] });
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

    const seenCodes = new Set<string>();
    const seenNumbers = new Set<number>();
    for (const row of values.rows) {
      const code = row.floorCode.trim().toUpperCase();
      if (seenCodes.has(code)) {
        toast.error(`Duplicate floor code: ${code}`);
        return;
      }
      if (seenNumbers.has(row.floorNumber)) {
        toast.error(`Duplicate floor number: ${row.floorNumber}`);
        return;
      }
      seenCodes.add(code);
      seenNumbers.add(row.floorNumber);
    }

    const keptIds = new Set(
      values.rows.map((row) => row.propertyFloorId).filter((id): id is number => id != null && id > 0)
    );
    const toDelete = existing.filter((floor) => !keptIds.has(floor.propertyFloorId));
    if (toDelete.length > 0 && !canDelete) {
      toast.error("You cannot delete floors.");
      return;
    }

    setSaving(true);
    try {
      for (const floor of toDelete) {
        await deletePropertyFloor(floor.propertyFloorId);
      }
      const saved = await savePropertyFloorsBatch({
        propertyId,
        createdBy: actorKey,
        modifiedBy: actorKey,
        rows: values.rows.map((row) => ({
          propertyId,
          propertyFloorId: row.propertyFloorId,
          floorCode: row.floorCode.trim().toUpperCase(),
          floorNumber: row.floorNumber,
          floorName: row.floorName.trim(),
          floorTypeId: row.floorTypeId,
          displayOrder: row.displayOrder,
          floorArea: row.floorArea,
          areaUnitId: row.areaUnitId,
        })),
      });
      setExisting(saved);
      reset({ rows: saved.map(rowFromFloor) });
      toast.success(`${saved.length} floor${saved.length === 1 ? "" : "s"} saved`);
    } catch (error) {
      toast.error(error instanceof PropertyFloorsApiError ? error.message : "Could not save floors");
    } finally {
      setSaving(false);
    }
  }

  const readOnly = !canWrite;
  const rowHasFieldError = Array.isArray(errors.rows) && errors.rows.some((row) => row != null);

  return (
    <div className="flex min-w-0 flex-col gap-4 p-6">
      <PageHeader title="Floors" description="Select a property, then enter floors in the sheet. Add more rows, then save." />

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
          icon={Layers}
          tone="muted"
          heading="Select a property"
          description="Choose a building first, then add multiple floors in the sheet below."
          size="compact"
        />
      ) : loadingFloors ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading floors…
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex min-w-0 flex-col gap-3 overflow-visible" noValidate>
          <div className="min-w-0 overflow-visible rounded-lg border border-border">
            <div
              className={`${sheetGrid} border-b bg-muted/50 px-2 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground`}
            >
              <span>#</span>
              <span>
                Code <span className="text-destructive">*</span>
              </span>
              <span>
                No. <span className="text-destructive">*</span>
              </span>
              <span>
                Name <span className="text-destructive">*</span>
              </span>
              <span>
                Type <span className="text-destructive">*</span>
              </span>
              <span>Order</span>
              <span>Area</span>
              <span>Unit</span>
              <span />
            </div>
            {rowArray.fields.map((field, index) => {
              const rowErrors = errors.rows?.[index];
              return (
                <div key={field.id} className={`${sheetGrid} border-b px-2 py-1 last:border-b-0`}>
                  <span className="text-sm text-muted-foreground">{index + 1}</span>
                  <Input
                    className={`${cellInput} font-mono uppercase`}
                    disabled={readOnly}
                    aria-invalid={!!rowErrors?.floorCode}
                    {...register(`rows.${index}.floorCode`)}
                  />
                  <Input
                    type="number"
                    className={cellInput}
                    disabled={readOnly}
                    aria-invalid={!!rowErrors?.floorNumber}
                    {...register(`rows.${index}.floorNumber`)}
                  />
                  <Input
                    className={cellInput}
                    disabled={readOnly}
                    aria-invalid={!!rowErrors?.floorName}
                    {...register(`rows.${index}.floorName`)}
                  />
                  <div className="min-w-0">
                    <Controller
                      control={control}
                      name={`rows.${index}.floorTypeId`}
                      render={({ field: f }) => (
                        <Select
                          value={f.value ? String(f.value) : undefined}
                          onValueChange={(v) => f.onChange(Number(v))}
                          disabled={readOnly}
                        >
                          <SelectTrigger size="sm" className={cellSelect} aria-invalid={!!rowErrors?.floorTypeId}>
                            <SelectValue placeholder="Type" className="min-w-0 truncate">
                              {() => floorTypes.find((t) => t.key === f.value)?.name ?? "Type"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent align="start">
                            {floorTypes.map((t) => (
                              <SelectItem key={t.key} value={String(t.key)}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <Input type="number" className={cellInput} disabled={readOnly} {...register(`rows.${index}.displayOrder`)} />
                  <Input
                    type="number"
                    step="0.01"
                    className={cellInput}
                    disabled={readOnly}
                    placeholder="—"
                    {...register(`rows.${index}.floorArea`)}
                  />
                  <div className="min-w-0">
                    <Controller
                      control={control}
                      name={`rows.${index}.areaUnitId`}
                      render={({ field: f }) => (
                        <Select
                          value={f.value ? String(f.value) : NONE}
                          onValueChange={(v) => f.onChange(v === NONE ? null : Number(v))}
                          disabled={readOnly}
                        >
                          <SelectTrigger size="sm" className={cellSelect}>
                            <SelectValue placeholder="—" className="min-w-0 truncate">
                              {() => areaUnits.find((u) => u.roomSizeUnitKey === f.value)?.code ?? "—"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent align="start">
                            <SelectItem value={NONE}>—</SelectItem>
                            {areaUnits.map((u) => (
                              <SelectItem key={u.roomSizeUnitKey} value={String(u.roomSizeUnitKey)}>
                                {u.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-8"
                    disabled={readOnly || (!canDelete && !!rows[index]?.propertyFloorId)}
                    onClick={() => removeRow(index)}
                    aria-label="Remove row"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>

          {typeof errors.rows?.message === "string" && <p className="text-sm text-destructive">{errors.rows.message}</p>}
          {rowHasFieldError && (
            <p className="text-sm text-destructive">Fill required cells (code, number, name, type) before saving.</p>
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

export default function PropertyFloorMasterPage() {
  return (
    <AccessGate module="propertyFloor">
      {(roleDef) => <FloorSheet roleDef={roleDef} />}
    </AccessGate>
  );
}
