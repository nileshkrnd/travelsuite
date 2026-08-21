"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, ListChecks, Eye, Pencil, Power, PowerOff, Trash2, X, Search, Loader2 } from "lucide-react";
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
import { useUsersStore } from "@/lib/store/users.store";
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
import type {
  CommonStatus,
  InclusionExclusionType,
  RoleDef,
  ServiceProduct,
  ServiceProductInclusionExclusion,
  ServiceProductItemType,
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
        <h2 className="text-base font-semibold">
          {mode === "create" ? "Add inclusion / exclusion" : mode === "edit" ? "Edit inclusion / exclusion" : "Item details"}
        </h2>
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
          <Input id="itemName" disabled={isReadOnly} placeholder="e.g. Hotel pickup and drop-off" aria-invalid={!!errors.itemName} {...register("itemName")} />
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

export function ProductInclusionExclusionTab({ product, roleDef }: { product: ServiceProduct; roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const [types, setTypes] = useState<InclusionExclusionType[]>([]);
  const [itemTypes, setItemTypes] = useState<ServiceProductItemType[]>([]);
  const [statuses, setStatuses] = useState<CommonStatus[]>([]);
  const [rows, setRows] = useState<ServiceProductInclusionExclusion[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<ServiceProductInclusionExclusion | undefined>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const canEdit = can(roleDef, "serviceProductInclusionExclusion", "edit");
  const canCreate = can(roleDef, "serviceProductInclusionExclusion", "create");
  const canDelete = can(roleDef, "serviceProductInclusionExclusion", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listInclusionExclusionTypes({ activeOnly: true }),
      listServiceProductItemTypes({ activeOnly: true }),
      listCommonStatusTypes({ tenantId: product.tenantId, activeOnly: true }),
    ]).then(async ([typeRows, itemTypeRows, statusTypeRows]) => {
      if (cancelled) return;
      setTypes(typeRows);
      setItemTypes(itemTypeRows);
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

  async function refreshRows() {
    setLoading(true);
    try {
      const rowsResult = await listServiceProductInclusionExclusions({ serviceProductId: product.serviceProductId });
      setRows(rowsResult);
    } catch (error) {
      toast.error(error instanceof ServiceProductInclusionExclusionsApiError ? error.message : "Failed to load items");
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
    if (term) result = result.filter((r) => r.itemName.toLowerCase().includes(term));
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
    <div className="space-y-4">
      <PageHeader
        title="Inclusion / Exclusion"
        description="What's included and excluded for this product — item, quantity/unit, mandatory flag."
        actions={
          canCreate && panelMode === "closed" && types.length > 0 && statuses.length > 0 ? (
            <Button onClick={() => { setTarget(undefined); setPanelMode("create"); }}>
              <Plus className="h-4 w-4" />
              Add item
            </Button>
          ) : undefined
        }
      />

      {panelMode !== "closed" && (
        <InclusionExclusionPanel mode={panelMode} row={target} rows={rows} product={product} types={types} itemTypes={itemTypes} statuses={statuses} userKey={userKey} onSaved={refreshRows} onClose={() => { setPanelMode("closed"); setTarget(undefined); }} />
      )}

      {rows.length > 0 && (
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

      <Card>
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading items…</p>
        ) : rows.length === 0 ? (
          <EmptyState icon={ListChecks} tone="primary" heading="No items yet" description="Add an inclusion/exclusion for this product." size="compact" />
        ) : visible.length === 0 ? (
          <EmptyState icon={Search} tone="muted" heading="No matching items" description="Try a different search or status filter." size="compact" />
        ) : (
          <Table className="table-fixed border-collapse text-xs [&_th]:h-auto [&_th]:whitespace-normal [&_td]:whitespace-normal">
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
                    <Badge variant={row.inclusionExclusionTypeName === "Exclusion" ? "secondary" : "outline"} className="px-1.5 py-0 text-[11px]">
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
    </div>
  );
}
