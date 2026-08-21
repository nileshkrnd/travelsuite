"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Building2, Eye, Pencil, Power, PowerOff, Trash2, X, Search, Loader2, Star } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useSessionStore } from "@/lib/store/session.store";
import { useUsersStore } from "@/lib/store/users.store";
import { listServiceProductSuppliers, ServiceProductSuppliersApiError } from "@/lib/services/service-product-suppliers.service";
import { listServiceProductLocations } from "@/lib/services/service-product-locations.service";
import { listServiceProductLocationTypes } from "@/lib/services/service-product-location-types.service";
import { listCountries } from "@/lib/services/countries.service";
import { listRegions } from "@/lib/services/regions.service";
import { listCities } from "@/lib/services/cities.service";
import { listAreas } from "@/lib/services/areas.service";
import { listCommonStatusTypes } from "@/lib/services/common-status-types.service";
import { listCommonStatuses } from "@/lib/services/common-statuses.service";
import {
  listServiceProductSupplierLocations,
  createServiceProductSupplierLocation,
  updateServiceProductSupplierLocation,
  setServiceProductSupplierLocationActive,
  deleteServiceProductSupplierLocation,
  ServiceProductSupplierLocationsApiError,
} from "@/lib/services/service-product-supplier-locations.service";
import { can } from "@/config/permissions";
import type {
  Area,
  City,
  CommonStatus,
  Country,
  Region,
  RoleDef,
  ServiceProduct,
  ServiceProductLocation,
  ServiceProductLocationType,
  ServiceProductSupplier,
  ServiceProductSupplierLocation,
} from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type StatusFilter = "all" | "active" | "inactive";
const NONE = "none";

function useSupplierLocationSchema(rows: ServiceProductSupplierLocation[], currentId?: number) {
  return z.object({
    serviceProductLocationId: z.number().int().positive().nullable(),
    serviceProductLocationTypeId: z.number().int().positive("Location type is required"),
    countryId: z.number().int().positive("Country is required"),
    regionId: z.number().int().positive().nullable(),
    cityId: z.number().int().positive().nullable(),
    areaId: z.number().int().positive().nullable(),
    supplierLocationCode: z.string().trim().max(100).optional().or(z.literal("")),
    supplierLocationName: z.string().trim().min(1, "Location name is required").max(250),
    supplierLocationReference: z.string().trim().max(200).optional().or(z.literal("")),
    addressLine1: z.string().trim().max(500).optional().or(z.literal("")),
    addressLine2: z.string().trim().max(500).optional().or(z.literal("")),
    postalCode: z.string().trim().max(30).optional().or(z.literal("")),
    latitude: z.string().trim().optional().or(z.literal("")),
    longitude: z.string().trim().optional().or(z.literal("")),
    supplierGooglePlaceId: z.string().trim().max(200).optional().or(z.literal("")),
    locationInstructions: z.string().trim().max(2000).optional().or(z.literal("")),
    isPickupAvailable: z.boolean(),
    isDropoffAvailable: z.boolean(),
    isMeetingPoint: z.boolean(),
    isPrimary: z.boolean(),
    isAvailable: z.boolean(),
    displayOrder: z.preprocess((v) => (v === "" || v == null ? 0 : Number(v)), z.number().int().min(0)),
    commonStatusId: z.number().int().positive("Status is required"),
  }).superRefine((values, ctx) => {
    const duplicate = rows.some(
      (r) =>
        r.serviceProductSupplierLocationId !== currentId &&
        r.supplierLocationName.trim().toLowerCase() === values.supplierLocationName.trim().toLowerCase()
    );
    if (duplicate) {
      ctx.addIssue({ code: "custom", path: ["supplierLocationName"], message: "This location name already exists for this supplier" });
    }
  });
}

type FormValues = z.infer<ReturnType<typeof useSupplierLocationSchema>>;

function blankValues(statuses: CommonStatus[]): FormValues {
  return {
    serviceProductLocationId: null,
    serviceProductLocationTypeId: 0,
    countryId: 0,
    regionId: null,
    cityId: null,
    areaId: null,
    supplierLocationCode: "",
    supplierLocationName: "",
    supplierLocationReference: "",
    addressLine1: "",
    addressLine2: "",
    postalCode: "",
    latitude: "",
    longitude: "",
    supplierGooglePlaceId: "",
    locationInstructions: "",
    isPickupAvailable: false,
    isDropoffAvailable: false,
    isMeetingPoint: false,
    isPrimary: false,
    isAvailable: true,
    displayOrder: 0,
    commonStatusId: statuses.find((s) => s.isInitial)?.commonStatusId ?? statuses[0]?.commonStatusId ?? 0,
  };
}

function SupplierLocationPanel({
  mode,
  row,
  rows,
  supplierLink,
  productLocations,
  locationTypes,
  countries,
  regions,
  statuses,
  userKey,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: ServiceProductSupplierLocation;
  rows: ServiceProductSupplierLocation[];
  supplierLink: ServiceProductSupplier;
  productLocations: ServiceProductLocation[];
  locationTypes: ServiceProductLocationType[];
  countries: Country[];
  regions: Region[];
  statuses: CommonStatus[];
  userKey: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const schema = useSupplierLocationSchema(rows, row?.serviceProductSupplierLocationId);
  const isReadOnly = mode === "view";
  const [cities, setCities] = useState<City[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    values: {
      serviceProductLocationId: row?.serviceProductLocationId ?? null,
      serviceProductLocationTypeId: row?.serviceProductLocationTypeId ?? 0,
      countryId: row?.countryId ?? 0,
      regionId: row?.regionId ?? null,
      cityId: row?.cityId ?? null,
      areaId: row?.areaId ?? null,
      supplierLocationCode: row?.supplierLocationCode ?? "",
      supplierLocationName: row?.supplierLocationName ?? "",
      supplierLocationReference: row?.supplierLocationReference ?? "",
      addressLine1: row?.addressLine1 ?? "",
      addressLine2: row?.addressLine2 ?? "",
      postalCode: row?.postalCode ?? "",
      latitude: row?.latitude != null ? String(row.latitude) : "",
      longitude: row?.longitude != null ? String(row.longitude) : "",
      supplierGooglePlaceId: row?.supplierGooglePlaceId ?? "",
      locationInstructions: row?.locationInstructions ?? "",
      isPickupAvailable: row?.isPickupAvailable ?? false,
      isDropoffAvailable: row?.isDropoffAvailable ?? false,
      isMeetingPoint: row?.isMeetingPoint ?? false,
      isPrimary: row?.isPrimary ?? false,
      isAvailable: row?.isAvailable ?? true,
      displayOrder: row?.displayOrder ?? 0,
      commonStatusId: row?.commonStatusId ?? statuses.find((s) => s.isInitial)?.commonStatusId ?? statuses[0]?.commonStatusId ?? 0,
    },
  });

  const countryId = useWatch({ control, name: "countryId" });
  const cityId = useWatch({ control, name: "cityId" });

  useEffect(() => {
    if (!countryId) {
      setCities([]);
      return;
    }
    let cancelled = false;
    listCities({ countryId, activeOnly: true }).then((r) => !cancelled && setCities(r)).catch(() => !cancelled && setCities([]));
    return () => {
      cancelled = true;
    };
  }, [countryId]);

  useEffect(() => {
    if (!cityId) {
      setAreas([]);
      return;
    }
    let cancelled = false;
    listAreas({ cityId, activeOnly: true }).then((r) => !cancelled && setAreas(r)).catch(() => !cancelled && setAreas([]));
    return () => {
      cancelled = true;
    };
  }, [cityId]);

  async function submit(values: FormValues, keepOpenForMore: boolean) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    const payload = {
      serviceProductSupplierId: supplierLink.serviceProductSupplierId,
      serviceProductLocationId: values.serviceProductLocationId,
      serviceProductLocationTypeId: values.serviceProductLocationTypeId,
      countryId: values.countryId,
      regionId: values.regionId,
      cityId: values.cityId,
      areaId: values.areaId,
      supplierLocationCode: values.supplierLocationCode?.trim() || null,
      supplierLocationName: values.supplierLocationName.trim(),
      supplierLocationReference: values.supplierLocationReference?.trim() || null,
      addressLine1: values.addressLine1?.trim() || null,
      addressLine2: values.addressLine2?.trim() || null,
      postalCode: values.postalCode?.trim() || null,
      latitude: values.latitude?.trim() ? Number(values.latitude) : null,
      longitude: values.longitude?.trim() ? Number(values.longitude) : null,
      supplierGooglePlaceId: values.supplierGooglePlaceId?.trim() || null,
      locationInstructions: values.locationInstructions?.trim() || null,
      isPickupAvailable: values.isPickupAvailable,
      isDropoffAvailable: values.isDropoffAvailable,
      isMeetingPoint: values.isMeetingPoint,
      isPrimary: values.isPrimary,
      isAvailable: values.isAvailable,
      displayOrder: values.displayOrder,
      commonStatusId: values.commonStatusId,
    };
    try {
      if (mode === "edit" && row) {
        await updateServiceProductSupplierLocation(row.serviceProductSupplierLocationId, { ...payload, isActive: row.isActive, modifiedBy: userKey });
        toast.success("Supplier location updated");
      } else if (mode === "create") {
        await createServiceProductSupplierLocation({ ...payload, createdBy: userKey });
        toast.success("Supplier location created");
      }
      await onSaved();
      if (mode === "create" && keepOpenForMore) {
        reset(blankValues(statuses));
        setCities([]);
        setAreas([]);
      } else {
        onClose();
      }
    } catch (error) {
      toast.error(error instanceof ServiceProductSupplierLocationsApiError ? error.message : "Could not save supplier location");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">
            {mode === "create" ? "Add supplier location" : mode === "edit" ? "Edit supplier location" : "Supplier location details"}
          </h2>
          <p className="text-sm text-muted-foreground">Under {supplierLink.supplierName ?? `Supplier #${supplierLink.supplierId}`}</p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit((values) => submit(values, false))} className="grid grid-cols-2 gap-3 sm:grid-cols-4" noValidate>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="supplierLocationName" required>
            Location name
          </Label>
          <Input id="supplierLocationName" disabled={isReadOnly} aria-invalid={!!errors.supplierLocationName} {...register("supplierLocationName")} />
          {errors.supplierLocationName && <p className="text-sm text-destructive">{errors.supplierLocationName.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="supplierLocationCode">Supplier code</Label>
          <Input id="supplierLocationCode" disabled={isReadOnly} placeholder="Supplier's own reference" {...register("supplierLocationCode")} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="supplierLocationReference">Reference</Label>
          <Input id="supplierLocationReference" disabled={isReadOnly} {...register("supplierLocationReference")} />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label>Canonical product location (optional)</Label>
          <Controller
            control={control}
            name="serviceProductLocationId"
            render={({ field }) => (
              <Select value={field.value ? String(field.value) : NONE} onValueChange={(v) => field.onChange(!v || v === NONE ? null : Number(v))} disabled={isReadOnly}>
                <SelectTrigger className="h-10 w-full min-w-0">
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value || value === NONE) return "None (stand-alone)";
                      return productLocations.find((l) => String(l.serviceProductLocationId) === value)?.locationName ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None (stand-alone)</SelectItem>
                  {productLocations.map((l) => (
                    <SelectItem key={l.serviceProductLocationId} value={String(l.serviceProductLocationId)}>
                      {l.locationName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label required>Location type</Label>
          <Controller
            control={control}
            name="serviceProductLocationTypeId"
            render={({ field }) => (
              <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(Number(v))} disabled={isReadOnly}>
                <SelectTrigger className="h-10 w-full min-w-0" aria-invalid={!!errors.serviceProductLocationTypeId}>
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return "Select type";
                      return locationTypes.find((t) => String(t.serviceProductLocationTypeId) === value)?.locationTypeName ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {locationTypes.map((t) => (
                    <SelectItem key={t.serviceProductLocationTypeId} value={String(t.serviceProductLocationTypeId)}>
                      {t.locationTypeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.serviceProductLocationTypeId && <p className="text-sm text-destructive">{errors.serviceProductLocationTypeId.message}</p>}
        </div>

        <div className="space-y-1">
          <Label required>Country</Label>
          <Controller
            control={control}
            name="countryId"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => {
                  field.onChange(Number(v));
                  setValue("cityId", null);
                  setValue("areaId", null);
                }}
                disabled={isReadOnly}
              >
                <SelectTrigger className="h-10 w-full min-w-0" aria-invalid={!!errors.countryId}>
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return "Select country";
                      return countries.find((c) => String(c.countryKey) === value)?.name ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.countryKey} value={String(c.countryKey)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.countryId && <p className="text-sm text-destructive">{errors.countryId.message}</p>}
        </div>

        <div className="space-y-1">
          <Label>Region</Label>
          <Controller
            control={control}
            name="regionId"
            render={({ field }) => (
              <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(v ? Number(v) : null)} disabled={isReadOnly}>
                <SelectTrigger className="h-10 w-full min-w-0">
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return "None";
                      return regions.find((r) => String(r.regionId) === value)?.regionName ?? "None";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {regions.map((r) => (
                    <SelectItem key={r.regionId} value={String(r.regionId)}>
                      {r.regionName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1">
          <Label>City</Label>
          <Controller
            control={control}
            name="cityId"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => {
                  field.onChange(v ? Number(v) : null);
                  setValue("areaId", null);
                }}
                disabled={isReadOnly || !countryId || cities.length === 0}
              >
                <SelectTrigger className="h-10 w-full min-w-0">
                  <SelectValue>
                    {(value: string | null) => {
                      if (!countryId) return "Select country first";
                      if (!value) return "Select city";
                      return cities.find((c) => String(c.cityKey) === value)?.name ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {cities.map((c) => (
                    <SelectItem key={c.cityKey} value={String(c.cityKey)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1">
          <Label>Area</Label>
          <Controller
            control={control}
            name="areaId"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => field.onChange(v ? Number(v) : null)}
                disabled={isReadOnly || !cityId || areas.length === 0}
              >
                <SelectTrigger className="h-10 w-full min-w-0">
                  <SelectValue>
                    {(value: string | null) => {
                      if (!cityId) return "Select city first";
                      if (!value) return "Select area";
                      return areas.find((a) => String(a.areaKey) === value)?.name ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {areas.map((a) => (
                    <SelectItem key={a.areaKey} value={String(a.areaKey)}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="addressLine1">Address line 1</Label>
          <Input id="addressLine1" disabled={isReadOnly} {...register("addressLine1")} />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="addressLine2">Address line 2</Label>
          <Input id="addressLine2" disabled={isReadOnly} {...register("addressLine2")} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="postalCode">Postal code</Label>
          <Input id="postalCode" disabled={isReadOnly} {...register("postalCode")} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="latitude">Latitude</Label>
          <Input id="latitude" disabled={isReadOnly} placeholder="e.g. 25.197197" {...register("latitude")} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="longitude">Longitude</Label>
          <Input id="longitude" disabled={isReadOnly} placeholder="e.g. 55.274376" {...register("longitude")} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="supplierGooglePlaceId">Supplier Google Place ID</Label>
          <Input id="supplierGooglePlaceId" disabled={isReadOnly} {...register("supplierGooglePlaceId")} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="displayOrder">Display order</Label>
          <Input id="displayOrder" type="number" min={0} disabled={isReadOnly} {...register("displayOrder")} />
        </div>

        <div className="space-y-1">
          <Label required>Status</Label>
          <Controller
            control={control}
            name="commonStatusId"
            render={({ field }) => (
              <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(Number(v))} disabled={isReadOnly}>
                <SelectTrigger className="h-10 w-full min-w-0" aria-invalid={!!errors.commonStatusId}>
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return "Select status";
                      return statuses.find((s) => String(s.commonStatusId) === value)?.statusName ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.commonStatusId} value={String(s.commonStatusId)}>
                      {s.statusName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.commonStatusId && <p className="text-sm text-destructive">{errors.commonStatusId.message}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 sm:col-span-4">
          <Controller
            control={control}
            name="isPickupAvailable"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={isReadOnly} />
                Pickup available
              </label>
            )}
          />
          <Controller
            control={control}
            name="isDropoffAvailable"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={isReadOnly} />
                Drop-off available
              </label>
            )}
          />
          <Controller
            control={control}
            name="isMeetingPoint"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={isReadOnly} />
                Meeting point
              </label>
            )}
          />
          <Controller
            control={control}
            name="isPrimary"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={isReadOnly} />
                Primary
              </label>
            )}
          />
          <Controller
            control={control}
            name="isAvailable"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={isReadOnly} />
                Available
              </label>
            )}
          />
        </div>

        <div className="space-y-1 sm:col-span-4">
          <Label htmlFor="locationInstructions">Location instructions</Label>
          <Textarea id="locationInstructions" rows={2} disabled={isReadOnly} {...register("locationInstructions")} />
        </div>

        {mode === "view" && row && (
          <div className="space-y-1">
            <Label>Active</Label>
            <div>
              <Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "active" : "inactive"}</Badge>
            </div>
          </div>
        )}

        {!isReadOnly && (
          <div className="flex items-center gap-2 sm:col-span-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "edit" ? "Save" : "Create"}
            </Button>
            {mode === "create" && (
              <Button type="button" variant="secondary" disabled={isSubmitting} onClick={handleSubmit((values) => submit(values, true))}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Create & add more
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}

export function ProductSupplierLocationTab({ product, roleDef }: { product: ServiceProduct; roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const [supplierLinks, setSupplierLinks] = useState<ServiceProductSupplier[]>([]);
  const [productLocations, setProductLocations] = useState<ServiceProductLocation[]>([]);
  const [locationTypes, setLocationTypes] = useState<ServiceProductLocationType[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [statuses, setStatuses] = useState<CommonStatus[]>([]);
  const [supplierLinkCounts, setSupplierLinkCounts] = useState<Map<number, number>>(new Map());
  const [rows, setRows] = useState<ServiceProductSupplierLocation[]>([]);
  const [loadingSupplierLinks, setLoadingSupplierLinks] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<ServiceProductSupplierLocation | undefined>();
  const [supplierLinkFilter, setSupplierLinkFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const canEdit = can(roleDef, "serviceProductSupplierLocation", "edit");
  const canCreate = can(roleDef, "serviceProductSupplierLocation", "create");
  const canDelete = can(roleDef, "serviceProductSupplierLocation", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  const selectedSupplierLink = supplierLinks.find((s) => s.serviceProductSupplierId === supplierLinkFilter);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listServiceProductLocationTypes({ activeOnly: true }),
      listCountries({ activeOnly: true }),
      listRegions({ activeOnly: true }),
      listCommonStatusTypes({ tenantId: product.tenantId, activeOnly: true }),
    ]).then(async ([locationTypeRows, countryRows, regionRows, statusTypeRows]) => {
      if (cancelled) return;
      setLocationTypes(locationTypeRows);
      setCountries(countryRows);
      setRegions(regionRows);
      const productStatusType = statusTypeRows.find((t) => t.statusTypeCode === "SERVICE_PRODUCT");
      if (productStatusType) {
        const statusRows = await listCommonStatuses({ tenantId: product.tenantId, commonStatusTypeId: productStatusType.commonStatusTypeId, activeOnly: true });
        if (!cancelled) setStatuses(statusRows);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [product.tenantId]);

  useEffect(() => {
    let cancelled = false;
    setLoadingSupplierLinks(true);
    Promise.all([
      listServiceProductSuppliers({ serviceProductId: product.serviceProductId, activeOnly: true }),
      listServiceProductLocations({ serviceProductId: product.serviceProductId, activeOnly: true }),
    ])
      .then(([supplierRows, locationRows]) => {
        if (cancelled) return;
        setSupplierLinks(supplierRows);
        setProductLocations(locationRows);
        setSupplierLinkFilter((current) =>
          current && supplierRows.some((s) => s.serviceProductSupplierId === current) ? current : (supplierRows[0]?.serviceProductSupplierId ?? null)
        );
      })
      .catch((error) => {
        if (!cancelled) toast.error(error instanceof ServiceProductSuppliersApiError ? error.message : "Failed to load supplier links");
      })
      .finally(() => {
        if (!cancelled) setLoadingSupplierLinks(false);
      });
    return () => {
      cancelled = true;
    };
  }, [product.serviceProductId]);

  async function refreshRows() {
    if (!supplierLinkFilter) {
      setRows([]);
      return;
    }
    setLoadingRows(true);
    try {
      const rowsResult = await listServiceProductSupplierLocations({ serviceProductSupplierId: supplierLinkFilter });
      setRows(rowsResult);
      setSupplierLinkCounts((prev) => {
        const next = new Map(prev);
        next.set(supplierLinkFilter, rowsResult.length);
        return next;
      });
    } catch (error) {
      toast.error(error instanceof ServiceProductSupplierLocationsApiError ? error.message : "Failed to load supplier locations");
      setRows([]);
    } finally {
      setLoadingRows(false);
    }
  }

  useEffect(() => {
    void refreshRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierLinkFilter]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = rows;
    if (term) {
      result = result.filter(
        (r) => r.supplierLocationName.toLowerCase().includes(term) || (r.supplierLocationCode ?? "").toLowerCase().includes(term)
      );
    }
    if (statusFilter === "active") result = result.filter((r) => r.isActive);
    if (statusFilter === "inactive") result = result.filter((r) => !r.isActive);
    return result;
  }, [rows, search, statusFilter]);

  async function toggleActive(row: ServiceProductSupplierLocation) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setServiceProductSupplierLocationActive(row.serviceProductSupplierLocationId, !row.isActive, userKey);
      await refreshRows();
      toast.success(row.isActive ? "Supplier location deactivated" : "Supplier location activated");
    } catch (error) {
      toast.error(error instanceof ServiceProductSupplierLocationsApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: ServiceProductSupplierLocation) {
    try {
      await deleteServiceProductSupplierLocation(row.serviceProductSupplierLocationId);
      await refreshRows();
      toast.success("Supplier location deleted");
    } catch (error) {
      toast.error(error instanceof ServiceProductSupplierLocationsApiError ? error.message : "Could not delete supplier location");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Supplier Locations"
        description="A supplier's own locations for this product — may reference a canonical product location, or stand alone."
        actions={
          canCreate && panelMode === "closed" && selectedSupplierLink && locationTypes.length > 0 && statuses.length > 0 ? (
            <Button onClick={() => { setTarget(undefined); setPanelMode("create"); }}>
              <Plus className="h-4 w-4" />
              Add supplier location
            </Button>
          ) : undefined
        }
      />

      {loadingSupplierLinks && <p className="text-sm text-muted-foreground">Loading suppliers…</p>}

      {!loadingSupplierLinks && supplierLinks.length === 0 && (
        <EmptyState icon={Building2} tone="muted" heading="No suppliers linked yet" description="Link a supplier on the Suppliers master first." size="compact" />
      )}

      {supplierLinks.length > 0 && (
        <Select value={supplierLinkFilter ? String(supplierLinkFilter) : ""} onValueChange={(v) => setSupplierLinkFilter(v ? Number(v) : null)}>
          <SelectTrigger className="w-64">
            <SelectValue>
              {(value: string | null) => {
                if (!value) return "Select supplier";
                const s = supplierLinks.find((s) => String(s.serviceProductSupplierId) === value);
                if (!s) return value;
                const label = s.supplierName ?? `Supplier #${s.supplierId}`;
                return `${label} (${supplierLinkCounts.get(s.serviceProductSupplierId) ?? 0})`;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {supplierLinks.map((s) => (
              <SelectItem key={s.serviceProductSupplierId} value={String(s.serviceProductSupplierId)}>
                {s.supplierName ?? `Supplier #${s.supplierId}`} ({supplierLinkCounts.get(s.serviceProductSupplierId) ?? 0})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {panelMode !== "closed" && selectedSupplierLink && (
        <SupplierLocationPanel
          mode={panelMode}
          row={target}
          rows={rows}
          supplierLink={selectedSupplierLink}
          productLocations={productLocations}
          locationTypes={locationTypes}
          countries={countries}
          regions={regions}
          statuses={statuses}
          userKey={userKey}
          onSaved={refreshRows}
          onClose={() => { setPanelMode("closed"); setTarget(undefined); }}
        />
      )}

      {selectedSupplierLink && rows.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search location or code…" value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
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

      {selectedSupplierLink && (
        <Card>
          {loadingRows ? (
            <p className="p-6 text-sm text-muted-foreground">Loading supplier locations…</p>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Building2}
              tone="primary"
              heading="No supplier locations yet"
              description={`Add a location for ${selectedSupplierLink.supplierName ?? "this supplier"}.`}
              size="compact"
            />
          ) : visible.length === 0 ? (
            <EmptyState icon={Search} tone="muted" heading="No matching supplier locations" description="Try a different search or status filter." size="compact" />
          ) : (
            <Table className="table-fixed border-collapse text-xs [&_th]:h-auto [&_th]:whitespace-normal [&_td]:whitespace-normal">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[22%] px-2 py-1.5">Location</TableHead>
                  <TableHead className="w-[16%] px-2 py-1.5">Type</TableHead>
                  <TableHead className="w-[22%] px-2 py-1.5">Country / City / Area</TableHead>
                  <TableHead className="w-[10%] px-2 py-1.5">Order</TableHead>
                  <TableHead className="w-[12%] px-2 py-1.5">Status</TableHead>
                  <TableHead className="w-[18%] px-2 py-1.5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => (
                  <TableRow key={row.serviceProductSupplierLocationId}>
                    <TableCell className="px-2 py-1.5 font-medium leading-tight">
                      <span className="flex items-center gap-1.5">
                        {row.isPrimary && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                        {row.supplierLocationName}
                      </span>
                    </TableCell>
                    <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.locationTypeName ?? "—"}</TableCell>
                    <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">
                      {[row.countryName, row.cityName, row.areaName].filter(Boolean).join(" / ") || "—"}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.displayOrder}</TableCell>
                    <TableCell className="px-2 py-1.5">
                      <Badge variant={row.isActive ? "default" : "secondary"} className="px-1.5 py-0 text-[11px]">
                        {row.isActive ? "active" : "inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Tooltip>
                          <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label="View" onClick={() => { setTarget(row); setPanelMode("view"); }} />}>
                            <Eye className="h-3.5 w-3.5" />
                          </TooltipTrigger>
                          <TooltipContent>View</TooltipContent>
                        </Tooltip>
                        {canEdit && (
                          <>
                            <Tooltip>
                              <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Edit" onClick={() => { setTarget(row); setPanelMode("edit"); }} />}>
                                <Pencil className="h-3.5 w-3.5" />
                              </TooltipTrigger>
                              <TooltipContent>Edit</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label={row.isActive ? "Deactivate" : "Activate"} onClick={() => void toggleActive(row)} />}>
                                {row.isActive ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                              </TooltipTrigger>
                              <TooltipContent>{row.isActive ? "Deactivate" : "Activate"}</TooltipContent>
                            </Tooltip>
                          </>
                        )}
                        {canDelete && (
                          <Tooltip>
                            <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Delete" onClick={() => void removeRow(row)} />}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
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
