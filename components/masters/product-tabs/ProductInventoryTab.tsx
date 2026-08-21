"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Warehouse, Eye, Pencil, Power, PowerOff, Trash2, X, Loader2 } from "lucide-react";
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
import { useUsersStore } from "@/lib/store/users.store";
import { listServiceProductSuppliers } from "@/lib/services/service-product-suppliers.service";
import { listServiceProductOptions } from "@/lib/services/service-product-options.service";
import { listServiceProductVariants } from "@/lib/services/service-product-variants.service";
import { listServiceProductSchedules } from "@/lib/services/service-product-schedules.service";
import { listInventoryTypes } from "@/lib/services/property-contract-inventories.service";
import {
  listServiceProductInventories,
  createServiceProductInventory,
  updateServiceProductInventory,
  setServiceProductInventoryActive,
  deleteServiceProductInventory,
  ServiceProductInventoriesApiError,
} from "@/lib/services/service-product-inventories.service";
import { can } from "@/config/permissions";
import type {
  InventoryType,
  RoleDef,
  ServiceProduct,
  ServiceProductInventory,
  ServiceProductOption,
  ServiceProductSchedule,
  ServiceProductSupplier,
  ServiceProductVariant,
} from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type StatusFilter = "all" | "active" | "inactive";
const NONE = "none";

const DAY_FIELDS = [
  { key: "isMonday", label: "Mon" },
  { key: "isTuesday", label: "Tue" },
  { key: "isWednesday", label: "Wed" },
  { key: "isThursday", label: "Thu" },
  { key: "isFriday", label: "Fri" },
  { key: "isSaturday", label: "Sat" },
  { key: "isSunday", label: "Sun" },
] as const;

const periodSchema = z.object({
  fromDate: z.string().trim().min(1, "From date is required"),
  toDate: z.string().trim().min(1, "To date is required"),
  isMonday: z.boolean(),
  isTuesday: z.boolean(),
  isWednesday: z.boolean(),
  isThursday: z.boolean(),
  isFriday: z.boolean(),
  isSaturday: z.boolean(),
  isSunday: z.boolean(),
  allotmentQty: z.number().int().min(0),
  releaseDays: z.number().int().min(0),
  isActive: z.boolean(),
});

const schema = z
  .object({
    serviceProductSupplierId: z.number().int().positive().nullable(),
    serviceProductOptionId: z.number().int().positive().nullable(),
    serviceProductVariantId: z.number().int().positive().nullable(),
    serviceProductScheduleId: z.number().int().positive().nullable(),
    inventoryTypeId: z.number().int().positive("Inventory type is required"),
    validFrom: z.string().trim().optional().or(z.literal("")),
    validTo: z.string().trim().optional().or(z.literal("")),
    isActive: z.boolean(),
    periods: z.array(periodSchema),
  })
  .superRefine((values, ctx) => {
    if (values.validFrom && values.validTo && values.validFrom > values.validTo) {
      ctx.addIssue({ code: "custom", path: ["validTo"], message: "Valid to must be on or after valid from" });
    }
    values.periods.forEach((p, i) => {
      if (p.fromDate > p.toDate) {
        ctx.addIssue({ code: "custom", path: [`periods.${i}.toDate`], message: "To date must be on or after from date" });
      }
    });
  });

type FormValues = z.infer<typeof schema>;

function blankValues(): FormValues {
  return {
    serviceProductSupplierId: null,
    serviceProductOptionId: null,
    serviceProductVariantId: null,
    serviceProductScheduleId: null,
    inventoryTypeId: 0,
    validFrom: "",
    validTo: "",
    isActive: true,
    periods: [],
  };
}

function blankPeriod(): FormValues["periods"][number] {
  return {
    fromDate: "",
    toDate: "",
    isMonday: true,
    isTuesday: true,
    isWednesday: true,
    isThursday: true,
    isFriday: true,
    isSaturday: true,
    isSunday: true,
    allotmentQty: 0,
    releaseDays: 0,
    isActive: true,
  };
}

function InventoryPanel({
  mode,
  row,
  product,
  supplierLinks,
  options,
  schedules,
  inventoryTypes,
  userKey,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: ServiceProductInventory;
  product: ServiceProduct;
  supplierLinks: ServiceProductSupplier[];
  options: ServiceProductOption[];
  schedules: ServiceProductSchedule[];
  inventoryTypes: InventoryType[];
  userKey: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const isReadOnly = mode === "view";
  const [variants, setVariants] = useState<ServiceProductVariant[]>([]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: row
      ? {
          serviceProductSupplierId: row.serviceProductSupplierId,
          serviceProductOptionId: row.serviceProductOptionId,
          serviceProductVariantId: row.serviceProductVariantId,
          serviceProductScheduleId: row.serviceProductScheduleId,
          inventoryTypeId: row.inventoryTypeId,
          validFrom: row.validFrom ?? "",
          validTo: row.validTo ?? "",
          isActive: row.isActive,
          periods: row.periods.map((p) => ({
            fromDate: p.fromDate,
            toDate: p.toDate,
            isMonday: p.isMonday,
            isTuesday: p.isTuesday,
            isWednesday: p.isWednesday,
            isThursday: p.isThursday,
            isFriday: p.isFriday,
            isSaturday: p.isSaturday,
            isSunday: p.isSunday,
            allotmentQty: p.allotmentQty,
            releaseDays: p.releaseDays,
            isActive: p.isActive,
          })),
        }
      : blankValues(),
  });

  const periodsArray = useFieldArray({ control, name: "periods" });
  const selectedOptionId = watch("serviceProductOptionId");

  useEffect(() => {
    if (!selectedOptionId) {
      setVariants([]);
      return;
    }
    listServiceProductVariants({ serviceProductOptionId: selectedOptionId }).then(setVariants).catch(() => setVariants([]));
  }, [selectedOptionId]);

  async function submit(values: FormValues) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    const payload = {
      serviceProductId: product.serviceProductId,
      serviceProductSupplierId: values.serviceProductSupplierId,
      serviceProductOptionId: values.serviceProductOptionId,
      serviceProductVariantId: values.serviceProductVariantId,
      serviceProductScheduleId: values.serviceProductScheduleId,
      inventoryTypeId: values.inventoryTypeId,
      validFrom: values.validFrom || null,
      validTo: values.validTo || null,
      isActive: values.isActive,
      periods: values.periods,
    };
    try {
      if (mode === "edit" && row) {
        await updateServiceProductInventory(row.serviceProductInventoryId, { ...payload, modifiedBy: userKey });
        toast.success("Inventory updated");
      } else {
        await createServiceProductInventory({ ...payload, createdBy: userKey });
        toast.success("Inventory created");
      }
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof ServiceProductInventoriesApiError ? error.message : "Could not save inventory");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold">{mode === "create" ? "Add inventory" : mode === "edit" ? "Edit inventory" : "Inventory details"}</h2>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit(submit)} className="space-y-5" noValidate>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <Label required>Inventory type</Label>
            <Controller
              control={control}
              name="inventoryTypeId"
              render={({ field }) => (
                <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(Number(v))} disabled={isReadOnly}>
                  <SelectTrigger className="h-10 w-full min-w-0" aria-invalid={!!errors.inventoryTypeId}>
                    <SelectValue>
                      {(value: string | null) => {
                        if (!value) return "Select type";
                        return inventoryTypes.find((t) => String(t.inventoryTypeKey) === value)?.inventoryTypeName ?? value;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {inventoryTypes.map((t) => (
                      <SelectItem key={t.inventoryTypeKey} value={String(t.inventoryTypeKey)}>
                        {t.inventoryTypeName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.inventoryTypeId && <p className="text-sm text-destructive">{errors.inventoryTypeId.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Supplier scope</Label>
            <Controller
              control={control}
              name="serviceProductSupplierId"
              render={({ field }) => (
                <Select value={field.value ? String(field.value) : NONE} onValueChange={(v) => field.onChange(!v || v === NONE ? null : Number(v))} disabled={isReadOnly}>
                  <SelectTrigger className="h-10 w-full min-w-0">
                    <SelectValue>
                      {(value: string | null) => {
                        if (!value || value === NONE) return "All suppliers";
                        return supplierLinks.find((s) => String(s.serviceProductSupplierId) === value)?.supplierName ?? value;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>All suppliers</SelectItem>
                    {supplierLinks.map((s) => (
                      <SelectItem key={s.serviceProductSupplierId} value={String(s.serviceProductSupplierId)}>
                        {s.supplierName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1">
            <Label>Option scope</Label>
            <Controller
              control={control}
              name="serviceProductOptionId"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : NONE}
                  onValueChange={(v) => {
                    field.onChange(!v || v === NONE ? null : Number(v));
                    setValue("serviceProductVariantId", null);
                  }}
                  disabled={isReadOnly}
                >
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
          </div>

          <div className="space-y-1">
            <Label>Variant scope</Label>
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
            <Label>Schedule scope</Label>
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
            <Label htmlFor="validFrom">Valid from</Label>
            <Input id="validFrom" type="date" disabled={isReadOnly} {...register("validFrom")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="validTo">Valid to</Label>
            <Input id="validTo" type="date" disabled={isReadOnly} {...register("validTo")} />
            {errors.validTo && <p className="text-sm text-destructive">{errors.validTo.message}</p>}
          </div>

          {mode === "view" && row && (
            <div className="space-y-1">
              <Label>Active</Label>
              <div>
                <Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "active" : "inactive"}</Badge>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-lg border border-border p-3">
          <div>
            <h3 className="text-sm font-medium">Allotment periods</h3>
            <p className="text-xs text-muted-foreground">Date range + day-of-week quantity and release window.</p>
          </div>

          {periodsArray.fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No periods — add at least one below.</p>
          ) : (
            periodsArray.fields.map((field, index) => (
              <div key={field.id} className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-xs">From date</Label>
                  <Input type="date" disabled={isReadOnly} {...register(`periods.${index}.fromDate`)} />
                  {errors.periods?.[index]?.fromDate && <p className="text-xs text-destructive">{errors.periods[index]?.fromDate?.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">To date</Label>
                  <Input type="date" disabled={isReadOnly} {...register(`periods.${index}.toDate`)} />
                  {errors.periods?.[index]?.toDate && <p className="text-xs text-destructive">{errors.periods[index]?.toDate?.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Allotment qty</Label>
                  <Input type="number" min={0} disabled={isReadOnly} {...register(`periods.${index}.allotmentQty`, { valueAsNumber: true })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Release days</Label>
                  <Input type="number" min={0} disabled={isReadOnly} {...register(`periods.${index}.releaseDays`, { valueAsNumber: true })} />
                </div>
                <div className="col-span-2 space-y-1 sm:col-span-4">
                  <Label className="text-xs">Applicable days</Label>
                  <div className="flex flex-wrap gap-2">
                    {DAY_FIELDS.map((d) => (
                      <Controller
                        key={d.key}
                        control={control}
                        name={`periods.${index}.${d.key}`}
                        render={({ field: f }) => (
                          <label className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm">
                            <Checkbox checked={f.value} onCheckedChange={(v) => f.onChange(!!v)} disabled={isReadOnly} />
                            {d.label}
                          </label>
                        )}
                      />
                    ))}
                  </div>
                </div>
                {!isReadOnly && (
                  <div className="flex items-end sm:col-span-2 lg:col-span-4">
                    <Button type="button" variant="ghost" size="sm" onClick={() => periodsArray.remove(index)}>
                      <Trash2 className="h-4 w-4" />
                      Remove period
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}

          {!isReadOnly && (
            <Button type="button" variant="outline" size="sm" onClick={() => periodsArray.append(blankPeriod())}>
              <Plus className="h-4 w-4" />
              Add period
            </Button>
          )}
        </div>

        {!isReadOnly && (
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "edit" ? "Save" : "Create"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}

export function ProductInventoryTab({ product, roleDef }: { product: ServiceProduct; roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const [supplierLinks, setSupplierLinks] = useState<ServiceProductSupplier[]>([]);
  const [options, setOptions] = useState<ServiceProductOption[]>([]);
  const [schedules, setSchedules] = useState<ServiceProductSchedule[]>([]);
  const [inventoryTypes, setInventoryTypes] = useState<InventoryType[]>([]);
  const [rows, setRows] = useState<ServiceProductInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<ServiceProductInventory | undefined>();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const canEdit = can(roleDef, "serviceProductInventory", "edit");
  const canCreate = can(roleDef, "serviceProductInventory", "create");
  const canDelete = can(roleDef, "serviceProductInventory", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  useEffect(() => {
    listInventoryTypes({ activeOnly: true }).then(setInventoryTypes).catch(() => setInventoryTypes([]));
  }, []);

  useEffect(() => {
    Promise.all([
      listServiceProductSuppliers({ serviceProductId: product.serviceProductId, activeOnly: true }),
      listServiceProductOptions({ serviceProductId: product.serviceProductId }),
      listServiceProductSchedules({ serviceProductId: product.serviceProductId }),
    ]).then(([supplierRows, optionRows, scheduleRows]) => {
      setSupplierLinks(supplierRows);
      setOptions(optionRows);
      setSchedules(scheduleRows);
    });
  }, [product.serviceProductId]);

  async function refreshRows() {
    setLoading(true);
    try {
      const rowsResult = await listServiceProductInventories({ serviceProductId: product.serviceProductId });
      setRows(rowsResult);
    } catch (error) {
      toast.error(error instanceof ServiceProductInventoriesApiError ? error.message : "Failed to load inventory");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.serviceProductId]);

  const visible = useMemo(() => {
    let result = rows;
    if (statusFilter === "active") result = result.filter((r) => r.isActive);
    if (statusFilter === "inactive") result = result.filter((r) => !r.isActive);
    return result;
  }, [rows, statusFilter]);

  async function toggleActive(row: ServiceProductInventory) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setServiceProductInventoryActive(row.serviceProductInventoryId, !row.isActive, userKey);
      await refreshRows();
      toast.success(row.isActive ? "Inventory deactivated" : "Inventory activated");
    } catch (error) {
      toast.error(error instanceof ServiceProductInventoriesApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: ServiceProductInventory) {
    try {
      await deleteServiceProductInventory(row.serviceProductInventoryId);
      await refreshRows();
      toast.success("Inventory deleted");
    } catch (error) {
      toast.error(error instanceof ServiceProductInventoriesApiError ? error.message : "Could not delete inventory");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inventory"
        description="Allotment windows for this product — optionally scoped to a supplier, option, variant, or schedule."
        actions={
          canCreate && panelMode === "closed" && inventoryTypes.length > 0 ? (
            <Button onClick={() => { setTarget(undefined); setPanelMode("create"); }}>
              <Plus className="h-4 w-4" />
              Add inventory
            </Button>
          ) : undefined
        }
      />

      {panelMode !== "closed" && (
        <InventoryPanel
          mode={panelMode}
          row={target}
          product={product}
          supplierLinks={supplierLinks}
          options={options}
          schedules={schedules}
          inventoryTypes={inventoryTypes}
          userKey={userKey}
          onSaved={refreshRows}
          onClose={() => { setPanelMode("closed"); setTarget(undefined); }}
        />
      )}

      {rows.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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

      <Card>
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading inventory…</p>
        ) : rows.length === 0 ? (
          <EmptyState icon={Warehouse} tone="primary" heading="No inventory yet" description="Add inventory for this product." size="compact" />
        ) : visible.length === 0 ? (
          <EmptyState icon={Warehouse} tone="muted" heading="No matching inventory" description="Try a different status filter." size="compact" />
        ) : (
          <Table className="table-fixed border-collapse text-xs [&_th]:h-auto [&_th]:whitespace-normal [&_td]:whitespace-normal">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[18%] px-2 py-1.5">Type</TableHead>
                <TableHead className="w-[22%] px-2 py-1.5">Scope</TableHead>
                <TableHead className="w-[18%] px-2 py-1.5">Valid</TableHead>
                <TableHead className="w-[12%] px-2 py-1.5">Periods</TableHead>
                <TableHead className="w-[12%] px-2 py-1.5">Status</TableHead>
                <TableHead className="w-[18%] px-2 py-1.5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => (
                <TableRow key={row.serviceProductInventoryId}>
                  <TableCell className="px-2 py-1.5 font-medium leading-tight">{row.inventoryTypeName ?? `#${row.inventoryTypeId}`}</TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">
                    {row.variantName ?? row.optionName ?? row.supplierName ?? "Whole product"}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">
                    {row.validFrom ?? "—"}
                    <br />→ {row.validTo ?? "—"}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.periods.length}</TableCell>
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
    </div>
  );
}
