"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, DollarSign, Package, Eye, Pencil, Power, PowerOff, Trash2, X, Search, Loader2 } from "lucide-react";
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
import { listServiceProductSuppliers } from "@/lib/services/service-product-suppliers.service";
import { listServiceProductOptions } from "@/lib/services/service-product-options.service";
import { listServiceProductVariants } from "@/lib/services/service-product-variants.service";
import { listServiceProductSchedules } from "@/lib/services/service-product-schedules.service";
import { listRateTypes } from "@/lib/services/rate-types.service";
import { listCommonStatusTypes } from "@/lib/services/common-status-types.service";
import { listCommonStatuses } from "@/lib/services/common-statuses.service";
import { listDayOfWeeks } from "@/lib/services/day-of-weeks.service";
import {
  listServiceProductRates,
  createServiceProductRate,
  updateServiceProductRate,
  setServiceProductRateActive,
  deleteServiceProductRate,
  ServiceProductRatesApiError,
} from "@/lib/services/service-product-rates.service";
import { can } from "@/config/permissions";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import type {
  CommonStatus,
  DayOfWeek,
  RateType,
  RoleDef,
  ServiceProduct,
  ServiceProductOption,
  ServiceProductRate,
  ServiceProductSchedule,
  ServiceProductSupplier,
  ServiceProductVariant,
  ServiceType,
} from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type StatusFilter = "all" | "active" | "inactive";

const NONE = "none";

/** Two date ranges overlap when open ends are treated as unbounded (null = -Infinity/+Infinity). */
function dateRangesOverlap(aFrom: string | null, aTo: string | null, bFrom: string | null, bTo: string | null): boolean {
  const aStart = aFrom ?? "0000-01-01";
  const aEnd = aTo ?? "9999-12-31";
  const bStart = bFrom ?? "0000-01-01";
  const bEnd = bTo ?? "9999-12-31";
  return aStart <= bEnd && bStart <= aEnd;
}

function baseRateSchema() {
  return z.object({
    rateTypeId: z.number().int().positive("Rate type is required"),
    serviceProductOptionId: z.number().int().positive().nullable(),
    serviceProductVariantId: z.number().int().positive().nullable(),
    serviceProductScheduleId: z.number().int().positive().nullable(),
    minimumPax: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().positive().nullable()),
    maximumPax: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().positive().nullable()),
    minimumQuantity: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().positive().nullable()),
    maximumQuantity: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().positive().nullable()),
    rateAmount: z.preprocess((v) => (v === "" || v == null ? 0 : Number(v)), z.number().positive("Rate amount must be greater than 0")),
    validFrom: z.string().trim().optional().or(z.literal("")),
    validTo: z.string().trim().optional().or(z.literal("")),
    commonStatusId: z.number().int().positive("Status is required"),
  });
}

function useRateSchema(rows: ServiceProductRate[], currentId?: number) {
  return baseRateSchema().superRefine((values, ctx) => {
    if (values.validFrom && values.validTo && values.validFrom > values.validTo) {
      ctx.addIssue({ code: "custom", path: ["validTo"], message: "Valid to must be on or after valid from" });
    }
    if (values.minimumPax != null && values.maximumPax != null && values.minimumPax > values.maximumPax) {
      ctx.addIssue({ code: "custom", path: ["maximumPax"], message: "Max pax must be greater than or equal to min pax" });
    }
    if (values.minimumQuantity != null && values.maximumQuantity != null && values.minimumQuantity > values.maximumQuantity) {
      ctx.addIssue({ code: "custom", path: ["maximumQuantity"], message: "Max quantity must be greater than or equal to min quantity" });
    }

    const duplicate = rows.some((r) => {
      if (r.serviceProductRateId === currentId) return false;
      if (r.rateTypeId !== values.rateTypeId) return false;
      if (r.serviceProductOptionId !== values.serviceProductOptionId) return false;
      if (r.serviceProductVariantId !== values.serviceProductVariantId) return false;
      if (r.serviceProductScheduleId !== values.serviceProductScheduleId) return false;
      return dateRangesOverlap(r.validFrom, r.validTo, values.validFrom || null, values.validTo || null);
    });
    if (duplicate) {
      ctx.addIssue({
        code: "custom",
        path: ["rateTypeId"],
        message: "A rate already exists for this rate type/scope with an overlapping valid date range",
      });
    }
  });
}

type FormValues = z.infer<ReturnType<typeof baseRateSchema>>;

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function ViewField({ label, value, emphasize }: { label: string; value: React.ReactNode; emphasize?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className={emphasize ? "mt-0.5 text-lg font-semibold" : "mt-0.5 text-sm"}>{value}</dd>
    </div>
  );
}

function RateSummary({
  row,
  product,
  supplierLink,
  scheduleLabel,
}: {
  row: ServiceProductRate;
  product: ServiceProduct;
  supplierLink: ServiceProductSupplier;
  scheduleLabel: string | null;
}) {
  const scope = row.variantName ?? row.optionName ?? "Whole product";
  const hasPaxSlab = row.minimumPax != null || row.maximumPax != null;
  const hasQtySlab = row.minimumQuantity != null || row.maximumQuantity != null;
  const activeDays = row.days.filter((d) => d.isActive);
  const daysLabel =
    row.days.length === 0
      ? "Not set"
      : activeDays.length === row.days.length
        ? "Every day"
        : activeDays.length === 0
          ? "No days selected"
          : activeDays.map((d) => d.dayOfWeekName ?? `Day ${d.dayOfWeekId}`).join(", ");
  const validityLabel =
    row.validFrom || row.validTo
      ? `${formatDate(row.validFrom)} through ${formatDate(row.validTo)}`
      : "No date restriction — always valid";

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        {product.serviceProductName} · {supplierLink.supplierName}
      </p>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <ViewField label="Rate type" value={row.rateTypeName ?? `#${row.rateTypeId}`} />
        <ViewField label="Applies to" value={scope} />
        <ViewField label="Rate amount" value={row.rateAmount.toFixed(2)} emphasize />
        {scheduleLabel && <ViewField label="Schedule" value={scheduleLabel} />}
        {hasPaxSlab && (
          <ViewField label="Passenger range" value={`${row.minimumPax ?? "No minimum"} – ${row.maximumPax ?? "No maximum"} pax`} />
        )}
        {hasQtySlab && (
          <ViewField label="Quantity range" value={`${row.minimumQuantity ?? "No minimum"} – ${row.maximumQuantity ?? "No maximum"} units`} />
        )}
        <ViewField label="Valid period" value={validityLabel} />
        <ViewField label="Applicable days" value={daysLabel} />
        <ViewField label="Status" value={<Badge variant="outline">{row.statusName ?? "—"}</Badge>} />
        <ViewField label="Active" value={<Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "Active" : "Inactive"}</Badge>} />
      </dl>
    </div>
  );
}

function RatePanel({
  mode,
  row,
  rows,
  product,
  supplierLink,
  rateTypes,
  statuses,
  days,
  userKey,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: ServiceProductRate;
  rows: ServiceProductRate[];
  product: ServiceProduct;
  supplierLink: ServiceProductSupplier;
  rateTypes: RateType[];
  statuses: CommonStatus[];
  days: DayOfWeek[];
  userKey: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const isReadOnly = mode === "view";
  const schema = useRateSchema(rows, row?.serviceProductRateId);
  const [options, setOptions] = useState<ServiceProductOption[]>([]);
  const [variants, setVariants] = useState<ServiceProductVariant[]>([]);
  const [schedules, setSchedules] = useState<ServiceProductSchedule[]>([]);
  const [dayActive, setDayActive] = useState<Map<number, boolean>>(
    () => new Map(days.map((d) => [d.dayOfWeekId, row?.days.find((rd) => rd.dayOfWeekId === d.dayOfWeekId)?.isActive ?? true]))
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
      rateTypeId: row?.rateTypeId ?? 0,
      serviceProductOptionId: row?.serviceProductOptionId ?? null,
      serviceProductVariantId: row?.serviceProductVariantId ?? null,
      serviceProductScheduleId: row?.serviceProductScheduleId ?? null,
      minimumPax: row?.minimumPax ?? null,
      maximumPax: row?.maximumPax ?? null,
      minimumQuantity: row?.minimumQuantity ?? null,
      maximumQuantity: row?.maximumQuantity ?? null,
      rateAmount: row?.rateAmount ?? 0,
      validFrom: row?.validFrom ?? "",
      validTo: row?.validTo ?? "",
      commonStatusId: row?.commonStatusId ?? statuses.find((s) => s.isInitial)?.commonStatusId ?? statuses[0]?.commonStatusId ?? 0,
    },
  });

  const selectedOptionId = watch("serviceProductOptionId");

  useEffect(() => {
    listServiceProductOptions({ serviceProductId: product.serviceProductId }).then(setOptions).catch(() => setOptions([]));
    listServiceProductSchedules({ serviceProductId: product.serviceProductId }).then(setSchedules).catch(() => setSchedules([]));
  }, [product.serviceProductId]);

  useEffect(() => {
    if (!selectedOptionId) {
      setVariants([]);
      return;
    }
    listServiceProductVariants({ serviceProductOptionId: selectedOptionId }).then(setVariants).catch(() => setVariants([]));
  }, [selectedOptionId]);

  function toggleDay(dayOfWeekId: number) {
    setDayActive((prev) => {
      const next = new Map(prev);
      next.set(dayOfWeekId, !(prev.get(dayOfWeekId) ?? true));
      return next;
    });
  }

  function blankValues(): FormValues {
    return {
      rateTypeId: 0,
      serviceProductOptionId: null,
      serviceProductVariantId: null,
      serviceProductScheduleId: null,
      minimumPax: null,
      maximumPax: null,
      minimumQuantity: null,
      maximumQuantity: null,
      rateAmount: 0,
      validFrom: "",
      validTo: "",
      commonStatusId: statuses.find((s) => s.isInitial)?.commonStatusId ?? statuses[0]?.commonStatusId ?? 0,
    };
  }

  async function submitRate(values: FormValues, keepOpenForMore: boolean) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    const payload = {
      serviceProductId: product.serviceProductId,
      serviceProductSupplierId: supplierLink.serviceProductSupplierId,
      serviceProductOptionId: values.serviceProductOptionId,
      serviceProductVariantId: values.serviceProductVariantId,
      serviceProductScheduleId: values.serviceProductScheduleId,
      rateTypeId: values.rateTypeId,
      minimumPax: values.minimumPax,
      maximumPax: values.maximumPax,
      minimumQuantity: values.minimumQuantity,
      maximumQuantity: values.maximumQuantity,
      rateAmount: values.rateAmount,
      validFrom: values.validFrom || null,
      validTo: values.validTo || null,
      commonStatusId: values.commonStatusId,
      days: days.map((d) => ({ dayOfWeekId: d.dayOfWeekId, isActive: dayActive.get(d.dayOfWeekId) ?? true })),
    };
    try {
      if (mode === "edit" && row) {
        await updateServiceProductRate(row.serviceProductRateId, { ...payload, isActive: row.isActive, modifiedBy: userKey });
        toast.success("Rate updated");
        await onSaved();
        onClose();
      } else if (mode === "create") {
        await createServiceProductRate({ ...payload, createdBy: userKey });
        toast.success("Rate created");
        await onSaved();
        if (keepOpenForMore) {
          reset(blankValues());
          setDayActive(new Map(days.map((d) => [d.dayOfWeekId, true])));
        } else {
          onClose();
        }
      }
    } catch (error) {
      toast.error(error instanceof ServiceProductRatesApiError ? error.message : "Could not save rate");
    }
  }

  const scheduleLabel = row?.serviceProductScheduleId
    ? (() => {
        const s = schedules.find((s) => s.serviceProductScheduleId === row.serviceProductScheduleId);
        return s ? `${s.dayOfWeekName ?? "Every day"} ${s.startTime ?? ""}${s.endTime ? ` – ${s.endTime}` : ""}`.trim() : null;
      })()
    : null;

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">{mode === "create" ? "Add rate" : mode === "edit" ? "Edit rate" : "Rate details"}</h2>
          {mode !== "view" && (
            <p className="text-sm text-muted-foreground">
              {product.serviceProductName} · {supplierLink.supplierName}
            </p>
          )}
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {mode === "view" && row ? (
        <RateSummary row={row} product={product} supplierLink={supplierLink} scheduleLabel={scheduleLabel} />
      ) : (
      <form onSubmit={handleSubmit((values) => submitRate(values, false))} className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6" noValidate>
        <div className="space-y-1">
          <Label required>Rate type</Label>
          <Controller
            control={control}
            name="rateTypeId"
            render={({ field }) => (
              <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(Number(v))} disabled={isReadOnly}>
                <SelectTrigger className="h-10 w-full min-w-0" aria-invalid={!!errors.rateTypeId}>
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return "Select rate type";
                      return rateTypes.find((r) => String(r.rateTypeId) === value)?.rateTypeName ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {rateTypes.map((r) => (
                    <SelectItem key={r.rateTypeId} value={String(r.rateTypeId)}>
                      {r.rateTypeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.rateTypeId && <p className="text-sm text-destructive">{errors.rateTypeId.message}</p>}
        </div>

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
                      if (!value || value === NONE) return "Any option";
                      return options.find((o) => String(o.serviceProductOptionId) === value)?.optionName ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Any option</SelectItem>
                  {options.map((o) => (
                    <SelectItem key={o.serviceProductOptionId} value={String(o.serviceProductOptionId)}>
                      {o.optionName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
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
                      if (!value || value === NONE) return "Any variant";
                      return variants.find((v) => String(v.serviceProductVariantId) === value)?.variantName ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Any variant</SelectItem>
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
          <Label>Schedule (optional)</Label>
          <Controller
            control={control}
            name="serviceProductScheduleId"
            render={({ field }) => (
              <Select value={field.value ? String(field.value) : NONE} onValueChange={(v) => field.onChange(!v || v === NONE ? null : Number(v))} disabled={isReadOnly}>
                <SelectTrigger className="h-10 w-full min-w-0">
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value || value === NONE) return "Any schedule";
                      const s = schedules.find((s) => String(s.serviceProductScheduleId) === value);
                      return s ? `${s.dayOfWeekName ?? "Every day"} ${s.startTime ?? ""}` : value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Any schedule</SelectItem>
                  {schedules.map((s) => (
                    <SelectItem key={s.serviceProductScheduleId} value={String(s.serviceProductScheduleId)}>
                      {s.dayOfWeekName ?? "Every day"} {s.startTime ?? ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="minimumPax">Min pax</Label>
          <Input id="minimumPax" type="number" min={1} disabled={isReadOnly} {...register("minimumPax")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="maximumPax">Max pax</Label>
          <Input id="maximumPax" type="number" min={1} disabled={isReadOnly} {...register("maximumPax")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="minimumQuantity">Min qty</Label>
          <Input id="minimumQuantity" type="number" min={0} step="0.01" disabled={isReadOnly} {...register("minimumQuantity")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="maximumQuantity">Max qty</Label>
          <Input id="maximumQuantity" type="number" min={0} step="0.01" disabled={isReadOnly} {...register("maximumQuantity")} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="rateAmount" required>
            Rate amount
          </Label>
          <Input id="rateAmount" type="number" min={0} step="0.01" disabled={isReadOnly} aria-invalid={!!errors.rateAmount} {...register("rateAmount")} />
          {errors.rateAmount && <p className="text-sm text-destructive">{errors.rateAmount.message}</p>}
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

        <div className="space-y-1">
          <Label htmlFor="validFrom">Valid from</Label>
          <Input id="validFrom" type="date" disabled={isReadOnly} {...register("validFrom")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="validTo">Valid to</Label>
          <Input id="validTo" type="date" disabled={isReadOnly} {...register("validTo")} />
        </div>

        <div className="col-span-2 space-y-1 sm:col-span-3 xl:col-span-6">
          <Label>Days of week</Label>
          <div className="flex flex-wrap gap-2">
            {days.map((d) => (
              <label key={d.dayOfWeekId} className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm">
                <Checkbox checked={dayActive.get(d.dayOfWeekId) ?? true} onCheckedChange={() => toggleDay(d.dayOfWeekId)} disabled={isReadOnly} />
                {d.shortName}
              </label>
            ))}
          </div>
        </div>

        <div className="col-span-2 flex items-center gap-2 sm:col-span-3 xl:col-span-6">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "edit" ? "Save" : "Create"}
          </Button>
          {mode === "create" && (
            <Button
              type="button"
              variant="secondary"
              disabled={isSubmitting}
              onClick={handleSubmit((values) => submitRate(values, true))}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create &amp; add more
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
      )}
    </Card>
  );
}

function RateList({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const activeTenant = useTenantStore((s) => s.tenant);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [products, setProducts] = useState<ServiceProduct[]>([]);
  const [supplierLinks, setSupplierLinks] = useState<ServiceProductSupplier[]>([]);
  const [rateTypes, setRateTypes] = useState<RateType[]>([]);
  const [statuses, setStatuses] = useState<CommonStatus[]>([]);
  const [days, setDays] = useState<DayOfWeek[]>([]);
  const [supplierLinkCounts, setSupplierLinkCounts] = useState<Map<number, number>>(new Map());
  const [rows, setRows] = useState<ServiceProductRate[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingSupplierLinks, setLoadingSupplierLinks] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<ServiceProductRate | undefined>();
  const [serviceTypeFilter, setServiceTypeFilter] = useState<number | null>(null);
  const [productFilter, setProductFilter] = useState<number | null>(null);
  const [supplierLinkFilter, setSupplierLinkFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const scopeTenantId = platformMode ? 0 : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);

  const canEdit = can(roleDef, "serviceProductRate", "edit");
  const canCreate = can(roleDef, "serviceProductRate", "create");
  const canDelete = can(roleDef, "serviceProductRate", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  const selectedProduct = products.find((p) => p.serviceProductId === productFilter);
  const selectedSupplierLink = supplierLinks.find((s) => s.serviceProductSupplierId === supplierLinkFilter);

  async function loadServiceTypes() {
    if (scopeTenantId <= 0) {
      setServiceTypes([]);
      setLoadingTypes(false);
      setLoadError(platformMode ? "Select a tenant workspace to manage rates." : "Missing tenant scope.");
      return;
    }
    setLoadingTypes(true);
    setLoadError(null);
    try {
      const [typeRows, statusTypeRows, allProducts, rateTypeRows, dayRows] = await Promise.all([
        listServiceTypes({ tenantId: scopeTenantId, activeOnly: true }),
        listCommonStatusTypes({ tenantId: scopeTenantId, activeOnly: true }),
        listServiceProducts({ tenantId: scopeTenantId }),
        listRateTypes({ tenantId: scopeTenantId, activeOnly: true }),
        listDayOfWeeks({ activeOnly: true }),
      ]);
      setServiceTypes(typeRows);
      setRateTypes(rateTypeRows);
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

  useEffect(() => {
    if (!productFilter) {
      setSupplierLinks([]);
      setSupplierLinkFilter(null);
      return;
    }
    let cancelled = false;
    setLoadingSupplierLinks(true);
    Promise.all([
      listServiceProductSuppliers({ serviceProductId: productFilter, activeOnly: true }),
      listServiceProductRates({ serviceProductId: productFilter }),
    ])
      .then(([linkRows, allRates]) => {
        if (cancelled) return;
        setSupplierLinks(linkRows);
        const counts = new Map<number, number>();
        for (const r of allRates) counts.set(r.serviceProductSupplierId, (counts.get(r.serviceProductSupplierId) ?? 0) + 1);
        setSupplierLinkCounts(counts);
        setSupplierLinkFilter((current) =>
          current && linkRows.some((s) => s.serviceProductSupplierId === current) ? current : (linkRows[0]?.serviceProductSupplierId ?? null)
        );
      })
      .catch((error) => {
        if (!cancelled) toast.error(error instanceof ServiceProductRatesApiError ? error.message : "Failed to load supplier links");
      })
      .finally(() => {
        if (!cancelled) setLoadingSupplierLinks(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productFilter]);

  async function refreshRows() {
    if (!supplierLinkFilter) {
      setRows([]);
      return;
    }
    setLoadingRows(true);
    try {
      const rowsResult = await listServiceProductRates({ serviceProductSupplierId: supplierLinkFilter });
      setRows(rowsResult);
      setSupplierLinkCounts((prev) => {
        const next = new Map(prev);
        next.set(supplierLinkFilter, rowsResult.length);
        return next;
      });
    } catch (error) {
      toast.error(error instanceof ServiceProductRatesApiError ? error.message : "Failed to load rates");
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
      result = result.filter((r) => (r.rateTypeName ?? "").toLowerCase().includes(term) || (r.optionName ?? "").toLowerCase().includes(term));
    }
    if (statusFilter === "active") result = result.filter((r) => r.isActive);
    if (statusFilter === "inactive") result = result.filter((r) => !r.isActive);
    return result;
  }, [rows, search, statusFilter]);

  async function toggleActive(row: ServiceProductRate) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setServiceProductRateActive(row.serviceProductRateId, !row.isActive, userKey);
      await refreshRows();
      toast.success(row.isActive ? "Rate deactivated" : "Rate activated");
    } catch (error) {
      toast.error(error instanceof ServiceProductRatesApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: ServiceProductRate) {
    try {
      await deleteServiceProductRate(row.serviceProductRateId);
      await refreshRows();
      toast.success("Rate deleted");
    } catch (error) {
      toast.error(error instanceof ServiceProductRatesApiError ? error.message : "Could not delete rate");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Service Product Rate"
        description="Supplier rates by rate type — Adult, Child, Vehicle, … — optionally scoped to an option, variant, or schedule."
        actions={
          canCreate && panelMode === "closed" && selectedSupplierLink && statuses.length > 0 && rateTypes.length > 0 ? (
            <Button
              onClick={() => {
                setTarget(undefined);
                setPanelMode("create");
              }}
            >
              <Plus className="h-4 w-4" />
              Add rate
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
                    return products.find((p) => String(p.serviceProductId) === value)?.serviceProductName ?? value;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.serviceProductId} value={String(p.serviceProductId)}>
                    {p.serviceProductName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {loadingSupplierLinks ? (
            <p className="text-sm text-muted-foreground">Loading suppliers…</p>
          ) : productFilter && supplierLinks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No suppliers linked yet — link one first.</p>
          ) : (
            <Select value={supplierLinkFilter ? String(supplierLinkFilter) : ""} onValueChange={(v) => setSupplierLinkFilter(v ? Number(v) : null)}>
              <SelectTrigger className="w-64">
                <SelectValue>
                  {(value: string | null) => {
                    if (!value) return "Select supplier";
                    const s = supplierLinks.find((s) => String(s.serviceProductSupplierId) === value);
                    return s ? `${s.supplierName} (${supplierLinkCounts.get(s.serviceProductSupplierId) ?? 0})` : value;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {supplierLinks.map((s) => (
                  <SelectItem key={s.serviceProductSupplierId} value={String(s.serviceProductSupplierId)}>
                    {s.supplierName} ({supplierLinkCounts.get(s.serviceProductSupplierId) ?? 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {panelMode !== "closed" && selectedProduct && selectedSupplierLink && (
        <RatePanel mode={panelMode} row={target} rows={rows} product={selectedProduct} supplierLink={selectedSupplierLink} rateTypes={rateTypes} statuses={statuses} days={days} userKey={userKey} onSaved={refreshRows} onClose={() => { setPanelMode("closed"); setTarget(undefined); }} />
      )}

      {selectedSupplierLink && rows.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search rate type or option…" value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
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
            <p className="p-6 text-sm text-muted-foreground">Loading rates…</p>
          ) : rows.length === 0 ? (
            <EmptyState icon={DollarSign} tone="primary" heading="No rates yet" description={`Add a rate for ${selectedSupplierLink.supplierName}.`} size="compact" />
          ) : visible.length === 0 ? (
            <EmptyState icon={Search} tone="muted" heading="No matching rates" description="Try a different search or status filter." size="compact" />
          ) : (
            <Table className="table-fixed border-collapse text-xs [&_th]:h-auto [&_th]:whitespace-normal [&_td]:whitespace-normal">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[12%] px-2 py-1.5">Rate type</TableHead>
                  <TableHead className="w-[13%] px-2 py-1.5">Scope</TableHead>
                  <TableHead className="w-[13%] px-2 py-1.5">Pax / Qty slab</TableHead>
                  <TableHead className="w-[9%] px-2 py-1.5">Amount</TableHead>
                  <TableHead className="w-[7%] px-2 py-1.5">Days</TableHead>
                  <TableHead className="w-[16%] px-2 py-1.5">Valid</TableHead>
                  <TableHead className="w-[14%] px-2 py-1.5">Status</TableHead>
                  <TableHead className="w-[16%] px-2 py-1.5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => (
                  <TableRow key={row.serviceProductRateId}>
                    <TableCell className="px-2 py-1.5 font-medium leading-tight">{row.rateTypeName ?? `#${row.rateTypeId}`}</TableCell>
                    <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.variantName ?? row.optionName ?? "Whole product"}</TableCell>
                    <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">
                      {row.minimumPax != null || row.maximumPax != null
                        ? `${row.minimumPax ?? "—"}–${row.maximumPax ?? "—"} pax`
                        : row.minimumQuantity != null || row.maximumQuantity != null
                          ? `${row.minimumQuantity ?? "—"}–${row.maximumQuantity ?? "—"} qty`
                          : "—"}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 font-mono font-medium leading-tight">{row.rateAmount.toFixed(2)}</TableCell>
                    <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">
                      {row.days.filter((d) => d.isActive).length}/{row.days.length || days.length}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">
                      {row.validFrom ?? "—"}
                      <br />→ {row.validTo ?? "—"}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 leading-tight">
                      <div className="flex flex-col items-start gap-1">
                        <Badge variant="outline" className="px-1.5 py-0 text-[11px]">
                          {row.statusName ?? "—"}
                        </Badge>
                        <Badge variant={row.isActive ? "default" : "secondary"} className="px-1.5 py-0 text-[11px]">
                          {row.isActive ? "active" : "inactive"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="View"
                                onClick={() => {
                                  setTarget(row);
                                  setPanelMode("view");
                                }}
                              />
                            }
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </TooltipTrigger>
                          <TooltipContent>View</TooltipContent>
                        </Tooltip>
                        {canEdit && (
                          <>
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Edit"
                                    onClick={() => {
                                      setTarget(row);
                                      setPanelMode("edit");
                                    }}
                                  />
                                }
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </TooltipTrigger>
                              <TooltipContent>Edit</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={row.isActive ? "Deactivate" : "Activate"}
                                    onClick={() => void toggleActive(row)}
                                  />
                                }
                              >
                                {row.isActive ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                              </TooltipTrigger>
                              <TooltipContent>{row.isActive ? "Deactivate" : "Activate"}</TooltipContent>
                            </Tooltip>
                          </>
                        )}
                        {canDelete && (
                          <Tooltip>
                            <TooltipTrigger
                              render={<Button variant="ghost" size="icon-sm" aria-label="Delete" onClick={() => void removeRow(row)} />}
                            >
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

      {!selectedSupplierLink && !loadingTypes && serviceTypes.length > 0 && (
        <EmptyState icon={Package} tone="muted" heading="Select a supplier" description="Choose a service type, product, and supplier above to manage its rates." size="compact" />
      )}
    </div>
  );
}

export default function ServiceProductRateMasterPage() {
  return <AccessGate module="serviceProductRate">{(roleDef) => <RateList roleDef={roleDef} />}</AccessGate>;
}
