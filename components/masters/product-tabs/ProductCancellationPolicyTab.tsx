"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, ShieldCheck, Eye, Pencil, Power, PowerOff, Trash2, X, Search, Loader2, Star } from "lucide-react";
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
import {
  ensureDefaultCancellationPolicyTypes,
  listCancellationPolicyTypes,
  CancellationPolicyTypesApiError,
} from "@/lib/services/property-contract-cancellation-policies.service";
import { cancellationPolicyTypeNeedsPenaltyValue } from "@/lib/constants/cancellation-policy-types";
import {
  listServiceProductCancellationPolicies,
  createServiceProductCancellationPolicy,
  updateServiceProductCancellationPolicy,
  setServiceProductCancellationPolicyActive,
  deleteServiceProductCancellationPolicy,
  ServiceProductCancellationPoliciesApiError,
} from "@/lib/services/service-product-cancellation-policies.service";
import { can } from "@/config/permissions";
import type {
  CancellationPolicyType,
  RoleDef,
  ServiceProduct,
  ServiceProductCancellationPolicy,
  ServiceProductOption,
  ServiceProductSupplier,
  ServiceProductVariant,
} from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type StatusFilter = "all" | "active" | "inactive";
const NONE = "none";

const ruleSchema = z.object({
  fromDaysBefore: z.number().int().min(0),
  toDaysBefore: z.number().int().min(0).nullable(),
  cancellationPolicyTypeId: z.number().int().positive("Choose a penalty type"),
  penaltyValue: z.number().min(0),
  isActive: z.boolean(),
});

function usePolicySchema(rows: ServiceProductCancellationPolicy[], currentId?: number) {
  return z
    .object({
      policyCode: z.string().trim().min(1, "Policy code is required").max(50),
      policyName: z.string().trim().min(1, "Policy name is required").max(150),
      serviceProductSupplierId: z.number().int().positive().nullable(),
      serviceProductOptionId: z.number().int().positive().nullable(),
      serviceProductVariantId: z.number().int().positive().nullable(),
      isDefault: z.boolean(),
      isActive: z.boolean(),
      rules: z.array(ruleSchema),
    })
    .superRefine((values, ctx) => {
      const duplicate = rows.some(
        (r) =>
          r.serviceProductCancellationPolicyId !== currentId &&
          r.policyCode.trim().toLowerCase() === values.policyCode.trim().toLowerCase()
      );
      if (duplicate) {
        ctx.addIssue({ code: "custom", path: ["policyCode"], message: "This policy code is already used for this product" });
      }
    });
}

type FormValues = z.infer<ReturnType<typeof usePolicySchema>>;

function blankValues(): FormValues {
  return {
    policyCode: "",
    policyName: "",
    serviceProductSupplierId: null,
    serviceProductOptionId: null,
    serviceProductVariantId: null,
    isDefault: false,
    isActive: true,
    rules: [],
  };
}

function policyTypeDisplayLabel(types: CancellationPolicyType[], value: string | null, placeholder: string): string {
  if (!value) return placeholder;
  const match = types.find((t) => String(t.cancellationPolicyTypeKey) === value);
  return match?.cancellationPolicyTypeName ?? placeholder;
}

function PolicyPanel({
  mode,
  row,
  rows,
  product,
  supplierLinks,
  options,
  policyTypes,
  userKey,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: ServiceProductCancellationPolicy;
  rows: ServiceProductCancellationPolicy[];
  product: ServiceProduct;
  supplierLinks: ServiceProductSupplier[];
  options: ServiceProductOption[];
  policyTypes: CancellationPolicyType[];
  userKey: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const schema = usePolicySchema(rows, row?.serviceProductCancellationPolicyId);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    values: row
      ? {
          policyCode: row.policyCode,
          policyName: row.policyName,
          serviceProductSupplierId: row.serviceProductSupplierId,
          serviceProductOptionId: row.serviceProductOptionId,
          serviceProductVariantId: row.serviceProductVariantId,
          isDefault: row.isDefault,
          isActive: row.isActive,
          rules: row.rules.map((r) => ({
            fromDaysBefore: r.fromDaysBefore,
            toDaysBefore: r.toDaysBefore,
            cancellationPolicyTypeId: r.cancellationPolicyTypeId,
            penaltyValue: r.penaltyValue,
            isActive: r.isActive,
          })),
        }
      : blankValues(),
  });

  const rulesArray = useFieldArray({ control, name: "rules" });
  const watchedRules = watch("rules");
  const selectedOptionId = watch("serviceProductOptionId");

  useEffect(() => {
    if (!selectedOptionId) {
      setVariants([]);
      return;
    }
    listServiceProductVariants({ serviceProductOptionId: selectedOptionId }).then(setVariants).catch(() => setVariants([]));
  }, [selectedOptionId]);

  function policyTypeCode(typeId: number): string {
    return policyTypes.find((t) => t.cancellationPolicyTypeKey === typeId)?.cancellationPolicyTypeCode.toUpperCase() ?? "";
  }

  async function submit(values: FormValues) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    for (const rule of values.rules) {
      const code = policyTypeCode(rule.cancellationPolicyTypeId);
      if (cancellationPolicyTypeNeedsPenaltyValue(code) && rule.penaltyValue <= 0) {
        toast.error("Nights and Percentage rules require a penalty value greater than zero.");
        return;
      }
      if (rule.toDaysBefore != null && rule.toDaysBefore >= 0 && rule.fromDaysBefore < rule.toDaysBefore) {
        toast.error("From days before must be greater than or equal to to days before.");
        return;
      }
    }

    const payload = {
      serviceProductId: product.serviceProductId,
      policyCode: values.policyCode.trim(),
      policyName: values.policyName.trim(),
      serviceProductSupplierId: values.serviceProductSupplierId,
      serviceProductOptionId: values.serviceProductOptionId,
      serviceProductVariantId: values.serviceProductVariantId,
      isDefault: values.isDefault,
      isActive: values.isActive,
      rules: values.rules.map((r) => ({
        fromDaysBefore: r.fromDaysBefore,
        toDaysBefore: r.toDaysBefore,
        cancellationPolicyTypeId: r.cancellationPolicyTypeId,
        penaltyValue: cancellationPolicyTypeNeedsPenaltyValue(policyTypeCode(r.cancellationPolicyTypeId)) ? r.penaltyValue : 0,
        isActive: r.isActive,
      })),
    };

    try {
      if (mode === "edit" && row) {
        await updateServiceProductCancellationPolicy(row.serviceProductCancellationPolicyId, { ...payload, modifiedBy: userKey });
        toast.success("Cancellation policy updated");
      } else if (mode === "create") {
        await createServiceProductCancellationPolicy({ ...payload, createdBy: userKey });
        toast.success("Cancellation policy created");
      }
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof ServiceProductCancellationPoliciesApiError ? error.message : "Could not save cancellation policy");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold">
          {mode === "create" ? "Add cancellation policy" : mode === "edit" ? "Edit cancellation policy" : "Cancellation policy details"}
        </h2>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit(submit)} className="space-y-5" noValidate>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="policyCode" required>
              Policy code
            </Label>
            <Input id="policyCode" disabled={isReadOnly} aria-invalid={!!errors.policyCode} {...register("policyCode")} />
            {errors.policyCode && <p className="text-sm text-destructive">{errors.policyCode.message}</p>}
          </div>

          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="policyName" required>
              Policy name
            </Label>
            <Input id="policyName" disabled={isReadOnly} aria-invalid={!!errors.policyName} {...register("policyName")} />
            {errors.policyName && <p className="text-sm text-destructive">{errors.policyName.message}</p>}
          </div>

          <div className="flex items-end gap-4 pb-2">
            <Controller
              control={control}
              name="isDefault"
              render={({ field }) => (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={isReadOnly} />
                  Default policy
                </label>
              )}
            />
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
            <h3 className="text-sm font-medium">Cancellation windows</h3>
            <p className="text-xs text-muted-foreground">
              Days before departure — e.g. 7–0 days = within one week. Leave &quot;To days&quot; empty for open-ended.
            </p>
          </div>

          {rulesArray.fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rules — add at least one window below.</p>
          ) : (
            rulesArray.fields.map((field, index) => {
              const typeId = watchedRules[index]?.cancellationPolicyTypeId ?? 0;
              const needsPenalty = cancellationPolicyTypeNeedsPenaltyValue(policyTypeCode(typeId));
              return (
                <div key={field.id} className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-2 lg:grid-cols-6">
                  <div className="space-y-1">
                    <Label className="text-xs">From days</Label>
                    <Input type="number" min={0} disabled={isReadOnly} {...register(`rules.${index}.fromDaysBefore`, { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">To days (optional)</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="Open"
                      disabled={isReadOnly}
                      {...register(`rules.${index}.toDaysBefore`, {
                        valueAsNumber: true,
                        setValueAs: (v) => (v === "" || Number.isNaN(v) ? null : Number(v)),
                      })}
                    />
                  </div>
                  <div className="space-y-1 lg:col-span-2">
                    <Label className="text-xs">Penalty type</Label>
                    <Controller
                      control={control}
                      name={`rules.${index}.cancellationPolicyTypeId`}
                      render={({ field: f }) => (
                        <Select
                          value={f.value > 0 ? String(f.value) : ""}
                          onValueChange={(v) => {
                            const id = Number(v);
                            f.onChange(id);
                            if (!cancellationPolicyTypeNeedsPenaltyValue(policyTypeCode(id))) {
                              setValue(`rules.${index}.penaltyValue`, 0);
                            }
                          }}
                          disabled={isReadOnly}
                        >
                          <SelectTrigger className="h-10 w-full min-w-0">
                            <SelectValue placeholder="Select type">
                              {(value: string | null) => policyTypeDisplayLabel(policyTypes, value, "Select type")}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {policyTypes.map((t) => (
                              <SelectItem key={t.cancellationPolicyTypeKey} value={String(t.cancellationPolicyTypeKey)}>
                                {t.cancellationPolicyTypeName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  {needsPenalty ? (
                    <div className="space-y-1">
                      <Label className="text-xs">Penalty value</Label>
                      <Input type="number" min={0} step="0.01" placeholder="Nights or %" disabled={isReadOnly} {...register(`rules.${index}.penaltyValue`, { valueAsNumber: true })} />
                    </div>
                  ) : (
                    <div className="hidden lg:block" />
                  )}
                  {!isReadOnly && (
                    <div className="flex items-end sm:col-span-2 lg:col-span-6">
                      <Button type="button" variant="ghost" size="sm" onClick={() => rulesArray.remove(index)}>
                        <Trash2 className="h-4 w-4" />
                        Remove rule
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {!isReadOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                rulesArray.append({
                  fromDaysBefore: 7,
                  toDaysBefore: 0,
                  cancellationPolicyTypeId: policyTypes[0]?.cancellationPolicyTypeKey ?? 0,
                  penaltyValue: 0,
                  isActive: true,
                })
              }
              disabled={policyTypes.length === 0}
            >
              <Plus className="h-4 w-4" />
              Add rule
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

export function ProductCancellationPolicyTab({ product, roleDef }: { product: ServiceProduct; roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const [supplierLinks, setSupplierLinks] = useState<ServiceProductSupplier[]>([]);
  const [options, setOptions] = useState<ServiceProductOption[]>([]);
  const [policyTypes, setPolicyTypes] = useState<CancellationPolicyType[]>([]);
  const [rows, setRows] = useState<ServiceProductCancellationPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<ServiceProductCancellationPolicy | undefined>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const canEdit = can(roleDef, "serviceProductCancellationPolicy", "edit");
  const canCreate = can(roleDef, "serviceProductCancellationPolicy", "create");
  const canDelete = can(roleDef, "serviceProductCancellationPolicy", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  useEffect(() => {
    ensureDefaultCancellationPolicyTypes({ tenantId: product.tenantId, companyId: product.companyId, createdBy: userKey || 1 })
      .catch(() => listCancellationPolicyTypes({ tenantId: product.tenantId, companyId: product.companyId, activeOnly: true }))
      .then((rows) => setPolicyTypes(rows ?? []))
      .catch((error) => {
        toast.error(error instanceof CancellationPolicyTypesApiError ? error.message : "Failed to load cancellation policy types");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const rowsResult = await listServiceProductCancellationPolicies({ serviceProductId: product.serviceProductId });
      setRows(rowsResult);
    } catch (error) {
      toast.error(error instanceof ServiceProductCancellationPoliciesApiError ? error.message : "Failed to load cancellation policies");
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
    const term = search.trim().toLowerCase();
    let result = rows;
    if (term) {
      result = result.filter((r) => r.policyCode.toLowerCase().includes(term) || r.policyName.toLowerCase().includes(term));
    }
    if (statusFilter === "active") result = result.filter((r) => r.isActive);
    if (statusFilter === "inactive") result = result.filter((r) => !r.isActive);
    return result;
  }, [rows, search, statusFilter]);

  async function toggleActive(row: ServiceProductCancellationPolicy) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setServiceProductCancellationPolicyActive(row.serviceProductCancellationPolicyId, !row.isActive, userKey);
      await refreshRows();
      toast.success(row.isActive ? "Policy deactivated" : "Policy activated");
    } catch (error) {
      toast.error(error instanceof ServiceProductCancellationPoliciesApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: ServiceProductCancellationPolicy) {
    try {
      await deleteServiceProductCancellationPolicy(row.serviceProductCancellationPolicyId);
      await refreshRows();
      toast.success("Cancellation policy deleted");
    } catch (error) {
      toast.error(error instanceof ServiceProductCancellationPoliciesApiError ? error.message : "Could not delete cancellation policy");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cancellation Policy"
        description="Refund/penalty windows for this product — optionally scoped to a supplier, option, or variant."
        actions={
          canCreate && panelMode === "closed" && policyTypes.length > 0 ? (
            <Button onClick={() => { setTarget(undefined); setPanelMode("create"); }}>
              <Plus className="h-4 w-4" />
              Add policy
            </Button>
          ) : undefined
        }
      />

      {panelMode !== "closed" && (
        <PolicyPanel
          mode={panelMode}
          row={target}
          rows={rows}
          product={product}
          supplierLinks={supplierLinks}
          options={options}
          policyTypes={policyTypes}
          userKey={userKey}
          onSaved={refreshRows}
          onClose={() => { setPanelMode("closed"); setTarget(undefined); }}
        />
      )}

      {rows.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search code or name…" value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
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

      <Card>
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading cancellation policies…</p>
        ) : rows.length === 0 ? (
          <EmptyState icon={ShieldCheck} tone="primary" heading="No cancellation policies yet" description="Add a cancellation policy for this product." size="compact" />
        ) : visible.length === 0 ? (
          <EmptyState icon={Search} tone="muted" heading="No matching policies" description="Try a different search or status filter." size="compact" />
        ) : (
          <Table className="table-fixed border-collapse text-xs [&_th]:h-auto [&_th]:whitespace-normal [&_td]:whitespace-normal">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[20%] px-2 py-1.5">Code</TableHead>
                <TableHead className="w-[24%] px-2 py-1.5">Name</TableHead>
                <TableHead className="w-[18%] px-2 py-1.5">Scope</TableHead>
                <TableHead className="w-[10%] px-2 py-1.5">Rules</TableHead>
                <TableHead className="w-[10%] px-2 py-1.5">Status</TableHead>
                <TableHead className="w-[18%] px-2 py-1.5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => (
                <TableRow key={row.serviceProductCancellationPolicyId}>
                  <TableCell className="px-2 py-1.5 font-mono font-medium leading-tight">{row.policyCode}</TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight">
                    <span className="flex items-center gap-1.5">
                      {row.isDefault && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                      <span className="truncate">{row.policyName}</span>
                    </span>
                  </TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">
                    {row.variantName ?? row.optionName ?? row.supplierName ?? "Whole product"}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.rules.length}</TableCell>
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
