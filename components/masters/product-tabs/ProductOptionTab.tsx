"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, ListTree, Eye, Pencil, Power, PowerOff, Trash2, X, Search, Loader2, Star } from "lucide-react";
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
import { listCommonStatusTypes } from "@/lib/services/common-status-types.service";
import { listCommonStatuses } from "@/lib/services/common-statuses.service";
import {
  listServiceProductOptions,
  createServiceProductOption,
  updateServiceProductOption,
  setServiceProductOptionActive,
  deleteServiceProductOption,
  ServiceProductOptionsApiError,
} from "@/lib/services/service-product-options.service";
import { can } from "@/config/permissions";
import type { CommonStatus, RoleDef, ServiceProduct, ServiceProductOption } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type SortKey = "optionName" | "optionCode" | "displayOrder";
type StatusFilter = "all" | "active" | "inactive";

function useOptionSchema(rows: ServiceProductOption[], currentId?: number) {
  return z.object({
    optionCode: z.string().trim().min(1, "Code is required").max(50),
    optionName: z.string().trim().min(1, "Name is required").max(200),
    description: z.string().trim().max(1000).optional().or(z.literal("")),
    displayOrder: z.preprocess((v) => (v === "" || v == null ? 0 : Number(v)), z.number().int().min(0)),
    isDefault: z.boolean(),
    isOnlineSellable: z.boolean(),
    commonStatusId: z.number().int().positive("Status is required"),
  }).superRefine((values, ctx) => {
    const duplicateCode = rows.some(
      (r) => r.serviceProductOptionId !== currentId && r.optionCode.toLowerCase() === values.optionCode.trim().toLowerCase()
    );
    if (duplicateCode) {
      ctx.addIssue({ code: "custom", path: ["optionCode"], message: "This option code already exists for this product" });
    }
    const duplicateName = rows.some(
      (r) => r.serviceProductOptionId !== currentId && r.optionName.trim().toLowerCase() === values.optionName.trim().toLowerCase()
    );
    if (duplicateName) {
      ctx.addIssue({ code: "custom", path: ["optionName"], message: "This option name already exists for this product" });
    }
  });
}

type FormValues = z.infer<ReturnType<typeof useOptionSchema>>;

function OptionPanel({
  mode,
  row,
  rows,
  product,
  statuses,
  userKey,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: ServiceProductOption;
  rows: ServiceProductOption[];
  product: ServiceProduct;
  statuses: CommonStatus[];
  userKey: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const schema = useOptionSchema(rows, row?.serviceProductOptionId);
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
      optionCode: row?.optionCode ?? "",
      optionName: row?.optionName ?? "",
      description: row?.description ?? "",
      displayOrder: row?.displayOrder ?? 0,
      isDefault: row?.isDefault ?? false,
      isOnlineSellable: row?.isOnlineSellable ?? false,
      commonStatusId: row?.commonStatusId ?? statuses.find((s) => s.isInitial)?.commonStatusId ?? statuses[0]?.commonStatusId ?? 0,
    },
  });

  function blankValues(): FormValues {
    return {
      optionCode: "",
      optionName: "",
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
      serviceProductId: product.serviceProductId,
      optionCode: values.optionCode.trim(),
      optionName: values.optionName.trim(),
      description: values.description || undefined,
      displayOrder: values.displayOrder,
      isDefault: values.isDefault,
      isOnlineSellable: values.isOnlineSellable,
      commonStatusId: values.commonStatusId,
    };
    try {
      if (mode === "edit" && row) {
        await updateServiceProductOption(row.serviceProductOptionId, { ...payload, isActive: row.isActive, modifiedBy: userKey });
        toast.success("Option updated");
        await onSaved();
        onClose();
      } else if (mode === "create") {
        await createServiceProductOption({ ...payload, createdBy: userKey });
        toast.success("Option created");
        await onSaved();
        if (keepOpenForMore) {
          reset(blankValues());
        } else {
          onClose();
        }
      }
    } catch (error) {
      toast.error(error instanceof ServiceProductOptionsApiError ? error.message : "Could not save option");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold">{mode === "create" ? "Add option" : mode === "edit" ? "Edit option" : "Option details"}</h2>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit((values) => submit(values, false))} className="grid grid-cols-2 gap-3 sm:grid-cols-4" noValidate>
        <div className="space-y-1">
          <Label htmlFor="optionCode" required>
            Code
          </Label>
          <Input id="optionCode" autoFocus={!isReadOnly} disabled={isReadOnly} placeholder="e.g. PREMIUM" aria-invalid={!!errors.optionCode} {...register("optionCode")} />
          {errors.optionCode && <p className="text-sm text-destructive">{errors.optionCode.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="optionName" required>
            Name
          </Label>
          <Input id="optionName" disabled={isReadOnly} placeholder="e.g. Premium Safari" aria-invalid={!!errors.optionName} {...register("optionName")} />
          {errors.optionName && <p className="text-sm text-destructive">{errors.optionName.message}</p>}
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
                Default option
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

export function ProductOptionTab({ product, roleDef }: { product: ServiceProduct; roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const [statuses, setStatuses] = useState<CommonStatus[]>([]);
  const [rows, setRows] = useState<ServiceProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<ServiceProductOption | undefined>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>("displayOrder");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const canEdit = can(roleDef, "serviceProductOption", "edit");
  const canCreate = can(roleDef, "serviceProductOption", "create");
  const canDelete = can(roleDef, "serviceProductOption", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

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

  async function refreshRows() {
    setLoading(true);
    try {
      const optionRows = await listServiceProductOptions({ serviceProductId: product.serviceProductId });
      setRows(optionRows);
    } catch (error) {
      toast.error(error instanceof ServiceProductOptionsApiError ? error.message : "Failed to load options");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.serviceProductId]);

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
      result = result.filter((r) => r.optionName.toLowerCase().includes(term) || r.optionCode.toLowerCase().includes(term));
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

  async function toggleActive(row: ServiceProductOption) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setServiceProductOptionActive(row.serviceProductOptionId, !row.isActive, userKey);
      await refreshRows();
      toast.success(row.isActive ? "Option deactivated" : "Option activated");
    } catch (error) {
      toast.error(error instanceof ServiceProductOptionsApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: ServiceProductOption) {
    try {
      await deleteServiceProductOption(row.serviceProductOptionId);
      await refreshRows();
      toast.success("Option deleted");
    } catch (error) {
      toast.error(error instanceof ServiceProductOptionsApiError ? error.message : "Could not delete option");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Options"
        description="Sellable options within this product — e.g. Standard / Premium / Private Safari."
        actions={
          canCreate && panelMode === "closed" && statuses.length > 0 ? (
            <Button onClick={() => { setTarget(undefined); setPanelMode("create"); }}>
              <Plus className="h-4 w-4" />
              Add option
            </Button>
          ) : undefined
        }
      />

      {panelMode !== "closed" && (
        <OptionPanel mode={panelMode} row={target} rows={rows} product={product} statuses={statuses} userKey={userKey} onSaved={refreshRows} onClose={() => { setPanelMode("closed"); setTarget(undefined); }} />
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
          <p className="p-6 text-sm text-muted-foreground">Loading options…</p>
        ) : rows.length === 0 ? (
          <EmptyState icon={ListTree} tone="primary" heading="No options yet" description="Add your first option for this product." size="compact" />
        ) : visible.length === 0 ? (
          <EmptyState icon={Search} tone="muted" heading="No matching options" description="Try a different search or status filter." size="compact" />
        ) : (
          <Table className="table-fixed border-collapse text-xs [&_th]:h-auto [&_th]:whitespace-normal [&_td]:whitespace-normal">
            <TableHeader>
              <TableRow>
                <SortableTableHead sortKey="optionCode" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} className="w-[18%] px-2 py-1.5">
                  Code
                </SortableTableHead>
                <SortableTableHead sortKey="optionName" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} className="w-[26%] px-2 py-1.5">
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
                <TableRow key={row.serviceProductOptionId}>
                  <TableCell className="px-2 py-1.5 font-mono font-medium leading-tight">{row.optionCode}</TableCell>
                  <TableCell className="px-2 py-1.5 font-medium leading-tight">
                    <span className="flex items-center gap-1.5">
                      {row.isDefault && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                      {row.optionName}
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
    </div>
  );
}
