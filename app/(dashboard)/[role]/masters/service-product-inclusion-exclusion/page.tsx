"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, ListChecks, Package, Eye, Pencil, Power, PowerOff, Trash2, X, Search, Loader2 } from "lucide-react";
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
import { listInclusionExclusionTypes } from "@/lib/services/inclusion-exclusion-types.service";
import { listServiceProductItemTypes } from "@/lib/services/service-product-item-types.service";
import { listCommonStatusTypes } from "@/lib/services/common-status-types.service";
import { listCommonStatuses } from "@/lib/services/common-statuses.service";
import {
  listServiceProductInclusionExclusions,
  createServiceProductInclusionExclusion,
  updateServiceProductInclusionExclusion,
  setServiceProductInclusionExclusionActive,
  deleteServiceProductInclusionExclusion,
  ServiceProductInclusionExclusionsApiError,
} from "@/lib/services/service-product-inclusion-exclusions.service";
import { can } from "@/config/permissions";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import type {
  CommonStatus,
  InclusionExclusionType,
  RoleDef,
  ServiceProduct,
  ServiceProductInclusionExclusion,
  ServiceProductItemType,
  ServiceType,
} from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type StatusFilter = "all" | "active" | "inactive";
const NONE = "none";

function useInclusionExclusionSchema(rows: ServiceProductInclusionExclusion[], currentId?: number) {
  return z.object({
    inclusionExclusionTypeId: z.number().int().positive("Type is required"),
    itemTypeId: z.number().int().positive().nullable(),
    itemName: z.string().trim().min(1, "Item name is required").max(250),
    description: z.string().trim().max(1000).optional().or(z.literal("")),
    quantity: z.string().trim().optional().or(z.literal("")),
    unitId: z.number().int().positive().nullable(),
    isMandatory: z.boolean(),
    displayOrder: z.preprocess((v) => (v === "" || v == null ? 0 : Number(v)), z.number().int().min(0)),
    commonStatusId: z.number().int().positive("Status is required"),
  }).superRefine((values, ctx) => {
    const duplicate = rows.some(
      (r) =>
        r.serviceProductInclusionExclusionId !== currentId &&
        r.inclusionExclusionTypeId === values.inclusionExclusionTypeId &&
        r.itemName.trim().toLowerCase() === values.itemName.trim().toLowerCase()
    );
    if (duplicate) {
      ctx.addIssue({ code: "custom", path: ["itemName"], message: "This item already exists for this type" });
    }
  });
}

type FormValues = z.infer<ReturnType<typeof useInclusionExclusionSchema>>;

function blankValues(types: InclusionExclusionType[], statuses: CommonStatus[]): FormValues {
  return {
    inclusionExclusionTypeId: types[0]?.inclusionExclusionTypeId ?? 0,
    itemTypeId: null,
    itemName: "",
    description: "",
    quantity: "",
    unitId: null,
    isMandatory: false,
    displayOrder: 0,
    commonStatusId: statuses.find((s) => s.isInitial)?.commonStatusId ?? statuses[0]?.commonStatusId ?? 0,
  };
}

function InclusionExclusionPanel({
  mode,
  row,
  rows,
  product,
  types,
  itemTypes,
  statuses,
  userKey,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: ServiceProductInclusionExclusion;
  rows: ServiceProductInclusionExclusion[];
  product: ServiceProduct;
  types: InclusionExclusionType[];
  itemTypes: ServiceProductItemType[];
  statuses: CommonStatus[];
  userKey: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const schema = useInclusionExclusionSchema(rows, row?.serviceProductInclusionExclusionId);
  const isReadOnly = mode === "view";

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
      inclusionExclusionTypeId: row?.inclusionExclusionTypeId ?? types[0]?.inclusionExclusionTypeId ?? 0,
      itemTypeId: row?.itemTypeId ?? null,
      itemName: row?.itemName ?? "",
      description: row?.description ?? "",
      quantity: row?.quantity != null ? String(row.quantity) : "",
      unitId: row?.unitId ?? null,
      isMandatory: row?.isMandatory ?? false,
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
      inclusionExclusionTypeId: values.inclusionExclusionTypeId,
      itemTypeId: values.itemTypeId,
      itemName: values.itemName.trim(),
      description: values.description?.trim() || null,
      quantity: values.quantity?.trim() ? Number(values.quantity) : null,
      unitId: values.unitId,
      isMandatory: values.isMandatory,
      displayOrder: values.displayOrder,
      commonStatusId: values.commonStatusId,
    };
    try {
      if (mode === "edit" && row) {
        await updateServiceProductInclusionExclusion(row.serviceProductInclusionExclusionId, { ...payload, isActive: row.isActive, modifiedBy: userKey });
        toast.success("Item updated");
      } else if (mode === "create") {
        await createServiceProductInclusionExclusion({ ...payload, createdBy: userKey });
        toast.success("Item added");
      }
      await onSaved();
      if (mode === "create" && keepOpenForMore) {
        reset(blankValues(types, statuses));
      } else {
        onClose();
      }
    } catch (error) {
      toast.error(error instanceof ServiceProductInclusionExclusionsApiError ? error.message : "Could not save item");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">
            {mode === "create" ? "Add inclusion / exclusion" : mode === "edit" ? "Edit inclusion / exclusion" : "Item details"}
          </h2>
          <p className="text-sm text-muted-foreground">Under {product.serviceProductName}</p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit((values) => submit(values, false))} className="grid grid-cols-2 gap-3 sm:grid-cols-4" noValidate>
        <div className="space-y-1">
          <Label required>Type</Label>
          <Controller
            control={control}
            name="inclusionExclusionTypeId"
            render={({ field }) => (
              <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(Number(v))} disabled={isReadOnly}>
                <SelectTrigger className="h-10 w-full min-w-0" aria-invalid={!!errors.inclusionExclusionTypeId}>
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return "Select type";
                      return types.find((t) => String(t.inclusionExclusionTypeId) === value)?.typeName ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t.inclusionExclusionTypeId} value={String(t.inclusionExclusionTypeId)}>
                      {t.typeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.inclusionExclusionTypeId && <p className="text-sm text-destructive">{errors.inclusionExclusionTypeId.message}</p>}
        </div>

        <div className="space-y-1 sm:col-span-3">
          <Label htmlFor="itemName" required>
            Item name
          </Label>
          <Input id="itemName" autoFocus={!isReadOnly} disabled={isReadOnly} placeholder="e.g. Hotel pickup and drop-off" aria-invalid={!!errors.itemName} {...register("itemName")} />
          {errors.itemName && <p className="text-sm text-destructive">{errors.itemName.message}</p>}
        </div>

        <div className="space-y-1">
          <Label>Item type</Label>
          <Controller
            control={control}
            name="itemTypeId"
            render={({ field }) => (
              <Select value={field.value ? String(field.value) : NONE} onValueChange={(v) => field.onChange(!v || v === NONE ? null : Number(v))} disabled={isReadOnly}>
                <SelectTrigger className="h-10 w-full min-w-0">
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value || value === NONE) return "None";
                      return itemTypes.find((t) => String(t.serviceProductItemTypeId) === value)?.itemTypeName ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {itemTypes.map((t) => (
                    <SelectItem key={t.serviceProductItemTypeId} value={String(t.serviceProductItemTypeId)}>
                      {t.itemTypeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="quantity">Quantity</Label>
          <Input id="quantity" type="number" min={0} step="0.01" disabled={isReadOnly} {...register("quantity")} />
        </div>

        <div className="space-y-1">
          <Label>Unit</Label>
          <Controller
            control={control}
            name="unitId"
            render={({ field }) => (
              <Select value={field.value ? String(field.value) : NONE} onValueChange={(v) => field.onChange(!v || v === NONE ? null : Number(v))} disabled={isReadOnly}>
                <SelectTrigger className="h-10 w-full min-w-0">
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value || value === NONE) return "None";
                      return itemTypes.find((t) => String(t.serviceProductItemTypeId) === value)?.itemTypeName ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {itemTypes.map((t) => (
                    <SelectItem key={t.serviceProductItemTypeId} value={String(t.serviceProductItemTypeId)}>
                      {t.itemTypeName}
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

        <div className="flex items-end pb-2">
          <Controller
            control={control}
            name="isMandatory"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={isReadOnly} />
                Mandatory
              </label>
            )}
          />
        </div>

        <div className="space-y-1 sm:col-span-4">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" rows={2} disabled={isReadOnly} {...register("description")} />
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

function InclusionExclusionList({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const activeTenant = useTenantStore((s) => s.tenant);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [products, setProducts] = useState<ServiceProduct[]>([]);
  const [types, setTypes] = useState<InclusionExclusionType[]>([]);
  const [itemTypes, setItemTypes] = useState<ServiceProductItemType[]>([]);
  const [statuses, setStatuses] = useState<CommonStatus[]>([]);
  const [productCounts, setProductCounts] = useState<Map<number, number>>(new Map());
  const [rows, setRows] = useState<ServiceProductInclusionExclusion[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<ServiceProductInclusionExclusion | undefined>();
  const [serviceTypeFilter, setServiceTypeFilter] = useState<number | null>(null);
  const [productFilter, setProductFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const scopeTenantId = platformMode ? 0 : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);

  const canEdit = can(roleDef, "serviceProductInclusionExclusion", "edit");
  const canCreate = can(roleDef, "serviceProductInclusionExclusion", "create");
  const canDelete = can(roleDef, "serviceProductInclusionExclusion", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  const selectedProduct = products.find((p) => p.serviceProductId === productFilter);

  async function loadServiceTypes() {
    if (scopeTenantId <= 0) {
      setServiceTypes([]);
      setLoadingTypes(false);
      setLoadError(platformMode ? "Select a tenant workspace to manage inclusions/exclusions." : "Missing tenant scope.");
      return;
    }
    setLoadingTypes(true);
    setLoadError(null);
    try {
      const [typeRows, allProducts, inclExclTypeRows, itemTypeRows, statusTypeRows] = await Promise.all([
        listServiceTypes({ tenantId: scopeTenantId, activeOnly: true }),
        listServiceProducts({ tenantId: scopeTenantId }),
        listInclusionExclusionTypes({ activeOnly: true }),
        listServiceProductItemTypes({ activeOnly: true }),
        listCommonStatusTypes({ tenantId: scopeTenantId, activeOnly: true }),
      ]);
      setServiceTypes(typeRows);
      setTypes(inclExclTypeRows);
      setItemTypes(itemTypeRows);
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
      const rowsResult = await listServiceProductInclusionExclusions({ serviceProductId: productFilter });
      setRows(rowsResult);
      setProductCounts((prev) => {
        const next = new Map(prev);
        next.set(productFilter, rowsResult.length);
        return next;
      });
    } catch (error) {
      toast.error(error instanceof ServiceProductInclusionExclusionsApiError ? error.message : "Failed to load items");
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
      result = result.filter((r) => r.itemName.toLowerCase().includes(term));
    }
    if (statusFilter === "active") result = result.filter((r) => r.isActive);
    if (statusFilter === "inactive") result = result.filter((r) => !r.isActive);
    return result;
  }, [rows, search, statusFilter]);

  async function toggleActive(row: ServiceProductInclusionExclusion) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setServiceProductInclusionExclusionActive(row.serviceProductInclusionExclusionId, !row.isActive, userKey);
      await refreshRows();
      toast.success(row.isActive ? "Item deactivated" : "Item activated");
    } catch (error) {
      toast.error(error instanceof ServiceProductInclusionExclusionsApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: ServiceProductInclusionExclusion) {
    try {
      await deleteServiceProductInclusionExclusion(row.serviceProductInclusionExclusionId);
      await refreshRows();
      toast.success("Item deleted");
    } catch (error) {
      toast.error(error instanceof ServiceProductInclusionExclusionsApiError ? error.message : "Could not delete item");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Service Product Inclusion / Exclusion"
        description="What's included and excluded for a Service Product — item, quantity/unit, mandatory flag."
        actions={
          canCreate && panelMode === "closed" && selectedProduct && types.length > 0 && statuses.length > 0 ? (
            <Button
              onClick={() => {
                setTarget(undefined);
                setPanelMode("create");
              }}
            >
              <Plus className="h-4 w-4" />
              Add item
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
        <InclusionExclusionPanel
          mode={panelMode}
          row={target}
          rows={rows}
          product={selectedProduct}
          types={types}
          itemTypes={itemTypes}
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
            <Input placeholder="Search item…" value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
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
            <p className="p-6 text-sm text-muted-foreground">Loading items…</p>
          ) : rows.length === 0 ? (
            <EmptyState icon={ListChecks} tone="primary" heading="No items yet" description={`Add an inclusion/exclusion under ${selectedProduct.serviceProductName}.`} size="compact" />
          ) : visible.length === 0 ? (
            <EmptyState icon={Search} tone="muted" heading="No matching items" description="Try a different search or status filter." size="compact" />
          ) : (
            <Table className="table-fixed border-collapse text-xs [&_th]:whitespace-normal [&_td]:whitespace-normal">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[10%] px-2 py-1.5">Type</TableHead>
                  <TableHead className="w-[26%] px-2 py-1.5">Item</TableHead>
                  <TableHead className="w-[16%] px-2 py-1.5">Item type</TableHead>
                  <TableHead className="w-[14%] px-2 py-1.5">Qty / Unit</TableHead>
                  <TableHead className="w-[12%] px-2 py-1.5">Status</TableHead>
                  <TableHead className="w-[22%] px-2 py-1.5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => (
                  <TableRow key={row.serviceProductInclusionExclusionId}>
                    <TableCell className="px-2 py-1.5 leading-tight">
                      <Badge
                        variant={row.inclusionExclusionTypeName === "Exclusion" ? "secondary" : "outline"}
                        className="px-1.5 py-0 text-[11px]"
                      >
                        {row.inclusionExclusionTypeName ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-2 py-1.5 font-medium leading-tight">
                      {row.itemName}
                      {row.isMandatory && (
                        <Badge variant="outline" className="ml-1.5 px-1.5 py-0 text-[11px]">
                          mandatory
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.itemTypeName ?? "—"}</TableCell>
                    <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">
                      {row.quantity != null ? `${row.quantity}${row.unitName ? ` ${row.unitName}` : ""}` : "—"}
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
        <EmptyState icon={Package} tone="muted" heading="Select a product" description="Choose a service type and product above to manage its inclusions/exclusions." size="compact" />
      )}
    </div>
  );
}

export default function ServiceProductInclusionExclusionMasterPage() {
  return <AccessGate module="serviceProductInclusionExclusion">{(roleDef) => <InclusionExclusionList roleDef={roleDef} />}</AccessGate>;
}
