"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Route, Package, Eye, Pencil, Power, PowerOff, Trash2, X, Search, Loader2, Moon, Star } from "lucide-react";
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
import { listDurationUnits } from "@/lib/services/duration-units.service";
import { listServiceProductLocations } from "@/lib/services/service-product-locations.service";
import { listCommonStatusTypes } from "@/lib/services/common-status-types.service";
import { listCommonStatuses } from "@/lib/services/common-statuses.service";
import {
  listServiceProductItineraries,
  createServiceProductItinerary,
  updateServiceProductItinerary,
  setServiceProductItineraryActive,
  deleteServiceProductItinerary,
  ServiceProductItinerariesApiError,
} from "@/lib/services/service-product-itineraries.service";
import { can } from "@/config/permissions";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import type {
  CommonStatus,
  DurationUnit,
  RoleDef,
  ServiceProduct,
  ServiceProductItinerary,
  ServiceProductLocation,
  ServiceType,
} from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type StatusFilter = "all" | "active" | "inactive";
const NONE = "none";

function useItinerarySchema(rows: ServiceProductItinerary[], currentId?: number) {
  return z.object({
    parentServiceProductItineraryId: z.number().int().positive().nullable(),
    dayNumber: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().positive().nullable()),
    sequenceNumber: z.preprocess((v) => (v === "" || v == null ? 0 : Number(v)), z.number().int().min(0)),
    title: z.string().trim().min(1, "Title is required").max(250),
    description: z.string().trim().max(4000).optional().or(z.literal("")),
    durationValue: z.string().trim().optional().or(z.literal("")),
    durationUnitId: z.number().int().positive().nullable(),
    startTime: z
      .string()
      .trim()
      .regex(/^\d{2}:\d{2}$/, "Use HH:MM")
      .optional()
      .or(z.literal("")),
    endTime: z
      .string()
      .trim()
      .regex(/^\d{2}:\d{2}$/, "Use HH:MM")
      .optional()
      .or(z.literal("")),
    serviceProductLocationId: z.number().int().positive().nullable(),
    isOvernight: z.boolean(),
    isOptional: z.boolean(),
    isHighlight: z.boolean(),
    displayOrder: z.preprocess((v) => (v === "" || v == null ? 0 : Number(v)), z.number().int().min(0)),
    commonStatusId: z.number().int().positive("Status is required"),
  }).superRefine((values, ctx) => {
    if (values.parentServiceProductItineraryId != null && values.parentServiceProductItineraryId === currentId) {
      ctx.addIssue({ code: "custom", path: ["parentServiceProductItineraryId"], message: "A stop cannot be its own parent" });
    }
    if (values.startTime && values.endTime && values.startTime >= values.endTime) {
      ctx.addIssue({ code: "custom", path: ["endTime"], message: "End time must be after start time" });
    }
    const duplicate = rows.some(
      (r) =>
        r.serviceProductItineraryId !== currentId &&
        (r.dayNumber ?? null) === values.dayNumber &&
        r.sequenceNumber === values.sequenceNumber
    );
    if (duplicate) {
      ctx.addIssue({ code: "custom", path: ["sequenceNumber"], message: "This day/sequence combination is already used" });
    }
  });
}

type FormValues = z.infer<ReturnType<typeof useItinerarySchema>>;

function blankValues(statuses: CommonStatus[]): FormValues {
  return {
    parentServiceProductItineraryId: null,
    dayNumber: null,
    sequenceNumber: 0,
    title: "",
    description: "",
    durationValue: "",
    durationUnitId: null,
    startTime: "",
    endTime: "",
    serviceProductLocationId: null,
    isOvernight: false,
    isOptional: false,
    isHighlight: false,
    displayOrder: 0,
    commonStatusId: statuses.find((s) => s.isInitial)?.commonStatusId ?? statuses[0]?.commonStatusId ?? 0,
  };
}

function ItineraryPanel({
  mode,
  row,
  rows,
  product,
  durationUnits,
  locations,
  statuses,
  userKey,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: ServiceProductItinerary;
  rows: ServiceProductItinerary[];
  product: ServiceProduct;
  durationUnits: DurationUnit[];
  locations: ServiceProductLocation[];
  statuses: CommonStatus[];
  userKey: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const schema = useItinerarySchema(rows, row?.serviceProductItineraryId);
  const isReadOnly = mode === "view";
  const parentOptions = rows.filter((r) => r.serviceProductItineraryId !== row?.serviceProductItineraryId);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    values: {
      parentServiceProductItineraryId: row?.parentServiceProductItineraryId ?? null,
      dayNumber: row?.dayNumber ?? null,
      sequenceNumber: row?.sequenceNumber ?? 0,
      title: row?.title ?? "",
      description: row?.description ?? "",
      durationValue: row?.durationValue != null ? String(row.durationValue) : "",
      durationUnitId: row?.durationUnitId ?? null,
      startTime: row?.startTime ?? "",
      endTime: row?.endTime ?? "",
      serviceProductLocationId: row?.serviceProductLocationId ?? null,
      isOvernight: row?.isOvernight ?? false,
      isOptional: row?.isOptional ?? false,
      isHighlight: row?.isHighlight ?? false,
      displayOrder: row?.displayOrder ?? 0,
      commonStatusId: row?.commonStatusId ?? statuses.find((s) => s.isInitial)?.commonStatusId ?? statuses[0]?.commonStatusId ?? 0,
    },
  });

  async function submit(values: FormValues, keepOpenForMore: boolean) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    const payload = {
      serviceProductId: product.serviceProductId,
      parentServiceProductItineraryId: values.parentServiceProductItineraryId,
      dayNumber: values.dayNumber,
      sequenceNumber: values.sequenceNumber,
      title: values.title.trim(),
      description: values.description?.trim() || null,
      durationValue: values.durationValue?.trim() ? Number(values.durationValue) : null,
      durationUnitId: values.durationUnitId,
      startTime: values.startTime || null,
      endTime: values.endTime || null,
      serviceProductLocationId: values.serviceProductLocationId,
      isOvernight: values.isOvernight,
      isOptional: values.isOptional,
      isHighlight: values.isHighlight,
      displayOrder: values.displayOrder,
      commonStatusId: values.commonStatusId,
    };
    try {
      if (mode === "edit" && row) {
        await updateServiceProductItinerary(row.serviceProductItineraryId, { ...payload, isActive: row.isActive, modifiedBy: userKey });
        toast.success("Itinerary stop updated");
      } else if (mode === "create") {
        await createServiceProductItinerary({ ...payload, createdBy: userKey });
        toast.success("Itinerary stop added");
      }
      await onSaved();
      if (mode === "create" && keepOpenForMore) {
        reset(blankValues(statuses));
      } else {
        onClose();
      }
    } catch (error) {
      toast.error(error instanceof ServiceProductItinerariesApiError ? error.message : "Could not save itinerary stop");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">
            {mode === "create" ? "Add itinerary stop" : mode === "edit" ? "Edit itinerary stop" : "Itinerary stop details"}
          </h2>
          <p className="text-sm text-muted-foreground">Under {product.serviceProductName}</p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit((values) => submit(values, false))} className="grid grid-cols-2 gap-3 sm:grid-cols-4" noValidate>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="title" required>
            Title
          </Label>
          <Input id="title" autoFocus={!isReadOnly} disabled={isReadOnly} placeholder="e.g. Visit Old Town Souq" aria-invalid={!!errors.title} {...register("title")} />
          {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="dayNumber">Day number</Label>
          <Input id="dayNumber" type="number" min={1} disabled={isReadOnly} {...register("dayNumber")} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="sequenceNumber" required>
            Sequence
          </Label>
          <Input id="sequenceNumber" type="number" min={0} disabled={isReadOnly} aria-invalid={!!errors.sequenceNumber} {...register("sequenceNumber")} />
          {errors.sequenceNumber && <p className="text-sm text-destructive">{errors.sequenceNumber.message}</p>}
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label>Parent stop (optional)</Label>
          <Controller
            control={control}
            name="parentServiceProductItineraryId"
            render={({ field }) => (
              <Select value={field.value ? String(field.value) : NONE} onValueChange={(v) => field.onChange(!v || v === NONE ? null : Number(v))} disabled={isReadOnly}>
                <SelectTrigger className="h-10 w-full min-w-0" aria-invalid={!!errors.parentServiceProductItineraryId}>
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value || value === NONE) return "None (top level)";
                      return parentOptions.find((p) => String(p.serviceProductItineraryId) === value)?.title ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None (top level)</SelectItem>
                  {parentOptions.map((p) => (
                    <SelectItem key={p.serviceProductItineraryId} value={String(p.serviceProductItineraryId)}>
                      {p.dayNumber != null ? `Day ${p.dayNumber} — ` : ""}
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.parentServiceProductItineraryId && <p className="text-sm text-destructive">{errors.parentServiceProductItineraryId.message}</p>}
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label>Location (optional)</Label>
          <Controller
            control={control}
            name="serviceProductLocationId"
            render={({ field }) => (
              <Select value={field.value ? String(field.value) : NONE} onValueChange={(v) => field.onChange(!v || v === NONE ? null : Number(v))} disabled={isReadOnly}>
                <SelectTrigger className="h-10 w-full min-w-0">
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value || value === NONE) return "None";
                      return locations.find((l) => String(l.serviceProductLocationId) === value)?.locationName ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.serviceProductLocationId} value={String(l.serviceProductLocationId)}>
                      {l.locationName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="startTime">Start time</Label>
          <Input id="startTime" type="time" disabled={isReadOnly} aria-invalid={!!errors.startTime} {...register("startTime")} />
          {errors.startTime && <p className="text-sm text-destructive">{errors.startTime.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="endTime">End time</Label>
          <Input id="endTime" type="time" disabled={isReadOnly} aria-invalid={!!errors.endTime} {...register("endTime")} />
          {errors.endTime && <p className="text-sm text-destructive">{errors.endTime.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="durationValue">Duration</Label>
          <Input id="durationValue" type="number" min={0} step="0.01" disabled={isReadOnly} {...register("durationValue")} />
        </div>

        <div className="space-y-1">
          <Label>Duration unit</Label>
          <Controller
            control={control}
            name="durationUnitId"
            render={({ field }) => (
              <Select value={field.value ? String(field.value) : NONE} onValueChange={(v) => field.onChange(!v || v === NONE ? null : Number(v))} disabled={isReadOnly}>
                <SelectTrigger className="h-10 w-full min-w-0">
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value || value === NONE) return "None";
                      return durationUnits.find((u) => String(u.durationUnitId) === value)?.durationUnitName ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {durationUnits.map((u) => (
                    <SelectItem key={u.durationUnitId} value={String(u.durationUnitId)}>
                      {u.durationUnitName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
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
            name="isOvernight"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={isReadOnly} />
                Overnight
              </label>
            )}
          />
          <Controller
            control={control}
            name="isOptional"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={isReadOnly} />
                Optional
              </label>
            )}
          />
          <Controller
            control={control}
            name="isHighlight"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={isReadOnly} />
                Highlight
              </label>
            )}
          />
        </div>

        <div className="space-y-1 sm:col-span-4">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" rows={3} disabled={isReadOnly} {...register("description")} />
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

function ItineraryList({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const activeTenant = useTenantStore((s) => s.tenant);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [products, setProducts] = useState<ServiceProduct[]>([]);
  const [durationUnits, setDurationUnits] = useState<DurationUnit[]>([]);
  const [locations, setLocations] = useState<ServiceProductLocation[]>([]);
  const [statuses, setStatuses] = useState<CommonStatus[]>([]);
  const [productCounts, setProductCounts] = useState<Map<number, number>>(new Map());
  const [rows, setRows] = useState<ServiceProductItinerary[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<ServiceProductItinerary | undefined>();
  const [serviceTypeFilter, setServiceTypeFilter] = useState<number | null>(null);
  const [productFilter, setProductFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const scopeTenantId = platformMode ? 0 : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);

  const canEdit = can(roleDef, "serviceProductItinerary", "edit");
  const canCreate = can(roleDef, "serviceProductItinerary", "create");
  const canDelete = can(roleDef, "serviceProductItinerary", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  const selectedProduct = products.find((p) => p.serviceProductId === productFilter);

  async function loadServiceTypes() {
    if (scopeTenantId <= 0) {
      setServiceTypes([]);
      setLoadingTypes(false);
      setLoadError(platformMode ? "Select a tenant workspace to manage itineraries." : "Missing tenant scope.");
      return;
    }
    setLoadingTypes(true);
    setLoadError(null);
    try {
      const [typeRows, allProducts, durationUnitRows, statusTypeRows] = await Promise.all([
        listServiceTypes({ tenantId: scopeTenantId, activeOnly: true }),
        listServiceProducts({ tenantId: scopeTenantId }),
        listDurationUnits({ tenantId: scopeTenantId, activeOnly: true }),
        listCommonStatusTypes({ tenantId: scopeTenantId, activeOnly: true }),
      ]);
      setServiceTypes(typeRows);
      setDurationUnits(durationUnitRows);
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
      setLocations([]);
      return;
    }
    setLoadingRows(true);
    try {
      const [rowsResult, locationRows] = await Promise.all([
        listServiceProductItineraries({ serviceProductId: productFilter }),
        listServiceProductLocations({ serviceProductId: productFilter, activeOnly: true }),
      ]);
      setRows(rowsResult);
      setLocations(locationRows);
      setProductCounts((prev) => {
        const next = new Map(prev);
        next.set(productFilter, rowsResult.length);
        return next;
      });
    } catch (error) {
      toast.error(error instanceof ServiceProductItinerariesApiError ? error.message : "Failed to load itinerary stops");
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
      result = result.filter((r) => r.title.toLowerCase().includes(term));
    }
    if (statusFilter === "active") result = result.filter((r) => r.isActive);
    if (statusFilter === "inactive") result = result.filter((r) => !r.isActive);
    return result;
  }, [rows, search, statusFilter]);

  async function toggleActive(row: ServiceProductItinerary) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setServiceProductItineraryActive(row.serviceProductItineraryId, !row.isActive, userKey);
      await refreshRows();
      toast.success(row.isActive ? "Itinerary stop deactivated" : "Itinerary stop activated");
    } catch (error) {
      toast.error(error instanceof ServiceProductItinerariesApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: ServiceProductItinerary) {
    try {
      await deleteServiceProductItinerary(row.serviceProductItineraryId);
      await refreshRows();
      toast.success("Itinerary stop deleted");
    } catch (error) {
      toast.error(error instanceof ServiceProductItinerariesApiError ? error.message : "Could not delete itinerary stop");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Service Product Itinerary"
        description="Day-by-day stops for a Service Product — sequence, timing, location, and highlights."
        actions={
          canCreate && panelMode === "closed" && selectedProduct && statuses.length > 0 ? (
            <Button
              onClick={() => {
                setTarget(undefined);
                setPanelMode("create");
              }}
            >
              <Plus className="h-4 w-4" />
              Add stop
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
        <ItineraryPanel
          mode={panelMode}
          row={target}
          rows={rows}
          product={selectedProduct}
          durationUnits={durationUnits}
          locations={locations}
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
            <Input placeholder="Search title…" value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
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
            <p className="p-6 text-sm text-muted-foreground">Loading itinerary stops…</p>
          ) : rows.length === 0 ? (
            <EmptyState icon={Route} tone="primary" heading="No itinerary stops yet" description={`Add a stop under ${selectedProduct.serviceProductName}.`} size="compact" />
          ) : visible.length === 0 ? (
            <EmptyState icon={Search} tone="muted" heading="No matching stops" description="Try a different search or status filter." size="compact" />
          ) : (
            <Table className="table-fixed border-collapse text-xs [&_th]:h-auto [&_th]:whitespace-normal [&_td]:whitespace-normal">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[10%] px-2 py-1.5">Day</TableHead>
                  <TableHead className="w-[8%] px-2 py-1.5">Seq</TableHead>
                  <TableHead className="w-[24%] px-2 py-1.5">Title</TableHead>
                  <TableHead className="w-[16%] px-2 py-1.5">Time</TableHead>
                  <TableHead className="w-[16%] px-2 py-1.5">Location</TableHead>
                  <TableHead className="w-[12%] px-2 py-1.5">Status</TableHead>
                  <TableHead className="w-[14%] px-2 py-1.5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => (
                  <TableRow key={row.serviceProductItineraryId}>
                    <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.dayNumber ?? "—"}</TableCell>
                    <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.sequenceNumber}</TableCell>
                    <TableCell className="px-2 py-1.5 font-medium leading-tight">
                      <span className="flex items-center gap-1.5">
                        {row.isHighlight && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                        {row.isOvernight && <Moon className="h-3.5 w-3.5 text-muted-foreground" />}
                        {row.title}
                        {row.isOptional && (
                          <Badge variant="outline" className="px-1.5 py-0 text-[11px]">
                            optional
                          </Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">
                      {row.startTime || row.endTime ? `${row.startTime ?? "—"} – ${row.endTime ?? "—"}` : "—"}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.locationName ?? "—"}</TableCell>
                    <TableCell className="px-2 py-1.5 leading-tight">
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
        <EmptyState icon={Package} tone="muted" heading="Select a product" description="Choose a service type and product above to manage its itinerary." size="compact" />
      )}
    </div>
  );
}

export default function ServiceProductItineraryMasterPage() {
  return <AccessGate module="serviceProductItinerary">{(roleDef) => <ItineraryList roleDef={roleDef} />}</AccessGate>;
}
