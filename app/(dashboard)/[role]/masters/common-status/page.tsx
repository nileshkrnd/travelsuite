"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, ListOrdered, Workflow, MoreHorizontal, X, Search, Loader2, Flag, CheckCircle2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore, isPlatformMode } from "@/lib/store/tenant.store";
import { useUsersStore } from "@/lib/store/users.store";
import { listCommonStatusTypes, CommonStatusTypesApiError } from "@/lib/services/common-status-types.service";
import {
  listCommonStatuses,
  createCommonStatus,
  updateCommonStatus,
  setCommonStatusActive,
  deleteCommonStatus,
  CommonStatusesApiError,
} from "@/lib/services/common-statuses.service";
import { can } from "@/config/permissions";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import type { CommonStatus, CommonStatusType, RoleDef } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type SortKey = "statusName" | "statusCode" | "displayOrder";
type StatusFilter = "all" | "active" | "inactive";

function useStatusSchema(rows: CommonStatus[], currentId?: number) {
  return z.object({
    statusCode: z.string().trim().min(1, "Code is required").max(50, "Must be 50 characters or fewer"),
    statusName: z.string().trim().min(1, "Name is required").max(100, "Must be 100 characters or fewer"),
    description: z.string().trim().max(500).optional().or(z.literal("")),
    displayOrder: z.preprocess((v) => (v === "" || v == null ? 0 : Number(v)), z.number().int().min(0)),
    isInitial: z.boolean(),
    isFinal: z.boolean(),
  }).superRefine((values, ctx) => {
    const duplicate = rows.some(
      (r) => r.commonStatusId !== currentId && r.statusCode.toLowerCase() === values.statusCode.trim().toLowerCase()
    );
    if (duplicate) {
      ctx.addIssue({ code: "custom", path: ["statusCode"], message: "This status code already exists for this status type" });
    }
  });
}

type FormValues = z.infer<ReturnType<typeof useStatusSchema>>;

function StatusPanel({
  mode,
  row,
  rows,
  statusType,
  userKey,
  tenantId,
  companyId,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: CommonStatus;
  rows: CommonStatus[];
  statusType: CommonStatusType;
  userKey: number;
  tenantId: number;
  companyId: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const schema = useStatusSchema(rows, row?.commonStatusId);
  const isReadOnly = mode === "view";

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    values: {
      statusCode: row?.statusCode ?? "",
      statusName: row?.statusName ?? "",
      description: row?.description ?? "",
      displayOrder: row?.displayOrder ?? 0,
      isInitial: row?.isInitial ?? false,
      isFinal: row?.isFinal ?? false,
    },
  });

  async function onSubmit(values: FormValues) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    const payload = {
      commonStatusTypeId: statusType.commonStatusTypeId,
      statusCode: values.statusCode.trim(),
      statusName: values.statusName.trim(),
      description: values.description || undefined,
      displayOrder: values.displayOrder,
      isInitial: values.isInitial,
      isFinal: values.isFinal,
      tenantId,
      companyId,
    };
    try {
      if (mode === "edit" && row) {
        await updateCommonStatus(row.commonStatusId, { ...payload, isActive: row.isActive, modifiedBy: userKey });
        toast.success("Status updated");
      } else if (mode === "create") {
        await createCommonStatus({ ...payload, createdBy: userKey });
        toast.success("Status created");
      }
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof CommonStatusesApiError ? error.message : "Could not save status");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">
            {mode === "create" ? "Add status" : mode === "edit" ? "Edit status" : "Status details"}
          </h2>
          <p className="text-sm text-muted-foreground">Under {statusType.statusTypeName}</p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <div className="space-y-2">
          <Label htmlFor="statusCode" required>
            Code
          </Label>
          <Input
            id="statusCode"
            autoFocus={!isReadOnly}
            disabled={isReadOnly}
            placeholder="e.g. UNDER_REVIEW"
            aria-invalid={!!errors.statusCode}
            {...register("statusCode")}
          />
          {errors.statusCode && <p className="text-sm text-destructive">{errors.statusCode.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="statusName" required>
            Name
          </Label>
          <Input
            id="statusName"
            disabled={isReadOnly}
            placeholder="e.g. Under Review"
            aria-invalid={!!errors.statusName}
            {...register("statusName")}
          />
          {errors.statusName && <p className="text-sm text-destructive">{errors.statusName.message}</p>}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" rows={2} disabled={isReadOnly} {...register("description")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayOrder">Display order</Label>
          <Input id="displayOrder" type="number" min={0} disabled={isReadOnly} {...register("displayOrder")} />
        </div>

        <div className="flex items-end gap-4 pb-2">
          <Controller
            control={control}
            name="isInitial"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={isReadOnly} />
                Initial status
              </label>
            )}
          />
          <Controller
            control={control}
            name="isFinal"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={isReadOnly} />
                Final status
              </label>
            )}
          />
        </div>

        {mode === "view" && row && (
          <div className="space-y-2">
            <Label>Status</Label>
            <div>
              <Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "active" : "inactive"}</Badge>
            </div>
          </div>
        )}

        {!isReadOnly && (
          <div className="flex items-center gap-2 sm:col-span-2">
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

function StatusList({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const activeTenant = useTenantStore((s) => s.tenant);
  const [statusTypes, setStatusTypes] = useState<CommonStatusType[]>([]);
  const [typeCounts, setTypeCounts] = useState<Map<number, number>>(new Map());
  const [rows, setRows] = useState<CommonStatus[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<CommonStatus | undefined>();
  const [statusTypeFilter, setStatusTypeFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>("displayOrder");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const scopeTenantId = platformMode ? 0 : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);

  const canEdit = can(roleDef, "commonStatus", "edit");
  const canCreate = can(roleDef, "commonStatus", "create");
  const canDelete = can(roleDef, "commonStatus", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  const selectedStatusType = statusTypes.find((t) => t.commonStatusTypeId === statusTypeFilter);

  async function loadStatusTypes() {
    if (scopeTenantId <= 0) {
      setStatusTypes([]);
      setLoadingTypes(false);
      setLoadError(platformMode ? "Select a tenant workspace to manage statuses." : "Missing tenant scope.");
      return;
    }
    setLoadingTypes(true);
    setLoadError(null);
    try {
      const [typeRows, allStatuses] = await Promise.all([
        listCommonStatusTypes({ tenantId: scopeTenantId, activeOnly: true }),
        listCommonStatuses({ tenantId: scopeTenantId }),
      ]);
      setStatusTypes(typeRows);
      const counts = new Map<number, number>();
      for (const s of allStatuses) {
        counts.set(s.commonStatusTypeId, (counts.get(s.commonStatusTypeId) ?? 0) + 1);
      }
      setTypeCounts(counts);
      setStatusTypeFilter((current) => {
        if (current && typeRows.some((t) => t.commonStatusTypeId === current)) return current;
        const withData = typeRows.find((t) => (counts.get(t.commonStatusTypeId) ?? 0) > 0);
        return withData?.commonStatusTypeId ?? typeRows[0]?.commonStatusTypeId ?? null;
      });
    } catch (error) {
      setLoadError(error instanceof CommonStatusTypesApiError ? error.message : "Failed to load status types");
      setStatusTypes([]);
    } finally {
      setLoadingTypes(false);
    }
  }

  useEffect(() => {
    void loadStatusTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeTenantId]);

  async function refreshRows() {
    if (!statusTypeFilter || scopeTenantId <= 0) {
      setRows([]);
      return;
    }
    setLoadingRows(true);
    try {
      const rowsResult = await listCommonStatuses({ tenantId: scopeTenantId, commonStatusTypeId: statusTypeFilter });
      setRows(rowsResult);
      setTypeCounts((prev) => {
        const next = new Map(prev);
        next.set(statusTypeFilter, rowsResult.length);
        return next;
      });
    } catch (error) {
      toast.error(error instanceof CommonStatusesApiError ? error.message : "Failed to load statuses");
      setRows([]);
    } finally {
      setLoadingRows(false);
    }
  }

  useEffect(() => {
    void refreshRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusTypeFilter, scopeTenantId]);

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
      result = result.filter((r) => r.statusName.toLowerCase().includes(term) || r.statusCode.toLowerCase().includes(term));
    }
    if (statusFilter === "active") result = result.filter((r) => r.isActive);
    if (statusFilter === "inactive") result = result.filter((r) => !r.isActive);
    if (sortKey) {
      result = [...result].sort((a, b) => {
        if (sortKey === "displayOrder") {
          return sortDirection === "asc" ? a.displayOrder - b.displayOrder : b.displayOrder - a.displayOrder;
        }
        const cmp = String(a[sortKey]).localeCompare(String(b[sortKey]));
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [rows, search, statusFilter, sortKey, sortDirection]);

  async function toggleActive(row: CommonStatus) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setCommonStatusActive(row.commonStatusId, !row.isActive, userKey);
      await refreshRows();
      toast.success(row.isActive ? "Status deactivated" : "Status activated");
    } catch (error) {
      toast.error(error instanceof CommonStatusesApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: CommonStatus) {
    try {
      await deleteCommonStatus(row.commonStatusId);
      await refreshRows();
      toast.success("Status deleted");
    } catch (error) {
      toast.error(error instanceof CommonStatusesApiError ? error.message : "Could not delete status");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Common Status"
        description="Status values within a status-type lifecycle — e.g. Service Product: Draft → Under Review → Published."
        actions={
          canCreate && panelMode === "closed" && selectedStatusType ? (
            <Button
              onClick={() => {
                setTarget(undefined);
                setPanelMode("create");
              }}
            >
              <Plus className="h-4 w-4" />
              Add status
            </Button>
          ) : undefined
        }
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loadingTypes && <p className="text-sm text-muted-foreground">Loading status types…</p>}
      {!loadingTypes && scopeTenantId > 0 && statusTypes.length === 0 && (
        <EmptyState
          icon={Workflow}
          tone="muted"
          heading="No status types yet"
          description="Create a status type first under Admin → Configuration → Common Status Type."
          size="compact"
        />
      )}

      {!loadingTypes && statusTypes.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select
            value={statusTypeFilter ? String(statusTypeFilter) : ""}
            onValueChange={(v) => setStatusTypeFilter(v ? Number(v) : null)}
          >
            <SelectTrigger className="w-64">
              <SelectValue>
                {(value: string | null) => {
                  if (!value) return "Select status type";
                  return statusTypes.find((t) => String(t.commonStatusTypeId) === value)?.statusTypeName ?? value;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {statusTypes.map((t) => (
                <SelectItem key={t.commonStatusTypeId} value={String(t.commonStatusTypeId)}>
                  {t.statusTypeName} ({typeCounts.get(t.commonStatusTypeId) ?? 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {panelMode !== "closed" && selectedStatusType && (
        <StatusPanel
          mode={panelMode}
          row={target}
          rows={rows}
          statusType={selectedStatusType}
          userKey={userKey}
          tenantId={scopeTenantId}
          companyId={target?.companyId ?? selectedStatusType.companyId ?? 0}
          onSaved={refreshRows}
          onClose={() => {
            setPanelMode("closed");
            setTarget(undefined);
          }}
        />
      )}

      {selectedStatusType && rows.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search code or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
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

      {selectedStatusType && (
        <Card>
          {loadingRows ? (
            <p className="p-6 text-sm text-muted-foreground">Loading statuses…</p>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={ListOrdered}
              tone="primary"
              heading="No statuses yet"
              description={`Add your first status under ${selectedStatusType.statusTypeName}.`}
              size="compact"
            />
          ) : visible.length === 0 ? (
            <EmptyState icon={Search} tone="muted" heading="No matching statuses" description="Try a different search or status filter." size="compact" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead sortKey="statusCode" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                    Code
                  </SortableTableHead>
                  <SortableTableHead sortKey="statusName" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                    Name
                  </SortableTableHead>
                  <SortableTableHead sortKey="displayOrder" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                    Order
                  </SortableTableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => (
                  <TableRow key={row.commonStatusId}>
                    <TableCell className="font-mono text-xs font-medium">{row.statusCode}</TableCell>
                    <TableCell className="font-medium">{row.statusName}</TableCell>
                    <TableCell className="text-muted-foreground">{row.displayOrder}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {row.isInitial && (
                          <Badge variant="outline" className="gap-1">
                            <Flag className="h-3 w-3" /> Initial
                          </Badge>
                        )}
                        {row.isFinal && (
                          <Badge variant="outline" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Final
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "active" : "inactive"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setTarget(row);
                              setPanelMode("view");
                            }}
                          >
                            View
                          </DropdownMenuItem>
                          {canEdit && (
                            <>
                              <DropdownMenuItem
                                onClick={() => {
                                  setTarget(row);
                                  setPanelMode("edit");
                                }}
                              >
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => void toggleActive(row)}>
                                {row.isActive ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                            </>
                          )}
                          {canDelete && <DropdownMenuItem onClick={() => void removeRow(row)}>Delete</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
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

export default function CommonStatusMasterPage() {
  return <AccessGate module="commonStatus">{(roleDef) => <StatusList roleDef={roleDef} />}</AccessGate>;
}
