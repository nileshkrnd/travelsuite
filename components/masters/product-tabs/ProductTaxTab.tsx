"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Percent, Eye, Pencil, Power, PowerOff, Trash2, X, Loader2 } from "lucide-react";
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
import { listTaxes } from "@/lib/services/taxes.service";
import { listTaxCalculationTypes, listTaxApplicationBasis } from "@/lib/services/tax-lookups.service";
import {
  listServiceProductTaxes,
  createServiceProductTax,
  updateServiceProductTax,
  setServiceProductTaxActive,
  deleteServiceProductTax,
  ServiceProductTaxesApiError,
} from "@/lib/services/service-product-taxes.service";
import { can } from "@/config/permissions";
import type {
  RoleDef,
  ServiceProduct,
  ServiceProductOption,
  ServiceProductSupplier,
  ServiceProductTax,
  ServiceProductVariant,
  Tax,
  TaxApplicationBasis,
  TaxCalculationTypeLookup,
} from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type StatusFilter = "all" | "active" | "inactive";
const NONE = "none";

function isNegativeOrZero(value: string): boolean {
  if (value.trim() === "") return false;
  const n = Number(value);
  return !Number.isNaN(n) && n <= 0;
}

const schema = z
  .object({
    serviceProductSupplierId: z.number().int().positive().nullable(),
    serviceProductOptionId: z.number().int().positive().nullable(),
    serviceProductVariantId: z.number().int().positive().nullable(),
    taxId: z.number().int().positive("Choose a tax"),
    taxName: z.string().trim().min(1, "Name is required").max(200),
    taxCalculationTypeId: z.number().int().positive("Choose a calculation type"),
    taxRate: z.string(),
    taxAmount: z.string(),
    taxApplicationBasisId: z.number().int().positive("Choose an application basis"),
    isInclusive: z.boolean(),
    isCompound: z.boolean(),
    sequenceNo: z.number().int().min(0),
    fromDate: z.string().trim().min(1, "From date is required"),
    toDate: z.string().trim().optional().or(z.literal("")),
    isActive: z.boolean(),
    remarks: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .superRefine((values, ctx) => {
    if (values.toDate && values.fromDate > values.toDate) {
      ctx.addIssue({ code: "custom", path: ["toDate"], message: "To date must be on or after from date" });
    }
  });

type FormValues = z.infer<typeof schema>;

function blankValues(): FormValues {
  return {
    serviceProductSupplierId: null,
    serviceProductOptionId: null,
    serviceProductVariantId: null,
    taxId: 0,
    taxName: "",
    taxCalculationTypeId: 0,
    taxRate: "",
    taxAmount: "",
    taxApplicationBasisId: 0,
    isInclusive: false,
    isCompound: false,
    sequenceNo: 0,
    fromDate: new Date().toISOString().slice(0, 10),
    toDate: "",
    isActive: true,
    remarks: "",
  };
}

function TaxPanel({
  mode,
  row,
  product,
  supplierLinks,
  options,
  taxes,
  calcTypes,
  applicationBasisRows,
  userKey,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: ServiceProductTax;
  product: ServiceProduct;
  supplierLinks: ServiceProductSupplier[];
  options: ServiceProductOption[];
  taxes: Tax[];
  calcTypes: TaxCalculationTypeLookup[];
  applicationBasisRows: TaxApplicationBasis[];
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
          taxId: row.taxId,
          taxName: row.taxName,
          taxCalculationTypeId: row.taxCalculationTypeId,
          taxRate: row.taxRate != null ? String(row.taxRate) : "",
          taxAmount: row.taxAmount != null ? String(row.taxAmount) : "",
          taxApplicationBasisId: row.taxApplicationBasisId,
          isInclusive: row.isInclusive,
          isCompound: row.isCompound,
          sequenceNo: row.sequenceNo,
          fromDate: row.fromDate,
          toDate: row.toDate ?? "",
          isActive: row.isActive,
          remarks: row.remarks ?? "",
        }
      : blankValues(),
  });

  const selectedOptionId = watch("serviceProductOptionId");
  const selectedCalcTypeId = watch("taxCalculationTypeId");
  const calcCode = calcTypes.find((t) => t.taxCalculationTypeId === selectedCalcTypeId)?.taxCalculationTypeCode.toUpperCase();

  useEffect(() => {
    if (!selectedOptionId) {
      setVariants([]);
      return;
    }
    listServiceProductVariants({ serviceProductOptionId: selectedOptionId }).then(setVariants).catch(() => setVariants([]));
  }, [selectedOptionId]);

  function selectTax(id: number) {
    setValue("taxId", id, { shouldValidate: true });
    const tax = taxes.find((t) => t.taxKey === id);
    if (tax && mode === "create") {
      setValue("taxName", tax.taxName);
      const matchingCalcType = calcTypes.find((c) => c.taxCalculationTypeCode.toUpperCase() === tax.calculationType);
      if (matchingCalcType) setValue("taxCalculationTypeId", matchingCalcType.taxCalculationTypeId);
      setValue("taxRate", tax.defaultRate != null ? String(tax.defaultRate) : "");
      setValue("taxAmount", tax.defaultAmount != null ? String(tax.defaultAmount) : "");
      setValue("isInclusive", tax.isInclusiveDefault);
      setValue("isCompound", tax.isCompound);
    }
  }

  async function submit(values: FormValues) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    if (calcCode === "PERCENTAGE" && isNegativeOrZero(values.taxRate)) {
      toast.error("Tax rate must be greater than zero for a percentage calculation type.");
      return;
    }
    if (calcCode === "FIXED" && isNegativeOrZero(values.taxAmount)) {
      toast.error("Tax amount must be greater than zero for a fixed calculation type.");
      return;
    }

    const payload = {
      serviceProductId: product.serviceProductId,
      serviceProductSupplierId: values.serviceProductSupplierId,
      serviceProductOptionId: values.serviceProductOptionId,
      serviceProductVariantId: values.serviceProductVariantId,
      taxId: values.taxId,
      taxName: values.taxName.trim(),
      taxCalculationTypeId: values.taxCalculationTypeId,
      taxRate: calcCode === "PERCENTAGE" ? Number(values.taxRate) : null,
      taxAmount: calcCode === "FIXED" ? Number(values.taxAmount) : null,
      taxApplicationBasisId: values.taxApplicationBasisId,
      isInclusive: values.isInclusive,
      isCompound: values.isCompound,
      sequenceNo: values.sequenceNo,
      fromDate: values.fromDate,
      toDate: values.toDate || null,
      isActive: values.isActive,
      remarks: values.remarks?.trim() || null,
    };

    try {
      if (mode === "edit" && row) {
        await updateServiceProductTax(row.serviceProductTaxId, { ...payload, modifiedBy: userKey });
        toast.success("Tax updated");
      } else {
        await createServiceProductTax({ ...payload, createdBy: userKey });
        toast.success("Tax added");
      }
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof ServiceProductTaxesApiError ? error.message : "Could not save tax");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold">{mode === "create" ? "Add tax" : mode === "edit" ? "Edit tax" : "Tax details"}</h2>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit(submit)} className="grid grid-cols-2 gap-3 sm:grid-cols-4" noValidate>
        <div className="space-y-1 sm:col-span-2">
          <Label required>Tax</Label>
          <Select value={watch("taxId") ? String(watch("taxId")) : ""} onValueChange={(v) => selectTax(Number(v))} disabled={isReadOnly}>
            <SelectTrigger className="h-10 w-full min-w-0" aria-invalid={!!errors.taxId}>
              <SelectValue>
                {(value: string | null) => {
                  if (!value) return "Select tax";
                  return taxes.find((t) => String(t.taxKey) === value)?.taxName ?? value;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {taxes.map((t) => (
                <SelectItem key={t.taxKey} value={String(t.taxKey)}>
                  {t.taxName} ({t.taxCode})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.taxId && <p className="text-sm text-destructive">{errors.taxId.message}</p>}
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="taxName" required>
            Display name
          </Label>
          <Input id="taxName" disabled={isReadOnly} aria-invalid={!!errors.taxName} {...register("taxName")} />
          {errors.taxName && <p className="text-sm text-destructive">{errors.taxName.message}</p>}
        </div>

        <div className="space-y-1">
          <Label required>Calculation type</Label>
          <Controller
            control={control}
            name="taxCalculationTypeId"
            render={({ field }) => (
              <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(Number(v))} disabled={isReadOnly}>
                <SelectTrigger className="h-10 w-full min-w-0" aria-invalid={!!errors.taxCalculationTypeId}>
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return "Select type";
                      return calcTypes.find((t) => String(t.taxCalculationTypeId) === value)?.taxCalculationTypeName ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {calcTypes.map((t) => (
                    <SelectItem key={t.taxCalculationTypeId} value={String(t.taxCalculationTypeId)}>
                      {t.taxCalculationTypeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.taxCalculationTypeId && <p className="text-sm text-destructive">{errors.taxCalculationTypeId.message}</p>}
        </div>

        {calcCode === "FIXED" ? (
          <div className="space-y-1">
            <Label htmlFor="taxAmount" required>
              Tax amount
            </Label>
            <Input id="taxAmount" type="number" min={0} step="0.01" disabled={isReadOnly} {...register("taxAmount")} />
          </div>
        ) : (
          <div className="space-y-1">
            <Label htmlFor="taxRate" required>
              Tax rate (%)
            </Label>
            <Input id="taxRate" type="number" min={0} step="0.01" disabled={isReadOnly} {...register("taxRate")} />
          </div>
        )}

        <div className="space-y-1">
          <Label required>Application basis</Label>
          <Controller
            control={control}
            name="taxApplicationBasisId"
            render={({ field }) => (
              <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(Number(v))} disabled={isReadOnly}>
                <SelectTrigger className="h-10 w-full min-w-0" aria-invalid={!!errors.taxApplicationBasisId}>
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return "Select basis";
                      return applicationBasisRows.find((b) => String(b.taxApplicationBasisId) === value)?.taxApplicationBasisName ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {applicationBasisRows.map((b) => (
                    <SelectItem key={b.taxApplicationBasisId} value={String(b.taxApplicationBasisId)}>
                      {b.taxApplicationBasisName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.taxApplicationBasisId && <p className="text-sm text-destructive">{errors.taxApplicationBasisId.message}</p>}
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
          <Label htmlFor="sequenceNo">Sequence</Label>
          <Input id="sequenceNo" type="number" min={0} disabled={isReadOnly} {...register("sequenceNo", { valueAsNumber: true })} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="fromDate" required>
            From date
          </Label>
          <Input id="fromDate" type="date" disabled={isReadOnly} {...register("fromDate")} />
          {errors.fromDate && <p className="text-sm text-destructive">{errors.fromDate.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="toDate">To date</Label>
          <Input id="toDate" type="date" disabled={isReadOnly} {...register("toDate")} />
          {errors.toDate && <p className="text-sm text-destructive">{errors.toDate.message}</p>}
        </div>

        <div className="flex items-end gap-4 pb-2">
          <Controller
            control={control}
            name="isInclusive"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={isReadOnly} />
                Inclusive
              </label>
            )}
          />
          <Controller
            control={control}
            name="isCompound"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={isReadOnly} />
                Compound
              </label>
            )}
          />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="remarks">Remarks</Label>
          <Input id="remarks" disabled={isReadOnly} {...register("remarks")} />
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
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}

export function ProductTaxTab({ product, roleDef }: { product: ServiceProduct; roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const [supplierLinks, setSupplierLinks] = useState<ServiceProductSupplier[]>([]);
  const [options, setOptions] = useState<ServiceProductOption[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [calcTypes, setCalcTypes] = useState<TaxCalculationTypeLookup[]>([]);
  const [applicationBasisRows, setApplicationBasisRows] = useState<TaxApplicationBasis[]>([]);
  const [rows, setRows] = useState<ServiceProductTax[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<ServiceProductTax | undefined>();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const canEdit = can(roleDef, "serviceProductTax", "edit");
  const canCreate = can(roleDef, "serviceProductTax", "create");
  const canDelete = can(roleDef, "serviceProductTax", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  useEffect(() => {
    Promise.all([
      listTaxCalculationTypes({ activeOnly: true }),
      listTaxApplicationBasis({ activeOnly: true }),
      listTaxes({ tenantId: product.tenantId, companyId: product.companyId, activeOnly: true }),
    ])
      .then(([calc, basis, taxRows]) => {
        setCalcTypes(calc);
        setApplicationBasisRows(basis);
        setTaxes(taxRows);
      })
      .catch(() => toast.error("Failed to load tax lookups"));
  }, [product.tenantId, product.companyId]);

  useEffect(() => {
    Promise.all([
      listServiceProductSuppliers({ serviceProductId: product.serviceProductId, activeOnly: true }),
      listServiceProductOptions({ serviceProductId: product.serviceProductId }),
    ]).then(([supplierRows, optionRows]) => {
      setSupplierLinks(supplierRows);
      setOptions(optionRows);
    });
  }, [product.serviceProductId]);

  async function refreshRows() {
    setLoading(true);
    try {
      const rowsResult = await listServiceProductTaxes({ serviceProductId: product.serviceProductId });
      setRows(rowsResult);
    } catch (error) {
      toast.error(error instanceof ServiceProductTaxesApiError ? error.message : "Failed to load taxes");
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

  async function toggleActive(row: ServiceProductTax) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setServiceProductTaxActive(row.serviceProductTaxId, !row.isActive, userKey);
      await refreshRows();
      toast.success(row.isActive ? "Tax deactivated" : "Tax activated");
    } catch (error) {
      toast.error(error instanceof ServiceProductTaxesApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: ServiceProductTax) {
    try {
      await deleteServiceProductTax(row.serviceProductTaxId);
      await refreshRows();
      toast.success("Tax deleted");
    } catch (error) {
      toast.error(error instanceof ServiceProductTaxesApiError ? error.message : "Could not delete tax");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Taxes"
        description="Taxes applied to this product — optionally scoped to a supplier, option, or variant."
        actions={
          canCreate && panelMode === "closed" && taxes.length > 0 && calcTypes.length > 0 && applicationBasisRows.length > 0 ? (
            <Button onClick={() => { setTarget(undefined); setPanelMode("create"); }}>
              <Plus className="h-4 w-4" />
              Add tax
            </Button>
          ) : undefined
        }
      />

      {panelMode !== "closed" && (
        <TaxPanel
          mode={panelMode}
          row={target}
          product={product}
          supplierLinks={supplierLinks}
          options={options}
          taxes={taxes}
          calcTypes={calcTypes}
          applicationBasisRows={applicationBasisRows}
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
          <p className="p-6 text-sm text-muted-foreground">Loading taxes…</p>
        ) : rows.length === 0 ? (
          <EmptyState icon={Percent} tone="primary" heading="No taxes yet" description="Add a tax for this product." size="compact" />
        ) : visible.length === 0 ? (
          <EmptyState icon={Percent} tone="muted" heading="No matching taxes" description="Try a different status filter." size="compact" />
        ) : (
          <Table className="table-fixed border-collapse text-xs [&_th]:h-auto [&_th]:whitespace-normal [&_td]:whitespace-normal">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[18%] px-2 py-1.5">Tax</TableHead>
                <TableHead className="w-[16%] px-2 py-1.5">Scope</TableHead>
                <TableHead className="w-[12%] px-2 py-1.5">Rate/Amount</TableHead>
                <TableHead className="w-[16%] px-2 py-1.5">Basis</TableHead>
                <TableHead className="w-[16%] px-2 py-1.5">Valid</TableHead>
                <TableHead className="w-[8%] px-2 py-1.5">Status</TableHead>
                <TableHead className="w-[14%] px-2 py-1.5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => (
                <TableRow key={row.serviceProductTaxId}>
                  <TableCell className="px-2 py-1.5 font-medium leading-tight">{row.taxName}</TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">
                    {row.variantName ?? row.optionName ?? row.supplierName ?? "Whole product"}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 font-mono leading-tight">
                    {row.taxCalculationTypeCode === "PERCENTAGE" ? `${row.taxRate ?? 0}%` : (row.taxAmount ?? 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.taxApplicationBasisName ?? `#${row.taxApplicationBasisId}`}</TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">
                    {row.fromDate}
                    <br />→ {row.toDate ?? "—"}
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
    </div>
  );
}
