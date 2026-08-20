"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Tag, Eye, Pencil, Power, PowerOff, Trash2, X, Search, Loader2 } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SortableTableHead, type SortDirection } from "@/components/shared/SortableTableHead";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  listServiceProductItemTypes,
  createServiceProductItemType,
  updateServiceProductItemType,
  setServiceProductItemTypeActive,
  deleteServiceProductItemType,
  ServiceProductItemTypesApiError,
} from "@/lib/services/service-product-item-types.service";
import { useSessionStore } from "@/lib/store/session.store";
import { useUsersStore } from "@/lib/store/users.store";
import { can } from "@/config/permissions";
import type { RoleDef, ServiceProductItemType } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type SortKey = "itemTypeCode" | "itemTypeName" | "displayOrder";
type StatusFilter = "all" | "active" | "inactive";

const baseSchema = z.object({
  itemTypeCode: z.string().trim().min(1, "Code is required").max(50, "Must be 50 characters or fewer"),
  itemTypeName: z.string().trim().min(1, "Name is required").max(100, "Must be 100 characters or fewer"),
  displayOrder: z.preprocess((v) => (v === "" || v == null ? 0 : Number(v)), z.number().int().min(0)),
});

function useItemTypeSchema(rows: ServiceProductItemType[], currentId?: number) {
  return useMemo(
    () =>
      baseSchema.superRefine((values, ctx) => {
        const codeDuplicate = rows.some(
          (r) => r.serviceProductItemTypeId !== currentId && r.itemTypeCode.toLowerCase() === values.itemTypeCode.trim().toLowerCase()
        );
        if (codeDuplicate) ctx.addIssue({ code: "custom", path: ["itemTypeCode"], message: "This code already exists" });
        const nameDuplicate = rows.some(
          (r) => r.serviceProductItemTypeId !== currentId && r.itemTypeName.toLowerCase() === values.itemTypeName.trim().toLowerCase()
        );
        if (nameDuplicate) ctx.addIssue({ code: "custom", path: ["itemTypeName"], message: "This name already exists" });
      }),
    [rows, currentId]
  );
}

type FormValues = z.infer<typeof baseSchema>;

function blankValues(): FormValues {
  return { itemTypeCode: "", itemTypeName: "", displayOrder: 0 };
}

function ItemTypePanel({
  mode,
  row,
  rows,
  userKey,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: ServiceProductItemType;
  rows: ServiceProductItemType[];
  userKey: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const schema = useItemTypeSchema(rows, row?.serviceProductItemTypeId);
  const isReadOnly = mode === "view";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    values: {
      itemTypeCode: row?.itemTypeCode ?? "",
      itemTypeName: row?.itemTypeName ?? "",
      displayOrder: row?.displayOrder ?? 0,
    },
  });

  async function submit(values: FormValues, keepOpenForMore: boolean) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    const payload = { itemTypeCode: values.itemTypeCode.trim(), itemTypeName: values.itemTypeName.trim(), displayOrder: values.displayOrder };
    try {
      if (mode === "edit" && row) {
        await updateServiceProductItemType(row.serviceProductItemTypeId, { ...payload, isActive: row.isActive, modifiedBy: userKey });
        toast.success("Item type updated");
      } else if (mode === "create") {
        await createServiceProductItemType({ ...payload, createdBy: userKey });
        toast.success("Item type created");
      }
      await onSaved();
      if (mode === "create" && keepOpenForMore) {
        reset(blankValues());
      } else {
        onClose();
      }
    } catch (error) {
      toast.error(error instanceof ServiceProductItemTypesApiError ? error.message : "Could not save item type");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold">
          {mode === "create" ? "Add item type" : mode === "edit" ? "Edit item type" : "Item type details"}
        </h2>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit((values) => submit(values, false))} className="grid grid-cols-2 gap-3 sm:grid-cols-3" noValidate>
        <div className="space-y-1">
          <Label htmlFor="itemTypeCode" required>
            Code
          </Label>
          <Input id="itemTypeCode" autoFocus={!isReadOnly} disabled={isReadOnly} placeholder="e.g. TRANSPORT" aria-invalid={!!errors.itemTypeCode} {...register("itemTypeCode")} />
          {errors.itemTypeCode && <p className="text-sm text-destructive">{errors.itemTypeCode.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="itemTypeName" required>
            Name
          </Label>
          <Input id="itemTypeName" disabled={isReadOnly} placeholder="e.g. Transport" aria-invalid={!!errors.itemTypeName} {...register("itemTypeName")} />
          {errors.itemTypeName && <p className="text-sm text-destructive">{errors.itemTypeName.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="displayOrder">Display order</Label>
          <Input id="displayOrder" type="number" min={0} disabled={isReadOnly} {...register("displayOrder")} />
        </div>

        {mode === "view" && row && (
          <div className="space-y-1">
            <Label>Status</Label>
            <div>
              <Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "active" : "inactive"}</Badge>
            </div>
          </div>
        )}

        {!isReadOnly && (
          <div className="flex items-center gap-2 sm:col-span-3">
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

function ItemTypeList({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const [rows, setRows] = useState<ServiceProductItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<ServiceProductItemType | undefined>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>("displayOrder");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const canEdit = can(roleDef, "serviceProductItemType", "edit");
  const canCreate = can(roleDef, "serviceProductItemType", "create");
  const canDelete = can(roleDef, "serviceProductItemType", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  async function refresh() {
    setLoading(true);
    setLoadError(null);
    try {
      const rowsResult = await listServiceProductItemTypes();
      setRows(rowsResult);
    } catch (error) {
      setLoadError(error instanceof ServiceProductItemTypesApiError ? error.message : "Failed to load item types");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

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
    if (term) result = result.filter((r) => r.itemTypeName.toLowerCase().includes(term) || r.itemTypeCode.toLowerCase().includes(term));
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

  async function toggleActive(row: ServiceProductItemType) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setServiceProductItemTypeActive(row.serviceProductItemTypeId, !row.isActive, userKey);
      await refresh();
      toast.success(row.isActive ? "Item type deactivated" : "Item type activated");
    } catch (error) {
      toast.error(error instanceof ServiceProductItemTypesApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: ServiceProductItemType) {
    try {
      await deleteServiceProductItemType(row.serviceProductItemTypeId);
      await refresh();
      toast.success("Item type deleted");
    } catch (error) {
      toast.error(error instanceof ServiceProductItemTypesApiError ? error.message : "Could not delete item type");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Service Product Item Type"
        description="Global lookup — Transport, Meal, Ticket, Guide, … also used as the inclusion/exclusion quantity unit."
        actions={
          canCreate && panelMode === "closed" ? (
            <Button
              onClick={() => {
                setTarget(undefined);
                setPanelMode("create");
              }}
            >
              <Plus className="h-4 w-4" />
              Add item type
            </Button>
          ) : undefined
        }
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading item types…</p>}

      {panelMode !== "closed" && (
        <ItemTypePanel mode={panelMode} row={target} rows={rows} userKey={userKey} onSaved={refresh} onClose={() => { setPanelMode("closed"); setTarget(undefined); }} />
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
        {!loading && rows.length === 0 ? (
          <EmptyState icon={Tag} tone="primary" heading="No item types yet" description="Add your first item type." size="compact" />
        ) : visible.length === 0 && !loading ? (
          <EmptyState icon={Search} tone="muted" heading="No matching item types" description="Try a different search or status filter." size="compact" />
        ) : (
          <Table className="table-fixed border-collapse text-xs [&_th]:whitespace-normal [&_td]:whitespace-normal">
            <TableHeader>
              <TableRow>
                <SortableTableHead sortKey="itemTypeCode" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} className="w-[25%] px-2 py-1.5">
                  Code
                </SortableTableHead>
                <SortableTableHead sortKey="itemTypeName" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} className="w-[25%] px-2 py-1.5">
                  Name
                </SortableTableHead>
                <SortableTableHead sortKey="displayOrder" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} className="w-[15%] px-2 py-1.5">
                  Order
                </SortableTableHead>
                <TableHead className="w-[15%] px-2 py-1.5">Status</TableHead>
                <TableHead className="w-[20%] px-2 py-1.5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => (
                <TableRow key={row.serviceProductItemTypeId}>
                  <TableCell className="px-2 py-1.5 font-mono leading-tight font-medium">{row.itemTypeCode}</TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight font-medium">{row.itemTypeName}</TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.displayOrder}</TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight">
                    <Badge variant={row.isActive ? "default" : "secondary"} className="px-1.5 py-0 text-[11px]">{row.isActive ? "active" : "inactive"}</Badge>
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

export default function ServiceProductItemTypeMasterPage() {
  return <AccessGate module="serviceProductItemType">{(roleDef) => <ItemTypeList roleDef={roleDef} />}</AccessGate>;
}
