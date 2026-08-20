"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, CalendarRange, Package, Eye, Pencil, Power, PowerOff, Trash2, X, Search, Loader2 } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore, isPlatformMode } from "@/lib/store/tenant.store";
import { useUsersStore } from "@/lib/store/users.store";
import { listServiceTypes, ServiceTypesApiError } from "@/lib/services/service-types.service";
import { listServiceProducts, ServiceProductsApiError } from "@/lib/services/service-products.service";
import { listServiceProductOptions } from "@/lib/services/service-product-options.service";
import { listServiceProductVariants } from "@/lib/services/service-product-variants.service";
import { listCommonStatusTypes } from "@/lib/services/common-status-types.service";
import { listCommonStatuses } from "@/lib/services/common-statuses.service";
import { listDayOfWeeks } from "@/lib/services/day-of-weeks.service";
import {
  listServiceProductAvailabilities,
  createServiceProductAvailability,
  updateServiceProductAvailability,
  setServiceProductAvailabilityActive,
  deleteServiceProductAvailability,
  ServiceProductAvailabilitiesApiError,
} from "@/lib/services/service-product-availabilities.service";
import { can } from "@/config/permissions";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import type {
  CommonStatus,
  DayOfWeek,
  RoleDef,
  ServiceProduct,
  ServiceProductAvailability,
  ServiceProductOption,
  ServiceProductVariant,
  ServiceType,
} from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type StatusFilter = "all" | "active" | "inactive";

const NONE = "none";

function dateRangesOverlap(aFrom: string | null, aTo: string | null, bFrom: string | null, bTo: string | null): boolean {
  const aStart = aFrom ?? "0000-01-01";
  const aEnd = aTo ?? "9999-12-31";
  const bStart = bFrom ?? "0000-01-01";
  const bEnd = bTo ?? "9999-12-31";
  return aStart <= bEnd && bStart <= aEnd;
}

function baseAvailabilitySchema() {
  return z.object({
    serviceProductOptionId: z.number().int().positive().nullable(),
    serviceProductVariantId: z.number().int().positive().nullable(),
    bookingFromDate: z.string().trim().optional().or(z.literal("")),
    bookingToDate: z.string().trim().optional().or(z.literal("")),
    serviceFromDate: z.string().trim().optional().or(z.literal("")),
    serviceToDate: z.string().trim().optional().or(z.literal("")),
    isAvailable: z.boolean(),
    commonStatusId: z.number().int().positive("Status is required"),
  });
}

function useAvailabilitySchema(rows: ServiceProductAvailability[], currentId?: number) {
  return baseAvailabilitySchema().superRefine((values, ctx) => {
    if (values.bookingFromDate && values.bookingToDate && values.bookingFromDate > values.bookingToDate) {
      ctx.addIssue({ code: "custom", path: ["bookingToDate"], message: "Booking to must be on or after booking from" });
    }
    if (values.serviceFromDate && values.serviceToDate && values.serviceFromDate > values.serviceToDate) {
      ctx.addIssue({ code: "custom", path: ["serviceToDate"], message: "Service to must be on or after service from" });
    }
    const duplicate = rows.some((r) => {
      if (r.serviceProductAvailabilityId === currentId) return false;
      if (r.serviceProductOptionId !== values.serviceProductOptionId) return false;
      if (r.serviceProductVariantId !== values.serviceProductVariantId) return false;
      return dateRangesOverlap(r.serviceFromDate, r.serviceToDate, values.serviceFromDate || null, values.serviceToDate || null);
    });
    if (duplicate) {
      ctx.addIssue({
        code: "custom",
        path: ["serviceProductOptionId"],
        message: "An availability window for this scope already overlaps this service date range",
      });
    }
  });
}

type FormValues = z.infer<ReturnType<typeof baseAvailabilitySchema>>;

function AvailabilityPanel({
  mode,
  row,
  rows,
  product,
  statuses,
  days,
  userKey,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: ServiceProductAvailability;
  rows: ServiceProductAvailability[];
  product: ServiceProduct;
  statuses: CommonStatus[];
  days: DayOfWeek[];
  userKey: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const isReadOnly = mode === "view";
  const schema = useAvailabilitySchema(rows, row?.serviceProductAvailabilityId);
  const [options, setOptions] = useState<ServiceProductOption[]>([]);
  const [variants, setVariants] = useState<ServiceProductVariant[]>([]);
  const [dayAvailability, setDayAvailability] = useState<Map<number, boolean>>(
    () => new Map(days.map((d) => [d.dayOfWeekId, row?.days.find((rd) => rd.dayOfWeekId === d.dayOfWeekId)?.isAvailable ?? true]))
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    values: {
      serviceProductOptionId: row?.serviceProductOptionId ?? null,
      serviceProductVariantId: row?.serviceProductVariantId ?? null,
      bookingFromDate: row?.bookingFromDate ?? "",
      bookingToDate: row?.bookingToDate ?? "",
      serviceFromDate: row?.serviceFromDate ?? "",
      serviceToDate: row?.serviceToDate ?? "",
      isAvailable: row?.isAvailable ?? true,
      commonStatusId: row?.commonStatusId ?? statuses.find((s) => s.isInitial)?.commonStatusId ?? statuses[0]?.commonStatusId ?? 0,
    },
  });

  const selectedOptionId = watch("serviceProductOptionId");

  useEffect(() => {
    listServiceProductOptions({ serviceProductId: product.serviceProductId }).then(setOptions).catch(() => setOptions([]));
  }, [product.serviceProductId]);

  useEffect(() => {
    if (!selectedOptionId) {
      setVariants([]);
      return;
    }
    listServiceProductVariants({ serviceProductOptionId: selectedOptionId }).then(setVariants).catch(() => setVariants([]));
  }, [selectedOptionId]);

  function toggleDay(dayOfWeekId: number) {
    setDayAvailability((prev) => {
      const next = new Map(prev);
      next.set(dayOfWeekId, !(prev.get(dayOfWeekId) ?? true));
      return next;
    });
  }

  function blankValues(): FormValues {
    return {
      serviceProductOptionId: null,
      serviceProductVariantId: null,
      bookingFromDate: "",
      bookingToDate: "",
      serviceFromDate: "",
      serviceToDate: "",
      isAvailable: true,
      commonStatusId: statuses.find((s) => s.isInitial)?.commonStatusId ?? statuses[0]?.commonStatusId ?? 0,
    };
  }

  async function submit(values: FormValues, keepOpenForMore: boolean) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    const payload = {
      serviceProductId: product.serviceProductId,
      serviceProductOptionId: values.serviceProductOptionId,
      serviceProductVariantId: values.serviceProductVariantId,
      bookingFromDate: values.bookingFromDate || null,
      bookingToDate: values.bookingToDate || null,
      serviceFromDate: values.serviceFromDate || null,
      serviceToDate: values.serviceToDate || null,
      isAvailable: values.isAvailable,
      commonStatusId: values.commonStatusId,
      days: days.map((d) => ({ dayOfWeekId: d.dayOfWeekId, isAvailable: dayAvailability.get(d.dayOfWeekId) ?? true })),
    };
    try {
      if (mode === "edit" && row) {
        await updateServiceProductAvailability(row.serviceProductAvailabilityId, { ...payload, isActive: row.isActive, modifiedBy: userKey });
        toast.success("Availability updated");
        await onSaved();
        onClose();
      } else if (mode === "create") {
        await createServiceProductAvailability({ ...payload, createdBy: userKey });
        toast.success("Availability created");
        await onSaved();
        if (keepOpenForMore) {
          reset(blankValues());
          setDayAvailability(new Map(days.map((d) => [d.dayOfWeekId, true])));
        } else {
          onClose();
        }
      }
    } catch (error) {
      toast.error(error instanceof ServiceProductAvailabilitiesApiError ? error.message : "Could not save availability");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">
            {mode === "create" ? "Add availability" : mode === "edit" ? "Edit availability" : "Availability details"}
          </h2>
          <p className="text-sm text-muted-foreground">Under {product.serviceProductName}</p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit((values) => submit(values, false))} className="grid grid-cols-2 gap-3 sm:grid-cols-4" noValidate>
        <div className="space-y-1">
          <Label>Option (optional)</Label>
          <Controller
            control={control}
            name="serviceProductOptionId"
            render={({ field }) => (
              <Select value={field.value ? String(field.value) : NONE} onValueChange={(v) => field.onChange(!v || v === NONE ? null : Number(v))} disabled={isReadOnly}>
                <SelectTrigger className="h-10 w-full min-w-0">
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value || value === NONE) return "All options";
                      return options.find((o) => String(o.serviceProductOptionId) === value)?.optionName ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>All options</SelectItem>
                  {options.map((o) => (
                    <SelectItem key={o.serviceProductOptionId} value={String(o.serviceProductOptionId)}>
                      {o.optionName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.serviceProductOptionId && <p className="text-sm text-destructive">{errors.serviceProductOptionId.message}</p>}
        </div>

        <div className="space-y-1">
          <Label>Variant (optional)</Label>
          <Controller
            control={control}
            name="serviceProductVariantId"
            render={({ field }) => (
              <Select value={field.value ? String(field.value) : NONE} onValueChange={(v) => field.onChange(!v || v === NONE ? null : Number(v))} disabled={isReadOnly || !selectedOptionId}>
                <SelectTrigger className="h-10 w-full min-w-0">
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value || value === NONE) return "All variants";
                      return variants.find((v) => String(v.serviceProductVariantId) === value)?.variantName ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>All variants</SelectItem>
                  {variants.map((v) => (
                    <SelectItem key={v.serviceProductVariantId} value={String(v.serviceProductVariantId)}>
                      {v.variantName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="bookingFromDate">Booking from</Label>
          <Input id="bookingFromDate" type="date" disabled={isReadOnly} {...register("bookingFromDate")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="bookingToDate">Booking to</Label>
          <Input id="bookingToDate" type="date" disabled={isReadOnly} aria-invalid={!!errors.bookingToDate} {...register("bookingToDate")} />
          {errors.bookingToDate && <p className="text-sm text-destructive">{errors.bookingToDate.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="serviceFromDate">Service from</Label>
          <Input id="serviceFromDate" type="date" disabled={isReadOnly} {...register("serviceFromDate")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="serviceToDate">Service to</Label>
          <Input id="serviceToDate" type="date" disabled={isReadOnly} aria-invalid={!!errors.serviceToDate} {...register("serviceToDate")} />
          {errors.serviceToDate && <p className="text-sm text-destructive">{errors.serviceToDate.message}</p>}
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
            name="isAvailable"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={isReadOnly} />
                Available
              </label>
            )}
          />
        </div>

        {mode === "view" && row && (
          <div className="space-y-1">
            <Label>Active</Label>
            <div>
              <Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "active" : "inactive"}</Badge>
            </div>
          </div>
        )}

        <div className="col-span-2 space-y-1 sm:col-span-4">
          <Label>Days of week</Label>
          <div className="flex flex-wrap gap-2">
            {days.map((d) => (
              <label key={d.dayOfWeekId} className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm">
                <Checkbox checked={dayAvailability.get(d.dayOfWeekId) ?? true} onCheckedChange={() => toggleDay(d.dayOfWeekId)} disabled={isReadOnly} />
                {d.shortName}
              </label>
            ))}
          </div>
        </div>

        {!isReadOnly && (
          <div className="col-span-2 flex items-center gap-2 sm:col-span-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "edit" ? "Save" : "Create"}
            </Button>
            {mode === "create" && (
              <Button type="button" variant="secondary" disabled={isSubmitting} onClick={handleSubmit((values) => submit(values, true))}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Create &amp; add more
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

function AvailabilityList({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const activeTenant = useTenantStore((s) => s.tenant);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [products, setProducts] = useState<ServiceProduct[]>([]);
  const [statuses, setStatuses] = useState<CommonStatus[]>([]);
  const [days, setDays] = useState<DayOfWeek[]>([]);
  const [productCounts, setProductCounts] = useState<Map<number, number>>(new Map());
  const [rows, setRows] = useState<ServiceProductAvailability[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<ServiceProductAvailability | undefined>();
  const [serviceTypeFilter, setServiceTypeFilter] = useState<number | null>(null);
  const [productFilter, setProductFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const scopeTenantId = platformMode ? 0 : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);

  const canEdit = can(roleDef, "serviceProductAvailability", "edit");
  const canCreate = can(roleDef, "serviceProductAvailability", "create");
  const canDelete = can(roleDef, "serviceProductAvailability", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  const selectedProduct = products.find((p) => p.serviceProductId === productFilter);

  async function loadServiceTypes() {
    if (scopeTenantId <= 0) {
      setServiceTypes([]);
      setLoadingTypes(false);
      setLoadError(platformMode ? "Select a tenant workspace to manage availability." : "Missing tenant scope.");
      return;
    }
    setLoadingTypes(true);
    setLoadError(null);
    try {
      const [typeRows, statusTypeRows, allProducts, dayRows] = await Promise.all([
        listServiceTypes({ tenantId: scopeTenantId, activeOnly: true }),
        listCommonStatusTypes({ tenantId: scopeTenantId, activeOnly: true }),
        listServiceProducts({ tenantId: scopeTenantId }),
        listDayOfWeeks({ activeOnly: true }),
      ]);
      setServiceTypes(typeRows);
      setDays(dayRows);
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
      const rowsResult = await listServiceProductAvailabilities({ serviceProductId: productFilter });
      setRows(rowsResult);
      setProductCounts((prev) => {
        const next = new Map(prev);
        next.set(productFilter, rowsResult.length);
        return next;
      });
    } catch (error) {
      toast.error(error instanceof ServiceProductAvailabilitiesApiError ? error.message : "Failed to load availability");
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
      result = result.filter((r) => (r.optionName ?? "").toLowerCase().includes(term) || (r.variantName ?? "").toLowerCase().includes(term));
    }
    if (statusFilter === "active") result = result.filter((r) => r.isActive);
    if (statusFilter === "inactive") result = result.filter((r) => !r.isActive);
    return result;
  }, [rows, search, statusFilter]);

  async function toggleActive(row: ServiceProductAvailability) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setServiceProductAvailabilityActive(row.serviceProductAvailabilityId, !row.isActive, userKey);
      await refreshRows();
      toast.success(row.isActive ? "Availability deactivated" : "Availability activated");
    } catch (error) {
      toast.error(error instanceof ServiceProductAvailabilitiesApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: ServiceProductAvailability) {
    try {
      await deleteServiceProductAvailability(row.serviceProductAvailabilityId);
      await refreshRows();
      toast.success("Availability deleted");
    } catch (error) {
      toast.error(error instanceof ServiceProductAvailabilitiesApiError ? error.message : "Could not delete availability");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Service Product Availability"
        description="Booking and service date windows for a product — plus which days of week it runs."
        actions={
          canCreate && panelMode === "closed" && selectedProduct && statuses.length > 0 ? (
            <Button
              onClick={() => {
                setTarget(undefined);
                setPanelMode("create");
              }}
            >
              <Plus className="h-4 w-4" />
              Add availability
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
        <AvailabilityPanel mode={panelMode} row={target} rows={rows} product={selectedProduct} statuses={statuses} days={days} userKey={userKey} onSaved={refreshRows} onClose={() => { setPanelMode("closed"); setTarget(undefined); }} />
      )}

      {selectedProduct && rows.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search option or variant…" value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
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
            <p className="p-6 text-sm text-muted-foreground">Loading availability…</p>
          ) : rows.length === 0 ? (
            <EmptyState icon={CalendarRange} tone="primary" heading="No availability yet" description={`Add availability under ${selectedProduct.serviceProductName}.`} size="compact" />
          ) : visible.length === 0 ? (
            <EmptyState icon={Search} tone="muted" heading="No matching availability" description="Try a different search or status filter." size="compact" />
          ) : (
            <Table className="table-fixed border-collapse text-xs [&_th]:whitespace-normal [&_td]:whitespace-normal">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[16%] px-2 py-1.5">Scope</TableHead>
                  <TableHead className="w-[18%] px-2 py-1.5">Booking window</TableHead>
                  <TableHead className="w-[18%] px-2 py-1.5">Service window</TableHead>
                  <TableHead className="w-[8%] px-2 py-1.5">Days</TableHead>
                  <TableHead className="w-[12%] px-2 py-1.5">Status</TableHead>
                  <TableHead className="w-[10%] px-2 py-1.5">Active</TableHead>
                  <TableHead className="w-[18%] px-2 py-1.5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => (
                  <TableRow key={row.serviceProductAvailabilityId}>
                    <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">
                      {row.variantName ?? row.optionName ?? "Whole product"}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">
                      {row.bookingFromDate ?? "—"}
                      <br />→ {row.bookingToDate ?? "—"}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">
                      {row.serviceFromDate ?? "—"}
                      <br />→ {row.serviceToDate ?? "—"}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">
                      {row.days.filter((d) => d.isAvailable).length}/{row.days.length || days.length}
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <Badge variant="outline" className="px-1.5 py-0 text-[11px]">{row.statusName ?? "—"}</Badge>
                    </TableCell>
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
        <EmptyState icon={Package} tone="muted" heading="Select a product" description="Choose a service type and product above to manage its availability." size="compact" />
      )}
    </div>
  );
}

export default function ServiceProductAvailabilityMasterPage() {
  return <AccessGate module="serviceProductAvailability">{(roleDef) => <AvailabilityList roleDef={roleDef} />}</AccessGate>;
}
