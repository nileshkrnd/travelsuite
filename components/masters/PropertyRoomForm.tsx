"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { BedDouble, Loader2, Plus, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Section } from "@/components/masters/PropertyFormSection";
import { SearchableCombobox } from "@/components/shared/SearchableCombobox";
import { ExtranetPropertyPicker } from "@/components/shared/ExtranetPropertyPicker";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { useExtranetPropertyScopeStore } from "@/lib/store/extranet-property-scope.store";
import { resolveSessionCompanyKey } from "@/lib/session-company";
import { listRoomTypes, RoomTypesApiError } from "@/lib/services/room-types.service";
import { listSmokingTypes, SmokingTypesApiError } from "@/lib/services/smoking-types.service";
import { listViewTypes, ViewTypesApiError } from "@/lib/services/view-types.service";
import { listRoomSizeUnits, RoomSizeUnitsApiError } from "@/lib/services/room-size-units.service";
import {
  createPropertyRoom,
  updatePropertyRoom,
  PropertyRoomsApiError,
} from "@/lib/services/property-rooms.service";
import type { PropertyRoom, RoomSizeUnit, RoomType, SmokingType, ViewType } from "@/types";

const NONE = "__none__";

const schema = z
  .object({
    propertyId: z.number().int().positive("Property is required"),
    roomTypeId: z.number().int().positive("Room type is required"),
    roomCode: z.string().trim().min(1, "Room code is required").max(50),
    roomName: z.string().trim().min(1, "Room name is required").max(200),
    description: z.string().max(20000).optional().nullable(),
    maxAdult: z.number().int().min(0),
    maxChild: z.number().int().min(0),
    maxOccupancy: z.number().int().min(0),
    roomSize: z.number().min(0).nullable().optional(),
    roomSizeUnitId: z.number().int().positive().nullable().optional(),
    smokingTypeId: z.number().int().positive().nullable().optional(),
    viewTypeId: z.number().int().positive().nullable().optional(),
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
    if (!values.extraBedAllowed && values.maxExtraBed > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["maxExtraBed"],
        message: "Max extra bed must be 0 when extra bed is not allowed",
      });
    }
    if (values.roomSize != null && values.roomSize > 0 && !values.roomSizeUnitId) {
      ctx.addIssue({
        code: "custom",
        path: ["roomSizeUnitId"],
        message: "Room size unit is required when room size is set",
      });
    }
  });
type FormValues = z.infer<typeof schema>;

function emptyValues(propertyId = 0): FormValues {
  return {
    propertyId,
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
    displayOrder: 0,
    isActive: true,
  };
}

function valuesFromEntry(entry: PropertyRoom): FormValues {
  return {
    propertyId: entry.propertyId,
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

/** Shared Create / Modify form for a property room type. */
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
  const presetPropertyId =
    Number.isFinite(urlPropertyId) && urlPropertyId > 0 ? urlPropertyId : (scope.propertyId ?? 0);
  const presetPropertyLabel =
    !isEdit && presetPropertyId > 0 && scope.propertyId === presetPropertyId ? scope.propertyLabel : null;

  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [smokingTypes, setSmokingTypes] = useState<SmokingType[]>([]);
  const [viewTypes, setViewTypes] = useState<ViewType[]>([]);
  const [roomSizeUnits, setRoomSizeUnits] = useState<RoomSizeUnit[]>([]);
  const [lookupsLoading, setLookupsLoading] = useState(true);
  const [selectedPropertyLabel, setSelectedPropertyLabel] = useState<string | null>(presetPropertyLabel);
  const [propertyLocked, setPropertyLocked] = useState(!isEdit && !!presetPropertyLabel);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: entry
      ? valuesFromEntry(entry)
      : emptyValues(Number.isFinite(presetPropertyId) && presetPropertyId > 0 ? presetPropertyId : 0),
  });

  const propertyId = watch("propertyId");
  const extraBedAllowed = watch("extraBedAllowed");

  useEffect(() => {
    let cancelled = false;
    setLookupsLoading(true);
    Promise.all([
      listRoomTypes({ activeOnly: true }),
      listSmokingTypes({ activeOnly: true }),
      listViewTypes({ activeOnly: true }),
      listRoomSizeUnits({ activeOnly: true }),
    ])
      .then(([rooms, smoking, views, units]) => {
        if (cancelled) return;
        setRoomTypes(rooms);
        setSmokingTypes(smoking);
        setViewTypes(views);
        setRoomSizeUnits(units);
      })
      .catch((err) => {
        if (cancelled) return;
        const message =
          err instanceof RoomTypesApiError ||
          err instanceof SmokingTypesApiError ||
          err instanceof ViewTypesApiError ||
          err instanceof RoomSizeUnitsApiError
            ? err.message
            : "Failed to load lookups";
        toast.error(message);
      })
      .finally(() => {
        if (!cancelled) setLookupsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [savingAndAddingAnother, setSavingAndAddingAnother] = useState(false);

  async function onSubmit(values: FormValues, stayOnPage: boolean) {
    if (!actorKey || tenantKey <= 0 || companyKey <= 0) {
      toast.error("Missing session context — sign in again.");
      return;
    }
    const payload = {
      tenantId: tenantKey,
      companyId: companyKey,
      propertyId: values.propertyId,
      roomTypeId: values.roomTypeId,
      roomCode: values.roomCode.trim(),
      roomName: values.roomName.trim(),
      description: values.description?.trim() || null,
      maxAdult: values.maxAdult,
      maxChild: values.maxChild,
      maxOccupancy: values.maxOccupancy,
      roomSize: values.roomSize ?? null,
      roomSizeUnitId: values.roomSizeUnitId ?? null,
      smokingTypeId: values.smokingTypeId ?? null,
      viewTypeId: values.viewTypeId ?? null,
      extraBedAllowed: values.extraBedAllowed,
      maxExtraBed: values.extraBedAllowed ? values.maxExtraBed : 0,
      displayOrder: values.displayOrder,
      isActive: values.isActive,
    };
    if (stayOnPage) setSavingAndAddingAnother(true);
    try {
      if (isEdit && entry) {
        const saved = await updatePropertyRoom(entry.propertyRoomKey, {
          ...payload,
          modifiedBy: actorKey,
        });
        toast.success("Room updated");
        router.push(`/${role}/extranet/rooms/${saved.propertyRoomKey}`);
      } else {
        const saved = await createPropertyRoom({ ...payload, createdBy: actorKey });
        if (stayOnPage) {
          toast.success(`Room created — add the next one for ${saved.propertyName ?? "this property"}`);
          reset(emptyValues(values.propertyId));
        } else {
          toast.success("Room created");
          router.push(`/${role}/extranet/rooms/${saved.propertyRoomKey}`);
        }
      }
    } catch (error) {
      toast.error(error instanceof PropertyRoomsApiError ? error.message : "Could not save room");
    } finally {
      if (stayOnPage) setSavingAndAddingAnother(false);
    }
  }

  if (lookupsLoading) {
    return <p className="text-sm text-muted-foreground">Loading form…</p>;
  }

  const listHref =
    propertyId > 0 ? `/${role}/extranet/rooms?propertyId=${propertyId}` : `/${role}/extranet/rooms`;

  return (
    <form onSubmit={handleSubmit((v) => onSubmit(v, false))} className="max-w-2xl space-y-6">
      <Section
        icon={BedDouble}
        title="Room details"
        description="Select the property, then define the property-specific room type linked to a global room type."
      >
        <Controller
          name="propertyId"
          control={control}
          render={({ field }) => (
            <>
              <ExtranetPropertyPicker
                tenantId={tenantKey}
                value={field.value > 0 ? field.value : null}
                onChange={(id, property) => {
                  field.onChange(id ?? 0);
                  const label = property
                    ? property.propertyDisplayName || property.propertyName || property.propertyCode
                    : null;
                  setSelectedPropertyLabel(label);
                  if (!isEdit) {
                    scope.setProperty({
                      propertyId: id,
                      propertyLabel: label,
                      countryId: property?.countryId ?? null,
                      stateId: property?.stateId ?? null,
                      cityId: property?.cityId ?? null,
                      areaId: property?.areaId ?? null,
                    });
                  }
                }}
                disabled={isEdit || propertyLocked}
                selectedLabel={
                  entry ? entry.propertyName || entry.propertyCode || `Property #${entry.propertyId}` : selectedPropertyLabel
                }
                initialCountryId={scope.countryId}
                initialStateId={scope.stateId}
                initialCityId={scope.cityId}
                initialAreaId={scope.areaId}
                error={errors.propertyId?.message}
              />
              {!isEdit && propertyLocked && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setPropertyLocked(false)}>
                  Change property
                </Button>
              )}
            </>
          )}
        />

        <div className="space-y-2">
          <Label required>Room type</Label>
          <Controller
            name="roomTypeId"
            control={control}
            render={({ field }) => (
              <SearchableCombobox
                value={field.value > 0 ? field.value : null}
                onChange={(v) => field.onChange(v)}
                options={roomTypes.map((r) => ({
                  value: r.roomTypeKey,
                  label: r.name,
                  sublabel: r.code,
                }))}
                placeholder="Search room type…"
                emptyLabel="No room types found."
                ariaInvalid={!!errors.roomTypeId}
              />
            )}
          />
          {errors.roomTypeId && <p className="text-sm text-destructive">{errors.roomTypeId.message}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="roomCode" required>
              Room type code
            </Label>
            <Input
              id="roomCode"
              placeholder="Property room code"
              aria-invalid={!!errors.roomCode}
              {...register("roomCode")}
            />
            {errors.roomCode && <p className="text-sm text-destructive">{errors.roomCode.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="roomName" required>
              Room type name
            </Label>
            <Input
              id="roomName"
              placeholder="Property room name"
              aria-invalid={!!errors.roomName}
              {...register("roomName")}
            />
            {errors.roomName && <p className="text-sm text-destructive">{errors.roomName.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" rows={3} placeholder="Room description" {...register("description")} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="maxAdult">Max adult</Label>
            <Input id="maxAdult" type="number" min={0} {...register("maxAdult", { valueAsNumber: true })} />
            {errors.maxAdult && <p className="text-sm text-destructive">{errors.maxAdult.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxChild">Max child</Label>
            <Input id="maxChild" type="number" min={0} {...register("maxChild", { valueAsNumber: true })} />
            {errors.maxChild && <p className="text-sm text-destructive">{errors.maxChild.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxOccupancy">Max occupancy</Label>
            <Input
              id="maxOccupancy"
              type="number"
              min={0}
              {...register("maxOccupancy", { valueAsNumber: true })}
            />
            {errors.maxOccupancy && (
              <p className="text-sm text-destructive">{errors.maxOccupancy.message}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="roomSize">Room size</Label>
            <Input
              id="roomSize"
              type="number"
              min={0}
              step="0.01"
              {...register("roomSize", {
                setValueAs: (v) => {
                  if (v === "" || v == null) return null;
                  const n = Number(v);
                  return Number.isFinite(n) ? n : null;
                },
              })}
            />
            {errors.roomSize && <p className="text-sm text-destructive">{errors.roomSize.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Room size unit</Label>
            <Controller
              name="roomSizeUnitId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : NONE}
                  onValueChange={(v) => field.onChange(v === NONE ? null : Number(v))}
                >
                  <SelectTrigger aria-invalid={!!errors.roomSizeUnitId}>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {roomSizeUnits.map((u) => (
                      <SelectItem key={u.roomSizeUnitKey} value={String(u.roomSizeUnitKey)}>
                        {u.name} ({u.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.roomSizeUnitId && (
              <p className="text-sm text-destructive">{errors.roomSizeUnitId.message}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Smoking type</Label>
            <Controller
              name="smokingTypeId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : NONE}
                  onValueChange={(v) => field.onChange(v === NONE ? null : Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select smoking type" />
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
          <div className="space-y-2">
            <Label>View type</Label>
            <Controller
              name="viewTypeId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : NONE}
                  onValueChange={(v) => field.onChange(v === NONE ? null : Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select view type" />
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
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Extra bed allowed</Label>
            <Controller
              name="extraBedAllowed"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ? "yes" : "no"}
                  onValueChange={(v) => {
                    const allowed = v === "yes";
                    field.onChange(allowed);
                    if (!allowed) setValue("maxExtraBed", 0);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxExtraBed">Max extra bed</Label>
            <Input
              id="maxExtraBed"
              type="number"
              min={0}
              disabled={!extraBedAllowed}
              {...register("maxExtraBed", { valueAsNumber: true })}
            />
            {errors.maxExtraBed && (
              <p className="text-sm text-destructive">{errors.maxExtraBed.message}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="displayOrder">Display order</Label>
            <Input
              id="displayOrder"
              type="number"
              min={0}
              {...register("displayOrder", { valueAsNumber: true })}
            />
            {errors.displayOrder && (
              <p className="text-sm text-destructive">{errors.displayOrder.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ? "active" : "inactive"}
                  onValueChange={(v) => field.onChange(v === "active")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      </Section>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={isSubmitting || savingAndAddingAnother}>
          {isSubmitting && !savingAndAddingAnother ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isEdit ? "Save changes" : "Create room"}
        </Button>
        {!isEdit && (
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting || savingAndAddingAnother}
            onClick={handleSubmit((v) => onSubmit(v, true))}
          >
            {savingAndAddingAnother ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Save &amp; add another
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          nativeButton={false}
          render={
            <Link
              href={isEdit && entry ? `/${role}/extranet/rooms/${entry.propertyRoomKey}` : listHref}
            />
          }
        >
          <X className="h-4 w-4" />
          Cancel
        </Button>
      </div>
    </form>
  );
}
