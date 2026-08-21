"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Layers, Eye, Pencil, Power, PowerOff, Trash2, X, Search, Loader2, Star } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SortableTableHead, type SortDirection } from "@/components/shared/SortableTableHead";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useSessionStore } from "@/lib/store/session.store";
import { useUsersStore } from "@/lib/store/users.store";
import { listServiceProductOptions, ServiceProductOptionsApiError } from "@/lib/services/service-product-options.service";
import { listCommonStatusTypes } from "@/lib/services/common-status-types.service";
import { listCommonStatuses } from "@/lib/services/common-statuses.service";
import {
  listServiceProductVariants,
  createServiceProductVariant,
  updateServiceProductVariant,
  setServiceProductVariantActive,
  deleteServiceProductVariant,
  ServiceProductVariantsApiError,
} from "@/lib/services/service-product-variants.service";
import { can } from "@/config/permissions";
import type { CommonStatus, RoleDef, ServiceProduct, ServiceProductOption, ServiceProductVariant } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type SortKey = "variantName" | "variantCode" | "displayOrder";
type StatusFilter = "all" | "active" | "inactive";

function useVariantSchema(rows: ServiceProductVariant[], currentId?: number) {
  return z.object({
    variantCode: z.string().trim().min(1, "Code is required").max(50),
    variantName: z.string().trim().min(1, "Name is required").max(200),
    description: z.string().trim().max(1000).optional().or(z.literal("")),
    displayOrder: z.preprocess((v) => (v === "" || v == null ? 0 : Number(v)), z.number().int().min(0)),
    isDefault: z.boolean(),
    isOnlineSellable: z.boolean(),
    commonStatusId: z.number().int().positive("Status is required"),
  }).superRefine((values, ctx) => {
    const duplicateCode = rows.some(
      (r) => r.serviceProductVariantId !== currentId && r.variantCode.toLowerCase() === values.variantCode.trim().toLowerCase()
    );
    if (duplicateCode) {
      ctx.addIssue({ code: "custom", path: ["variantCode"], message: "This variant code already exists for this option" });
    }
    const duplicateName = rows.some(
      (r) => r.serviceProductVariantId !== currentId && r.variantName.trim().toLowerCase() === values.variantName.trim().toLowerCase()
    );
    if (duplicateName) {
      ctx.addIssue({ code: "custom", path: ["variantName"], message: "This variant name already exists for this option" });
    }
  });
}

type FormValues = z.infer<ReturnType<typeof useVariantSchema>>;

function VariantPanel({
  mode,
  row,
  rows,
  option,
  statuses,
  userKey,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: ServiceProductVariant;
  rows: ServiceProductVariant[];
  option: ServiceProductOption;
  statuses: CommonStatus[];
  userKey: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const schema = useVariantSchema(rows, row?.serviceProductVariantId);
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
      variantCode: row?.variantCode ?? "",
      variantName: row?.variantName ?? "",
      description: row?.description ?? "",
      displayOrder: row?.displayOrder ?? 0,
      isDefault: row?.isDefault ?? false,
      isOnlineSellable: row?.isOnlineSellable ?? false,
      commonStatusId: row?.commonStatusId ?? statuses.find((s) => s.isInitial)?.commonStatusId ?? statuses[0]?.commonStatusId ?? 0,
    },
  });

  function blankValues(): FormValues {
    return {
      variantCode: "",
      variantName: "",
      description: "",
      displayOrder: 0,
      isDefault: false,
      isOnlineSellable: false,
      commonStatusId: statuses.find((s) => s.isInitial)?.commonStatusId ?? statuses[0]?.commonStatusId ?? 0,
    };
  }

  async function submit(values: FormValues, keepOpenForMore: boolean) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    const payload = {
      serviceProductOptionId: option.serviceProductOptionId,
      variantCode: values.variantCode.trim(),
      variantName: values.variantName.trim(),
      description: values.description || undefined,
      displayOrder: values.displayOrder,
      isDefault: values.isDefault,
      isOnlineSellable: values.isOnlineSellable,
      commonStatusId: values.commonStatusId,
    };
    try {
      if (mode === "edit" && row) {
        await updateServiceProductVariant(row.serviceProductVariantId, { ...payload, isActive: row.isActive, modifiedBy: userKey });
        toast.success("Variant updated");
        await onSaved();
        onClose();
      } else if (mode === "create") {
        await createServiceProductVariant({ ...payload, createdBy: userKey });
        toast.success("Variant created");
        await onSaved();
        if (keepOpenForMore) {
          reset(blankValues());
        } else {
          onClose();
        }
      }
    } catch (error) {
      toast.error(error instanceof ServiceProductVariantsApiError ? error.message : "Could not save variant");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">{mode === "create" ? "Add variant" : mode === "edit" ? "Edit variant" : "Variant details"}</h2>
          <p className="text-sm text-muted-foreground">Under {option.optionName}</p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit((values) => submit(values, false))} className="grid grid-cols-2 gap-3 sm:grid-cols-4" noValidate>
        <div className="space-y-1">
          <Label htmlFor="variantCode" required>
            Code
          </Label>
          <Input id="variantCode" autoFocus={!isReadOnly} disabled={isReadOnly} placeholder="e.g. SUV" aria-invalid={!!errors.variantCode} {...register("variantCode")} />
          {errors.variantCode && <p className="text-sm text-destructive">{errors.variantCode.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="variantName" required>
            Name
          </Label>
          <Input id="variantName" disabled={isReadOnly} placeholder="e.g. SUV" aria-invalid={!!errors.variantName} {...register("variantName")} />
          {errors.variantName && <p className="text-sm text-destructive">{errors.variantName.message}</p>}
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
          <Label htmlFor="displayOrder">Display order</Label>
          <Input id="displayOrder" type="number" min={0} disabled={isReadOnly} {...register("displayOrder")} />
        </div>

        <div className="col-span-2 flex items-end gap-4 pb-2 sm:col-span-4">
          <Controller
            control={control}
            name="isDefault"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={isReadOnly} />
                Default variant
              </label>
            )}
          />
          <Controller
            control={control}
            name="isOnlineSellable"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={isReadOnly} />
                Online sellable
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
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" rows={2} disabled={isReadOnly} {...register("description")} />
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

export function ProductVariantTab({ product, roleDef }: { product: ServiceProduct; roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const [options, setOptions] = useState<ServiceProductOption[]>([]);
  const [statuses, setStatuses] = useState<CommonStatus[]>([]);
  const [optionCounts, setOptionCounts] = useState<Map<number, number>>(new Map());
  const [rows, setRows] = useState<ServiceProductVariant[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<ServiceProductVariant | undefined>();
  const [optionFilter, setOptionFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>("displayOrder");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const canEdit = can(roleDef, "serviceProductVariant", "edit");
  const canCreate = can(roleDef, "serviceProductVariant", "create");
  const canDelete = can(roleDef, "serviceProductVariant", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  const selectedOption = options.find((o) => o.serviceProductOptionId === optionFilter);

  useEffect(() => {
    let cancelled = false;
    listCommonStatusTypes({ tenantId: product.tenantId, activeOnly: true }).then(async (statusTypeRows) => {
      if (cancelled) return;
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
    setLoadingOptions(true);
    listServiceProductOptions({ serviceProductId: product.serviceProductId, activeOnly: true })
      .then(async (optionRows) => {
        if (cancelled) return;
        setOptions(optionRows);
        const counts = await Promise.all(
          optionRows.map((o) => listServiceProductVariants({ serviceProductOptionId: o.serviceProductOptionId }))
        );
        if (cancelled) return;
        const countMap = new Map<number, number>();
        optionRows.forEach((o, i) => countMap.set(o.serviceProductOptionId, counts[i]?.length ?? 0));
        setOptionCounts((prev) => new Map([...prev, ...countMap]));
        setOptionFilter((current) => {
          if (current && optionRows.some((o) => o.serviceProductOptionId === current)) return current;
          const withData = optionRows.find((o) => (countMap.get(o.serviceProductOptionId) ?? 0) > 0);
          return withData?.serviceProductOptionId ?? optionRows[0]?.serviceProductOptionId ?? null;
        });
      })
      .catch((error) => {
        if (!cancelled) toast.error(error instanceof ServiceProductOptionsApiError ? error.message : "Failed to load options");
      })
      .finally(() => {
        if (!cancelled) setLoadingOptions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [product.serviceProductId]);

  async function refreshRows() {
    if (!optionFilter) {
      setRows([]);
      return;
    }
    setLoadingRows(true);
    try {
      const variantRows = await listServiceProductVariants({ serviceProductOptionId: optionFilter });
      setRows(variantRows);
      setOptionCounts((prev) => {
        const next = new Map(prev);
        next.set(optionFilter, variantRows.length);
        return next;
      });
    } catch (error) {
      toast.error(error instanceof ServiceProductVariantsApiError ? error.message : "Failed to load variants");
      setRows([]);
    } finally {
      setLoadingRows(false);
    }
  }

  useEffect(() => {
    void refreshRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionFilter]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = rows;
    if (term) {
      result = result.filter((r) => r.variantName.toLowerCase().includes(term) || r.variantCode.toLowerCase().includes(term));
    }
    if (statusFilter === "active") result = result.filter((r) => r.isActive);
    if (statusFilter === "inactive") result = result.filter((r) => !r.isActive);
    if (sortKey) {
      result = [...result].sort((a, b) => {
        if (sortKey === "displayOrder") return sortDirection === "asc" ? a.displayOrder - b.displayOrder : b.displayOrder - a.displayOrder;
        const cmp = String(a[sortKey]).localeCompare(String(b[sortKey]));
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [rows, search, statusFilter, sortKey, sortDirection]);

  async function toggleActive(row: ServiceProductVariant) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setServiceProductVariantActive(row.serviceProductVariantId, !row.isActive, userKey);
      await refreshRows();
      toast.success(row.isActive ? "Variant deactivated" : "Variant activated");
    } catch (error) {
      toast.error(error instanceof ServiceProductVariantsApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: ServiceProductVariant) {
    try {
      await deleteServiceProductVariant(row.serviceProductVariantId);
      await refreshRows();
      toast.success("Variant deleted");
    } catch (error) {
      toast.error(error instanceof ServiceProductVariantsApiError ? error.message : "Could not delete variant");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Variants"
        description="Sellable variants within an option — e.g. Sedan / SUV / Van under Private Transfer."
        actions={
          canCreate && panelMode === "closed" && selectedOption && statuses.length > 0 ? (
            <Button onClick={() => { setTarget(undefined); setPanelMode("create"); }}>
              <Plus className="h-4 w-4" />
              Add variant
            </Button>
          ) : undefined
        }
      />

      {loadingOptions && <p className="text-sm text-muted-foreground">Loading options…</p>}

      {!loadingOptions && options.length === 0 && (
        <EmptyState icon={Layers} tone="muted" heading="No options yet" description="Add an option on the Options tab first." size="compact" />
      )}

      {options.length > 0 && (
        <Select value={optionFilter ? String(optionFilter) : ""} onValueChange={(v) => setOptionFilter(v ? Number(v) : null)}>
          <SelectTrigger className="w-64">
            <SelectValue>
              {(value: string | null) => {
                if (!value) return "Select option";
                const o = options.find((o) => String(o.serviceProductOptionId) === value);
                return o ? `${o.optionName} (${optionCounts.get(o.serviceProductOptionId) ?? 0})` : value;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.serviceProductOptionId} value={String(o.serviceProductOptionId)}>
                {o.optionName} ({optionCounts.get(o.serviceProductOptionId) ?? 0})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {panelMode !== "closed" && selectedOption && (
        <VariantPanel mode={panelMode} row={target} rows={rows} option={selectedOption} statuses={statuses} userKey={userKey} onSaved={refreshRows} onClose={() => { setPanelMode("closed"); setTarget(undefined); }} />
      )}

      {selectedOption && rows.length > 0 && (
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

      {selectedOption && (
        <Card>
          {loadingRows ? (
            <p className="p-6 text-sm text-muted-foreground">Loading variants…</p>
          ) : rows.length === 0 ? (
            <EmptyState icon={Layers} tone="primary" heading="No variants yet" description={`Add your first variant under ${selectedOption.optionName}.`} size="compact" />
          ) : visible.length === 0 ? (
            <EmptyState icon={Search} tone="muted" heading="No matching variants" description="Try a different search or status filter." size="compact" />
          ) : (
            <Table className="table-fixed border-collapse text-xs [&_th]:h-auto [&_th]:whitespace-normal [&_td]:whitespace-normal">
              <TableHeader>
                <TableRow>
                  <SortableTableHead sortKey="variantCode" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} className="w-[18%] px-2 py-1.5">
                    Code
                  </SortableTableHead>
                  <SortableTableHead sortKey="variantName" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} className="w-[26%] px-2 py-1.5">
                    Name
                  </SortableTableHead>
                  <SortableTableHead sortKey="displayOrder" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} className="w-[10%] px-2 py-1.5">
                    Order
                  </SortableTableHead>
                  <TableHead className="w-[14%] px-2 py-1.5">Status</TableHead>
                  <TableHead className="w-[12%] px-2 py-1.5">Active</TableHead>
                  <TableHead className="w-[20%] px-2 py-1.5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => (
                  <TableRow key={row.serviceProductVariantId}>
                    <TableCell className="px-2 py-1.5 font-mono font-medium leading-tight">{row.variantCode}</TableCell>
                    <TableCell className="px-2 py-1.5 font-medium leading-tight">
                      <span className="flex items-center gap-1.5">
                        {row.isDefault && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                        {row.variantName}
                      </span>
                    </TableCell>
                    <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.displayOrder}</TableCell>
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
    </div>
  );
}
