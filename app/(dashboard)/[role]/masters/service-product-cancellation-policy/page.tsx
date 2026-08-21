"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, ShieldCheck, Package, Eye, Pencil, Power, PowerOff, Trash2, X, Search, Loader2, Star } from "lucide-react";
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
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import type {
  CancellationPolicyType,
  RoleDef,
  ServiceProduct,
  ServiceProductCancellationPolicy,
  ServiceProductOption,
  ServiceProductSupplier,
  ServiceProductVariant,
  ServiceType,
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
        <div>
          <h2 className="text-base font-semibold">
            {mode === "create" ? "Add cancellation policy" : mode === "edit" ? "Edit cancellation policy" : "Cancellation policy details"}
          </h2>
          <p className="text-sm text-muted-foreground">Under {product.serviceProductName}</p>
        </div>
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

function CancellationPolicyList({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const activeTenant = useTenantStore((s) => s.tenant);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [products, setProducts] = useState<ServiceProduct[]>([]);
  const [supplierLinks, setSupplierLinks] = useState<ServiceProductSupplier[]>([]);
  const [options, setOptions] = useState<ServiceProductOption[]>([]);
  const [policyTypes, setPolicyTypes] = useState<CancellationPolicyType[]>([]);
  const [productCounts, setProductCounts] = useState<Map<number, number>>(new Map());
  const [rows, setRows] = useState<ServiceProductCancellationPolicy[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<ServiceProductCancellationPolicy | undefined>();
  const [serviceTypeFilter, setServiceTypeFilter] = useState<number | null>(null);
  const [productFilter, setProductFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const scopeTenantId = platformMode ? 0 : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);

  const canEdit = can(roleDef, "serviceProductCancellationPolicy", "edit");
  const canCreate = can(roleDef, "serviceProductCancellationPolicy", "create");
  const canDelete = can(roleDef, "serviceProductCancellationPolicy", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  const selectedProduct = products.find((p) => p.serviceProductId === productFilter);

  async function loadServiceTypes() {
    if (scopeTenantId <= 0) {
      setServiceTypes([]);
      setLoadingTypes(false);
      setLoadError(platformMode ? "Select a tenant workspace to manage cancellation policies." : "Missing tenant scope.");
      return;
    }
    setLoadingTypes(true);
    setLoadError(null);
    try {
      const [typeRows, allProducts] = await Promise.all([
        listServiceTypes({ tenantId: scopeTenantId, activeOnly: true }),
        listServiceProducts({ tenantId: scopeTenantId }),
      ]);
      setServiceTypes(typeRows);
      const typeProductCounts = new Map<number, number>();
      for (const p of allProducts) {
        typeProductCounts.set(p.serviceTypeId, (typeProductCounts.get(p.serviceTypeId) ?? 0) + 1);
      }
      setServiceTypeFilter((current) => {
        if (current && typeRows.some((t) => t.serviceTypeId === current)) return current;
        const withData = typeRows.find((t) => (typeProductCounts.get(t.serviceTypeId) ?? 0) > 0);
        return withData?.serviceTypeId ?? typeRows[0]?.serviceTypeId ?? null;
      });
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
    const companyId = selectedProduct?.companyId;
    if (!scopeTenantId || scopeTenantId <= 0 || !companyId) return;
    ensureDefaultCancellationPolicyTypes({ tenantId: scopeTenantId, companyId, createdBy: userKey || 1 })
      .catch(() => listCancellationPolicyTypes({ tenantId: scopeTenantId, companyId, activeOnly: true }))
      .then((rows) => setPolicyTypes(rows ?? []))
      .catch((error) => {
        toast.error(error instanceof CancellationPolicyTypesApiError ? error.message : "Failed to load cancellation policy types");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeTenantId, selectedProduct?.companyId]);

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
      const [rowsResult, supplierRows, optionRows] = await Promise.all([
        listServiceProductCancellationPolicies({ serviceProductId: productFilter }),
        listServiceProductSuppliers({ serviceProductId: productFilter, activeOnly: true }),
        listServiceProductOptions({ serviceProductId: productFilter }),
      ]);
      setRows(rowsResult);
      setSupplierLinks(supplierRows);
      setOptions(optionRows);
      setProductCounts((prev) => {
        const next = new Map(prev);
        next.set(productFilter, rowsResult.length);
        return next;
      });
    } catch (error) {
      toast.error(error instanceof ServiceProductCancellationPoliciesApiError ? error.message : "Failed to load cancellation policies");
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
    <div className="space-y-6 p-6">
      <PageHeader
        title="Service Product Cancellation Policy"
        description="Refund/penalty windows for a Service Product — optionally scoped to a supplier, option, or variant."
        actions={
          canCreate && panelMode === "closed" && selectedProduct && policyTypes.length > 0 ? (
            <Button onClick={() => { setTarget(undefined); setPanelMode("create"); }}>
              <Plus className="h-4 w-4" />
              Add policy
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
        <PolicyPanel
          mode={panelMode}
          row={target}
          rows={rows}
          product={selectedProduct}
          supplierLinks={supplierLinks}
          options={options}
          policyTypes={policyTypes}
          userKey={userKey}
          onSaved={refreshRows}
          onClose={() => { setPanelMode("closed"); setTarget(undefined); }}
        />
      )}

      {selectedProduct && rows.length > 0 && (
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

      {selectedProduct && (
        <Card>
          {loadingRows ? (
            <p className="p-6 text-sm text-muted-foreground">Loading cancellation policies…</p>
          ) : rows.length === 0 ? (
            <EmptyState icon={ShieldCheck} tone="primary" heading="No cancellation policies yet" description={`Add a policy under ${selectedProduct.serviceProductName}.`} size="compact" />
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
      )}

      {!selectedProduct && !loadingTypes && serviceTypes.length > 0 && (
        <EmptyState icon={Package} tone="muted" heading="Select a product" description="Choose a service type and product above to manage its cancellation policies." size="compact" />
      )}
    </div>
  );
}

export default function ServiceProductCancellationPolicyMasterPage() {
  return <AccessGate module="serviceProductCancellationPolicy">{(roleDef) => <CancellationPolicyList roleDef={roleDef} />}</AccessGate>;
}
