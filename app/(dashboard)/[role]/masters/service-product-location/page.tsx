"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, MapPin, Package, Eye, Pencil, Power, PowerOff, Trash2, X, Search, Loader2, Star } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
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
import { useTenantStore, isPlatformMode } from "@/lib/store/tenant.store";
import { useUsersStore } from "@/lib/store/users.store";
import { listServiceTypes, ServiceTypesApiError } from "@/lib/services/service-types.service";
import { listServiceProducts, ServiceProductsApiError } from "@/lib/services/service-products.service";
import { listServiceProductLocationTypes } from "@/lib/services/service-product-location-types.service";
import { listCountries } from "@/lib/services/countries.service";
import { listRegions } from "@/lib/services/regions.service";
import { listCities } from "@/lib/services/cities.service";
import { listAreas } from "@/lib/services/areas.service";
import { listCommonStatusTypes } from "@/lib/services/common-status-types.service";
import { listCommonStatuses } from "@/lib/services/common-statuses.service";
import {
  listServiceProductLocations,
  createServiceProductLocation,
  updateServiceProductLocation,
  setServiceProductLocationActive,
  deleteServiceProductLocation,
  ServiceProductLocationsApiError,
} from "@/lib/services/service-product-locations.service";
import { can } from "@/config/permissions";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
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
  ServiceType,
} from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type StatusFilter = "all" | "active" | "inactive";

function useLocationSchema(rows: ServiceProductLocation[], currentId?: number) {
  return z.object({
    serviceProductLocationTypeId: z.number().int().positive("Location type is required"),
    countryId: z.number().int().positive("Country is required"),
    regionId: z.number().int().positive().nullable(),
    cityId: z.number().int().positive().nullable(),
    areaId: z.number().int().positive().nullable(),
    locationName: z.string().trim().min(1, "Location name is required").max(250),
    addressLine1: z.string().trim().max(500).optional().or(z.literal("")),
    addressLine2: z.string().trim().max(500).optional().or(z.literal("")),
    postalCode: z.string().trim().max(30).optional().or(z.literal("")),
    latitude: z.string().trim().optional().or(z.literal("")),
    longitude: z.string().trim().optional().or(z.literal("")),
    googlePlaceId: z.string().trim().max(200).optional().or(z.literal("")),
    googleMapUrl: z.string().trim().max(1000).optional().or(z.literal("")),
    locationInstructions: z.string().trim().max(2000).optional().or(z.literal("")),
    isPrimary: z.boolean(),
    displayOrder: z.preprocess((v) => (v === "" || v == null ? 0 : Number(v)), z.number().int().min(0)),
    commonStatusId: z.number().int().positive("Status is required"),
  }).superRefine((values, ctx) => {
    const duplicate = rows.some(
      (r) =>
        r.serviceProductLocationId !== currentId &&
        r.locationName.trim().toLowerCase() === values.locationName.trim().toLowerCase()
    );
    if (duplicate) {
      ctx.addIssue({ code: "custom", path: ["locationName"], message: "This location name already exists for this product" });
    }
  });
}

type FormValues = z.infer<ReturnType<typeof useLocationSchema>>;

function blankValues(statuses: CommonStatus[]): FormValues {
  return {
    serviceProductLocationTypeId: 0,
    countryId: 0,
    regionId: null,
    cityId: null,
    areaId: null,
    locationName: "",
    addressLine1: "",
    addressLine2: "",
    postalCode: "",
    latitude: "",
    longitude: "",
    googlePlaceId: "",
    googleMapUrl: "",
    locationInstructions: "",
    isPrimary: false,
    displayOrder: 0,
    commonStatusId: statuses.find((s) => s.isInitial)?.commonStatusId ?? statuses[0]?.commonStatusId ?? 0,
  };
}

function LocationPanel({
  mode,
  row,
  rows,
  product,
  locationTypes,
  countries,
  regions,
  statuses,
  userKey,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: ServiceProductLocation;
  rows: ServiceProductLocation[];
  product: ServiceProduct;
  locationTypes: ServiceProductLocationType[];
  countries: Country[];
  regions: Region[];
  statuses: CommonStatus[];
  userKey: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const schema = useLocationSchema(rows, row?.serviceProductLocationId);
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
      serviceProductLocationTypeId: row?.serviceProductLocationTypeId ?? 0,
      countryId: row?.countryId ?? 0,
      regionId: row?.regionId ?? null,
      cityId: row?.cityId ?? null,
      areaId: row?.areaId ?? null,
      locationName: row?.locationName ?? "",
      addressLine1: row?.addressLine1 ?? "",
      addressLine2: row?.addressLine2 ?? "",
      postalCode: row?.postalCode ?? "",
      latitude: row?.latitude != null ? String(row.latitude) : "",
      longitude: row?.longitude != null ? String(row.longitude) : "",
      googlePlaceId: row?.googlePlaceId ?? "",
      googleMapUrl: row?.googleMapUrl ?? "",
      locationInstructions: row?.locationInstructions ?? "",
      isPrimary: row?.isPrimary ?? false,
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
      serviceProductId: product.serviceProductId,
      serviceProductLocationTypeId: values.serviceProductLocationTypeId,
      countryId: values.countryId,
      regionId: values.regionId,
      cityId: values.cityId,
      areaId: values.areaId,
      locationName: values.locationName.trim(),
      addressLine1: values.addressLine1?.trim() || null,
      addressLine2: values.addressLine2?.trim() || null,
      postalCode: values.postalCode?.trim() || null,
      latitude: values.latitude?.trim() ? Number(values.latitude) : null,
      longitude: values.longitude?.trim() ? Number(values.longitude) : null,
      googlePlaceId: values.googlePlaceId?.trim() || null,
      googleMapUrl: values.googleMapUrl?.trim() || null,
      locationInstructions: values.locationInstructions?.trim() || null,
      isPrimary: values.isPrimary,
      displayOrder: values.displayOrder,
      commonStatusId: values.commonStatusId,
    };
    try {
      if (mode === "edit" && row) {
        await updateServiceProductLocation(row.serviceProductLocationId, { ...payload, isActive: row.isActive, modifiedBy: userKey });
        toast.success("Location updated");
      } else if (mode === "create") {
        await createServiceProductLocation({ ...payload, createdBy: userKey });
        toast.success("Location created");
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
      toast.error(error instanceof ServiceProductLocationsApiError ? error.message : "Could not save location");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">
            {mode === "create" ? "Add location" : mode === "edit" ? "Edit location" : "Location details"}
          </h2>
          <p className="text-sm text-muted-foreground">Under {product.serviceProductName}</p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit((values) => submit(values, false))} className="grid grid-cols-2 gap-3 sm:grid-cols-4" noValidate>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="locationName" required>
            Location name
          </Label>
          <Input id="locationName" disabled={isReadOnly} aria-invalid={!!errors.locationName} {...register("locationName")} />
          {errors.locationName && <p className="text-sm text-destructive">{errors.locationName.message}</p>}
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
          <Label htmlFor="googlePlaceId">Google Place ID</Label>
          <Input id="googlePlaceId" disabled={isReadOnly} {...register("googlePlaceId")} />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="googleMapUrl">Google Map URL</Label>
          <Input id="googleMapUrl" disabled={isReadOnly} {...register("googleMapUrl")} />
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

        <div className="flex items-end pb-2">
          <Controller
            control={control}
            name="isPrimary"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={isReadOnly} />
                Primary location
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

function LocationList({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const activeTenant = useTenantStore((s) => s.tenant);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [products, setProducts] = useState<ServiceProduct[]>([]);
  const [locationTypes, setLocationTypes] = useState<ServiceProductLocationType[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [statuses, setStatuses] = useState<CommonStatus[]>([]);
  const [productCounts, setProductCounts] = useState<Map<number, number>>(new Map());
  const [rows, setRows] = useState<ServiceProductLocation[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<ServiceProductLocation | undefined>();
  const [serviceTypeFilter, setServiceTypeFilter] = useState<number | null>(null);
  const [productFilter, setProductFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const scopeTenantId = platformMode ? 0 : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);

  const canEdit = can(roleDef, "serviceProductLocation", "edit");
  const canCreate = can(roleDef, "serviceProductLocation", "create");
  const canDelete = can(roleDef, "serviceProductLocation", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  const selectedProduct = products.find((p) => p.serviceProductId === productFilter);

  async function loadServiceTypes() {
    if (scopeTenantId <= 0) {
      setServiceTypes([]);
      setLoadingTypes(false);
      setLoadError(platformMode ? "Select a tenant workspace to manage locations." : "Missing tenant scope.");
      return;
    }
    setLoadingTypes(true);
    setLoadError(null);
    try {
      const [typeRows, allProducts, locationTypeRows, countryRows, regionRows, statusTypeRows] = await Promise.all([
        listServiceTypes({ tenantId: scopeTenantId, activeOnly: true }),
        listServiceProducts({ tenantId: scopeTenantId }),
        listServiceProductLocationTypes({ activeOnly: true }),
        listCountries({ activeOnly: true }),
        listRegions({ activeOnly: true }),
        listCommonStatusTypes({ tenantId: scopeTenantId, activeOnly: true }),
      ]);
      setServiceTypes(typeRows);
      setLocationTypes(locationTypeRows);
      setCountries(countryRows);
      setRegions(regionRows);
      const typeProductCounts = new Map<number, number>();
      for (const p of allProducts) {
        typeProductCounts.set(p.serviceTypeId, (typeProductCounts.get(p.serviceTypeId) ?? 0) + 1);
      }
      setServiceTypeFilter((current) => {
        if (current && typeRows.some((t) => t.serviceTypeId === current)) return current;
        const withData = typeRows.find((t) => (typeProductCounts.get(t.serviceTypeId) ?? 0) > 0);
        return withData?.serviceTypeId ?? typeRows[0]?.serviceTypeId ?? null;
      });

      const productStatusType = statusTypeRows.find((t) => t.statusTypeCode === "SERVICE_PRODUCT");
      if (productStatusType) {
        const statusRows = await listCommonStatuses({ tenantId: scopeTenantId, commonStatusTypeId: productStatusType.commonStatusTypeId, activeOnly: true });
        setStatuses(statusRows);
      }
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

  useEffect(() => {
    if (!serviceTypeFilter || scopeTenantId <= 0) {
      setProducts([]);
      setProductFilter(null);
      return;
    }
    let cancelled = false;
    setLoadingProducts(true);
    listServiceProducts({ tenantId: scopeTenantId, serviceTypeId: serviceTypeFilter, activeOnly: true })
      .then((productRows) => {
        if (cancelled) return;
        setProducts(productRows);
        setProductFilter((current) =>
          current && productRows.some((p) => p.serviceProductId === current) ? current : (productRows[0]?.serviceProductId ?? null)
        );
      })
      .catch((error) => {
        if (!cancelled) toast.error(error instanceof ServiceProductsApiError ? error.message : "Failed to load products");
      })
      .finally(() => {
        if (!cancelled) setLoadingProducts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [serviceTypeFilter, scopeTenantId]);

  async function refreshRows() {
    if (!productFilter) {
      setRows([]);
      return;
    }
    setLoadingRows(true);
    try {
      const rowsResult = await listServiceProductLocations({ serviceProductId: productFilter });
      setRows(rowsResult);
      setProductCounts((prev) => {
        const next = new Map(prev);
        next.set(productFilter, rowsResult.length);
        return next;
      });
    } catch (error) {
      toast.error(error instanceof ServiceProductLocationsApiError ? error.message : "Failed to load locations");
      setRows([]);
    } finally {
      setLoadingRows(false);
    }
  }

  useEffect(() => {
    void refreshRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productFilter]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = rows;
    if (term) {
      result = result.filter((r) => r.locationName.toLowerCase().includes(term) || (r.locationTypeName ?? "").toLowerCase().includes(term));
    }
    if (statusFilter === "active") result = result.filter((r) => r.isActive);
    if (statusFilter === "inactive") result = result.filter((r) => !r.isActive);
    return result;
  }, [rows, search, statusFilter]);

  async function toggleActive(row: ServiceProductLocation) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setServiceProductLocationActive(row.serviceProductLocationId, !row.isActive, userKey);
      await refreshRows();
      toast.success(row.isActive ? "Location deactivated" : "Location activated");
    } catch (error) {
      toast.error(error instanceof ServiceProductLocationsApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: ServiceProductLocation) {
    try {
      await deleteServiceProductLocation(row.serviceProductLocationId);
      await refreshRows();
      toast.success("Location deleted");
    } catch (error) {
      toast.error(error instanceof ServiceProductLocationsApiError ? error.message : "Could not delete location");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Service Product Location"
        description="Pickup points, meeting points, destinations, venues, … tied to a Service Product."
        actions={
          canCreate && panelMode === "closed" && selectedProduct && locationTypes.length > 0 && statuses.length > 0 ? (
            <Button
              onClick={() => {
                setTarget(undefined);
                setPanelMode("create");
              }}
            >
              <Plus className="h-4 w-4" />
              Add location
            </Button>
          ) : undefined
        }
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loadingTypes && <p className="text-sm text-muted-foreground">Loading service types…</p>}

      {!loadingTypes && serviceTypes.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={serviceTypeFilter ? String(serviceTypeFilter) : ""} onValueChange={(v) => setServiceTypeFilter(v ? Number(v) : null)}>
            <SelectTrigger className="w-56">
              <SelectValue>
                {(value: string | null) => {
                  if (!value) return "Select service type";
                  return serviceTypes.find((t) => String(t.serviceTypeId) === value)?.serviceTypeName ?? value;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {serviceTypes.map((t) => (
                <SelectItem key={t.serviceTypeId} value={String(t.serviceTypeId)}>
                  {t.serviceTypeName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {loadingProducts ? (
            <p className="text-sm text-muted-foreground">Loading products…</p>
          ) : products.length === 0 ? (
            <p className="text-sm text-muted-foreground">No products under this service type yet.</p>
          ) : (
            <Select value={productFilter ? String(productFilter) : ""} onValueChange={(v) => setProductFilter(v ? Number(v) : null)}>
              <SelectTrigger className="w-64">
                <SelectValue>
                  {(value: string | null) => {
                    if (!value) return "Select product";
                    const p = products.find((p) => String(p.serviceProductId) === value);
                    return p ? `${p.serviceProductName} (${productCounts.get(p.serviceProductId) ?? 0})` : value;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.serviceProductId} value={String(p.serviceProductId)}>
                    {p.serviceProductName} ({productCounts.get(p.serviceProductId) ?? 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {panelMode !== "closed" && selectedProduct && (
        <LocationPanel
          mode={panelMode}
          row={target}
          rows={rows}
          product={selectedProduct}
          locationTypes={locationTypes}
          countries={countries}
          regions={regions}
          statuses={statuses}
          userKey={userKey}
          onSaved={refreshRows}
          onClose={() => {
            setPanelMode("closed");
            setTarget(undefined);
          }}
        />
      )}

      {selectedProduct && rows.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search location or type…" value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
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

      {selectedProduct && (
        <Card>
          {loadingRows ? (
            <p className="p-6 text-sm text-muted-foreground">Loading locations…</p>
          ) : rows.length === 0 ? (
            <EmptyState icon={MapPin} tone="primary" heading="No locations yet" description={`Add a location under ${selectedProduct.serviceProductName}.`} size="compact" />
          ) : visible.length === 0 ? (
            <EmptyState icon={Search} tone="muted" heading="No matching locations" description="Try a different search or status filter." size="compact" />
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
                  <TableRow key={row.serviceProductLocationId}>
                    <TableCell className="px-2 py-1.5 font-medium leading-tight">
                      <span className="flex items-center gap-1.5">
                        {row.isPrimary && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                        {row.locationName}
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

      {!selectedProduct && !loadingTypes && serviceTypes.length > 0 && (
        <EmptyState icon={Package} tone="muted" heading="Select a product" description="Choose a service type and product above to manage its locations." size="compact" />
      )}
    </div>
  );
}

export default function ServiceProductLocationMasterPage() {
  return <AccessGate module="serviceProductLocation">{(roleDef) => <LocationList roleDef={roleDef} />}</AccessGate>;
}
