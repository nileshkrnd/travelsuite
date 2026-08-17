"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { BedDouble, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/EmptyState";
import { SearchableCombobox } from "@/components/shared/SearchableCombobox";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { useExtranetPropertyScopeStore } from "@/lib/store/extranet-property-scope.store";
import { resolveSessionCompanyKey } from "@/lib/session-company";
import { getProperty, PropertiesApiError } from "@/lib/services/properties.service";
import { listRoomTypes, RoomTypesApiError } from "@/lib/services/room-types.service";
import { listSmokingTypes, SmokingTypesApiError } from "@/lib/services/smoking-types.service";
import { listViewTypes, ViewTypesApiError } from "@/lib/services/view-types.service";
import { listRoomSizeUnits, RoomSizeUnitsApiError } from "@/lib/services/room-size-units.service";
import {
  listPropertyRooms,
  createPropertyRoom,
  updatePropertyRoom,
  PropertyRoomsApiError,
} from "@/lib/services/property-rooms.service";
import type { Property, PropertyRoom, RoomSizeUnit, RoomType, SmokingType, ViewType } from "@/types";

const NONE = "__none__";

const rowSchema = z
  .object({
    roomTypeId: z.number().int().positive("Choose a room type"),
    roomCode: z.string().trim().min(1, "Required").max(50),
    roomName: z.string().trim().min(1, "Required").max(200),
    description: z.string().max(20000).optional(),
    maxAdult: z.number().int().min(0),
    maxChild: z.number().int().min(0),
    maxOccupancy: z.number().int().min(0),
    roomSize: z.number().min(0).nullable(),
    roomSizeUnitId: z.number().int().positive().nullable(),
    smokingTypeId: z.number().int().positive().nullable(),
    viewTypeId: z.number().int().positive().nullable(),
    extraBedAllowed: z.boolean(),
    maxExtraBed: z.number().int().min(0),
    displayOrder: z.number().int().min(0),
    isActive: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.maxOccupancy < values.maxAdult) {
      ctx.addIssue({
        code: "custom",
        path: ["maxOccupancy"],
        message: "Max occupancy must be at least Max adult",
      });
    }
    if (values.roomSize != null && values.roomSize > 0 && !values.roomSizeUnitId) {
      ctx.addIssue({
        code: "custom",
        path: ["roomSizeUnitId"],
        message: "Room size unit required when room size is set",
      });
    }
  });

const schema = z.object({
  rows: z.array(rowSchema).min(1, "Add at least one room"),
});

type RowValues = z.infer<typeof rowSchema>;
type FormValues = z.infer<typeof schema>;

function blankRow(displayOrder: number): RowValues {
  return {
    roomTypeId: 0,
    roomCode: "",
    roomName: "",
    description: "",
    maxAdult: 2,
    maxChild: 0,
    maxOccupancy: 2,
    roomSize: null,
    roomSizeUnitId: null,
    smokingTypeId: null,
    viewTypeId: null,
    extraBedAllowed: false,
    maxExtraBed: 0,
    displayOrder,
    isActive: true,
  };
}

function rowFromEntry(entry: PropertyRoom): RowValues {
  return {
    roomTypeId: entry.roomTypeId,
    roomCode: entry.roomCode,
    roomName: entry.roomName,
    description: entry.description ?? "",
    maxAdult: entry.maxAdult,
    maxChild: entry.maxChild,
    maxOccupancy: entry.maxOccupancy,
    roomSize: entry.roomSize,
    roomSizeUnitId: entry.roomSizeUnitId,
    smokingTypeId: entry.smokingTypeId,
    viewTypeId: entry.viewTypeId,
    extraBedAllowed: entry.extraBedAllowed,
    maxExtraBed: entry.maxExtraBed,
    displayOrder: entry.displayOrder,
    isActive: entry.isActive,
  };
}

/** Shared Create / Modify form for a property room type — spreadsheet-style multi-row entry when creating. */
export function PropertyRoomForm({ entry }: { entry?: PropertyRoom }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;
  const companyKey = resolveSessionCompanyKey(sessionUser) ?? 0;
  const actorKey = sessionUser?.userKey ?? 0;
  const isEdit = !!entry;
  const scope = useExtranetPropertyScopeStore();

  const urlPropertyId = Number(searchParams.get("propertyId") ?? 0);
  const propertyId = entry
    ? entry.propertyId
    : Number.isFinite(urlPropertyId) && urlPropertyId > 0
      ? urlPropertyId
      : (scope.propertyId ?? 0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [property, setProperty] = useState<Property | null>(null);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [smokingTypes, setSmokingTypes] = useState<SmokingType[]>([]);
  const [viewTypes, setViewTypes] = useState<ViewType[]>([]);
  const [roomSizeUnits, setRoomSizeUnits] = useState<RoomSizeUnit[]>([]);
  const [existingRooms, setExistingRooms] = useState<PropertyRoom[]>([]);

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { rows: [entry ? rowFromEntry(entry) : blankRow(0)] },
  });

  const rowArray = useFieldArray({ control, name: "rows" });
  const rows = watch("rows");

  useEffect(() => {
    if (propertyId <= 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getProperty(propertyId),
      listRoomTypes({ activeOnly: true }),
      listSmokingTypes({ activeOnly: true }),
      listViewTypes({ activeOnly: true }),
      listRoomSizeUnits({ activeOnly: true }),
      isEdit
        ? Promise.resolve([] as PropertyRoom[])
        : listPropertyRooms({ tenantId: tenantKey, companyId: companyKey, propertyId }),
    ])
      .then(([propertyRow, roomTypeRows, smokingRows, viewRows, unitRows, roomRows]) => {
        if (cancelled) return;
        setProperty(propertyRow);
        setRoomTypes(roomTypeRows);
        setSmokingTypes(smokingRows);
        setViewTypes(viewRows);
        setRoomSizeUnits(unitRows);
        setExistingRooms(roomRows);
        if (!isEdit) {
          const nextOrder = roomRows.reduce((max, r) => Math.max(max, r.displayOrder), -1) + 1;
          setValue("rows.0.displayOrder", nextOrder);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(
            err instanceof PropertiesApiError ||
              err instanceof RoomTypesApiError ||
              err instanceof SmokingTypesApiError ||
              err instanceof ViewTypesApiError ||
              err instanceof RoomSizeUnitsApiError
              ? err.message
              : "Failed to load form"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, tenantKey, companyKey, isEdit]);

  const propertyLabel = entry
    ? entry.propertyName || entry.propertyCode || `Property #${entry.propertyId}`
    : property
      ? property.propertyDisplayName || property.propertyName || property.propertyCode
      : scope.propertyId === propertyId
        ? scope.propertyLabel
        : null;

  const roomTypeOptions = useMemo(
    () => roomTypes.map((r) => ({ value: r.roomTypeKey, label: r.name, sublabel: r.code })),
    [roomTypes]
  );
  const existingCodes = useMemo(
    () => new Set(existingRooms.map((r) => r.roomCode.trim().toUpperCase())),
    [existingRooms]
  );

  function addRow() {
    const maxOrder = rows.reduce((max, r) => Math.max(max, r.displayOrder ?? 0), -1);
    rowArray.append(blankRow(maxOrder + 1));
  }

  async function onSubmit(values: FormValues) {
    if (!actorKey || tenantKey <= 0 || companyKey <= 0) {
      toast.error("Missing session context — sign in again.");
      return;
    }
    if (propertyId <= 0) {
      toast.error("Missing property context.");
      return;
    }

    // Strong duplicate guard: same room code can't repeat within this batch, nor
    // duplicate a room code already configured for this property.
    const seenInBatch = new Set<string>();
    const dupCodes: string[] = [];
    for (const row of values.rows) {
      const code = row.roomCode.trim().toUpperCase();
      if (existingCodes.has(code) || seenInBatch.has(code)) {
        if (!dupCodes.includes(code)) dupCodes.push(code);
      }
      seenInBatch.add(code);
    }
    if (dupCodes.length > 0) {
      toast.error(`Already exists for this property: ${dupCodes.join(", ")}`);
      return;
    }

    setSaving(true);

    function toPayload(row: RowValues) {
      return {
        tenantId: tenantKey,
        companyId: companyKey,
        propertyId,
        roomTypeId: row.roomTypeId,
        roomCode: row.roomCode.trim(),
        roomName: row.roomName.trim(),
        description: row.description?.trim() || null,
        maxAdult: row.maxAdult,
        maxChild: row.maxChild,
        maxOccupancy: row.maxOccupancy,
        roomSize: row.roomSize ?? null,
        roomSizeUnitId: row.roomSizeUnitId ?? null,
        smokingTypeId: row.smokingTypeId ?? null,
        viewTypeId: row.viewTypeId ?? null,
        extraBedAllowed: row.extraBedAllowed,
        maxExtraBed: row.extraBedAllowed ? row.maxExtraBed : 0,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
      };
    }

    if (entry) {
      const row = values.rows[0]!;
      try {
        const saved = await updatePropertyRoom(entry.propertyRoomKey, {
          ...toPayload(row),
          modifiedBy: actorKey,
        });
        toast.success("Room updated");
        router.push(`/${role}/extranet/rooms/${saved.propertyRoomKey}`);
      } catch (error) {
        toast.error(error instanceof PropertyRoomsApiError ? error.message : "Could not save room");
      } finally {
        setSaving(false);
      }
      return;
    }

    let saved = 0;
    const failed: string[] = [];
    for (const row of values.rows) {
      try {
        await createPropertyRoom({ ...toPayload(row), createdBy: actorKey });
        saved += 1;
      } catch (err) {
        const message = err instanceof PropertyRoomsApiError ? err.message : "save failed";
        failed.push(`${row.roomCode.trim()} (${message})`);
      }
    }
    setSaving(false);

    if (saved > 0) {
      toast.success(`${saved} room${saved === 1 ? "" : "s"} created`);
    }
    if (failed.length > 0) {
      toast.error(`Could not add: ${failed.join(", ")}`);
    } else {
      router.push(`/${role}/extranet/rooms?propertyId=${propertyId}`);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (propertyId <= 0) {
    return (
      <EmptyState
        icon={BedDouble}
        tone="muted"
        heading="No property selected"
        description="Select a property first, then add rooms for it."
        action={
          <Button nativeButton={false} render={<Link href={`/${role}/extranet/rooms`} />}>
            Choose a property
          </Button>
        }
      />
    );
  }

  const listHref = `/${role}/extranet/rooms?propertyId=${propertyId}`;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-full space-y-6">
      <div className="space-y-1 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Property</p>
        <p className="text-base font-semibold text-foreground">
          {propertyLabel ?? `Property #${propertyId}`}
        </p>
      </div>

      <div className="space-y-3">
        {rowArray.fields.map((field, index) => {
          const rowErrors = errors.rows?.[index];
          const extraBedAllowed = rows[index]?.extraBedAllowed ?? false;
          return (
            <div key={field.id} className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
              {/* Line 1: identity */}
              <div className="flex flex-nowrap items-end gap-2">
                <span className="shrink-0 pb-2 text-xs text-muted-foreground">#{index + 1}</span>
                <div className="min-w-0 flex-1 space-y-1">
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">
                    Room type<span className="text-destructive"> *</span>
                  </span>
                  <Controller
                    control={control}
                    name={`rows.${index}.roomTypeId`}
                    render={({ field: f }) => (
                      <SearchableCombobox
                        value={f.value > 0 ? f.value : null}
                        onChange={(v) => f.onChange(v ?? 0)}
                        options={roomTypeOptions}
                        placeholder="Room type…"
                        emptyLabel="No room types found."
                      />
                    )}
                  />
                  {rowErrors?.roomTypeId && (
                    <p className="text-xs text-destructive">{rowErrors.roomTypeId.message}</p>
                  )}
                </div>
                <div className="w-24 shrink-0 space-y-1">
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">
                    Code<span className="text-destructive"> *</span>
                  </span>
                  <Input className="h-9 w-full min-w-0" {...register(`rows.${index}.roomCode`)} placeholder="DLX" />
                  {rowErrors?.roomCode && (
                    <p className="text-xs text-destructive">{rowErrors.roomCode.message}</p>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">
                    Name<span className="text-destructive"> *</span>
                  </span>
                  <Input className="h-9 w-full min-w-0" {...register(`rows.${index}.roomName`)} placeholder="Deluxe Room" />
                  {rowErrors?.roomName && (
                    <p className="text-xs text-destructive">{rowErrors.roomName.message}</p>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">Description</span>
                  <Input className="h-9 w-full min-w-0" {...register(`rows.${index}.description`)} placeholder="Optional" />
                </div>
                {!isEdit && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="mb-0.5 shrink-0"
                    disabled={rowArray.fields.length <= 1}
                    onClick={() => rowArray.remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Line 2: capacity, specs, status */}
              <div className="flex flex-nowrap items-end gap-2">
                <div className="w-12 shrink-0 space-y-1">
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">Adult</span>
                  <Input
                    type="number"
                    min={0}
                    className="h-9 w-full min-w-0 px-2"
                    {...register(`rows.${index}.maxAdult`, { valueAsNumber: true })}
                  />
                </div>
                <div className="w-12 shrink-0 space-y-1">
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">Child</span>
                  <Input
                    type="number"
                    min={0}
                    className="h-9 w-full min-w-0 px-2"
                    {...register(`rows.${index}.maxChild`, { valueAsNumber: true })}
                  />
                </div>
                <div className="w-14 shrink-0 space-y-1">
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">Occ.</span>
                  <Input
                    type="number"
                    min={0}
                    className="h-9 w-full min-w-0 px-2"
                    {...register(`rows.${index}.maxOccupancy`, { valueAsNumber: true })}
                  />
                  {rowErrors?.maxOccupancy && (
                    <p className="text-xs text-destructive">{rowErrors.maxOccupancy.message}</p>
                  )}
                </div>
                <div className="w-14 shrink-0 space-y-1">
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">Size</span>
                  <Controller
                    control={control}
                    name={`rows.${index}.roomSize`}
                    render={({ field: f }) => (
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        className="h-9 w-full min-w-0 px-2"
                        value={f.value ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          f.onChange(v === "" ? null : Number(v));
                        }}
                      />
                    )}
                  />
                </div>
                <div className="w-16 shrink-0 space-y-1 overflow-hidden">
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">Unit</span>
                  <Controller
                    control={control}
                    name={`rows.${index}.roomSizeUnitId`}
                    render={({ field: f }) => (
                      <Select
                        value={f.value ? String(f.value) : NONE}
                        onValueChange={(v) => f.onChange(v === NONE ? null : Number(v))}
                      >
                        <SelectTrigger className="h-9 w-full min-w-0 overflow-hidden px-2 text-xs">
                          <SelectValue placeholder="—" className="truncate">
                            {() => roomSizeUnits.find((u) => u.roomSizeUnitKey === f.value)?.code ?? "—"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>None</SelectItem>
                          {roomSizeUnits.map((u) => (
                            <SelectItem key={u.roomSizeUnitKey} value={String(u.roomSizeUnitKey)}>
                              {u.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {rowErrors?.roomSizeUnitId && (
                    <p className="text-xs text-destructive">{rowErrors.roomSizeUnitId.message}</p>
                  )}
                </div>
                <div className="w-20 shrink-0 space-y-1 overflow-hidden">
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">Smoking</span>
                  <Controller
                    control={control}
                    name={`rows.${index}.smokingTypeId`}
                    render={({ field: f }) => (
                      <Select
                        value={f.value ? String(f.value) : NONE}
                        onValueChange={(v) => f.onChange(v === NONE ? null : Number(v))}
                      >
                        <SelectTrigger className="h-9 w-full min-w-0 overflow-hidden px-2 text-xs">
                          <SelectValue placeholder="—" className="truncate">
                            {() => smokingTypes.find((s) => s.smokingTypeKey === f.value)?.name ?? "—"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>None</SelectItem>
                          {smokingTypes.map((s) => (
                            <SelectItem key={s.smokingTypeKey} value={String(s.smokingTypeKey)}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="w-20 shrink-0 space-y-1 overflow-hidden">
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">View</span>
                  <Controller
                    control={control}
                    name={`rows.${index}.viewTypeId`}
                    render={({ field: f }) => (
                      <Select
                        value={f.value ? String(f.value) : NONE}
                        onValueChange={(v) => f.onChange(v === NONE ? null : Number(v))}
                      >
                        <SelectTrigger className="h-9 w-full min-w-0 overflow-hidden px-2 text-xs">
                          <SelectValue placeholder="—" className="truncate">
                            {() => viewTypes.find((v) => v.viewTypeKey === f.value)?.name ?? "—"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>None</SelectItem>
                          {viewTypes.map((v) => (
                            <SelectItem key={v.viewTypeKey} value={String(v.viewTypeKey)}>
                              {v.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="shrink-0 space-y-1">
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">X-bed</span>
                  <div className="flex h-9 items-center">
                    <Controller
                      control={control}
                      name={`rows.${index}.extraBedAllowed`}
                      render={({ field: f }) => (
                        <Checkbox
                          checked={f.value}
                          onCheckedChange={(c) => {
                            f.onChange(c === true);
                            if (c !== true) setValue(`rows.${index}.maxExtraBed`, 0);
                          }}
                        />
                      )}
                    />
                  </div>
                </div>
                <div className="w-12 shrink-0 space-y-1">
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">Max ex.</span>
                  <Input
                    type="number"
                    min={0}
                    className="h-9 w-full min-w-0 px-2"
                    disabled={!extraBedAllowed}
                    {...register(`rows.${index}.maxExtraBed`, { valueAsNumber: true })}
                  />
                </div>
                <div className="w-14 shrink-0 space-y-1">
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">Order</span>
                  <Input
                    type="number"
                    min={0}
                    className="h-9 w-full min-w-0 px-2"
                    {...register(`rows.${index}.displayOrder`, { valueAsNumber: true })}
                  />
                </div>
                <div className="shrink-0 space-y-1">
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">Active</span>
                  <div className="flex h-9 items-center">
                    <Controller
                      control={control}
                      name={`rows.${index}.isActive`}
                      render={({ field: f }) => (
                        <Checkbox checked={f.value} onCheckedChange={(c) => f.onChange(c === true)} />
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!isEdit && (
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4" />
          Add row
        </Button>
      )}

      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isEdit ? "Save changes" : rows.length > 1 ? `Create ${rows.length} rooms` : "Create room"}
        </Button>
        <Button
          type="button"
          variant="outline"
          nativeButton={false}
          render={<Link href={isEdit && entry ? `/${role}/extranet/rooms/${entry.propertyRoomKey}` : listHref} />}
        >
          <X className="h-4 w-4" />
          Cancel
        </Button>
      </div>
    </form>
  );
}
