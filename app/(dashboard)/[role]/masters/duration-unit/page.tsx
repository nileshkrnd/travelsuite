"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Clock, Eye, Pencil, Power, PowerOff, Trash2, X, Search, Loader2 } from "lucide-react";
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
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore, isPlatformMode } from "@/lib/store/tenant.store";
import { useUsersStore } from "@/lib/store/users.store";
import { listCompanies } from "@/lib/services/db-companies.service";
import {
  listDurationUnits,
  createDurationUnit,
  updateDurationUnit,
  setDurationUnitActive,
  deleteDurationUnit,
  DurationUnitsApiError,
} from "@/lib/services/duration-units.service";
import { can } from "@/config/permissions";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import type { Company, DurationUnit, RoleDef } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type SortKey = "durationUnitName" | "durationUnitCode" | "displayOrder";
type StatusFilter = "all" | "active" | "inactive";

const ALL_COMPANIES = "all";

function useDurationUnitSchema(rows: DurationUnit[], currentId?: number) {
  return z.object({
    companyId: z.number().int().positive("Company is required"),
    durationUnitCode: z.string().trim().min(1, "Code is required").max(50, "Must be 50 characters or fewer"),
    durationUnitName: z.string().trim().min(1, "Name is required").max(100, "Must be 100 characters or fewer"),
    displayOrder: z.preprocess((v) => (v === "" || v == null ? 0 : Number(v)), z.number().int().min(0)),
  }).superRefine((values, ctx) => {
    const duplicateCode = rows.some(
      (r) =>
        r.durationUnitId !== currentId &&
        r.companyId === values.companyId &&
        r.durationUnitCode.toLowerCase() === values.durationUnitCode.trim().toLowerCase()
    );
    if (duplicateCode) {
      ctx.addIssue({ code: "custom", path: ["durationUnitCode"], message: "This code already exists for the selected company" });
    }
    const duplicateName = rows.some(
      (r) =>
        r.durationUnitId !== currentId &&
        r.companyId === values.companyId &&
        r.durationUnitName.trim().toLowerCase() === values.durationUnitName.trim().toLowerCase()
    );
    if (duplicateName) {
      ctx.addIssue({ code: "custom", path: ["durationUnitName"], message: "This name already exists for the selected company" });
    }
  });
}

type FormValues = z.infer<ReturnType<typeof useDurationUnitSchema>>;

function DurationUnitPanel({
  mode,
  row,
  rows,
  companies,
  userKey,
  tenantId,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: DurationUnit;
  rows: DurationUnit[];
  companies: Company[];
  userKey: number;
  tenantId: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const schema = useDurationUnitSchema(rows, row?.durationUnitId);
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
      companyId: row?.companyId ?? companies[0]?.companyKey ?? 0,
      durationUnitCode: row?.durationUnitCode ?? "",
      durationUnitName: row?.durationUnitName ?? "",
      displayOrder: row?.displayOrder ?? 0,
    },
  });

  function blankValues(): FormValues {
    return { companyId: companies[0]?.companyKey ?? 0, durationUnitCode: "", durationUnitName: "", displayOrder: 0 };
  }

  async function submit(values: FormValues, keepOpenForMore: boolean) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      if (mode === "edit" && row) {
        await updateDurationUnit(row.durationUnitId, {
          durationUnitCode: values.durationUnitCode.trim(),
          durationUnitName: values.durationUnitName.trim(),
          displayOrder: values.displayOrder,
          tenantId,
          companyId: values.companyId,
          isActive: row.isActive,
          modifiedBy: userKey,
        });
        toast.success("Duration unit updated");
        await onSaved();
        onClose();
      } else if (mode === "create") {
        await createDurationUnit({
          durationUnitCode: values.durationUnitCode.trim(),
          durationUnitName: values.durationUnitName.trim(),
          displayOrder: values.displayOrder,
          tenantId,
          companyId: values.companyId,
          createdBy: userKey,
        });
        toast.success("Duration unit created");
        await onSaved();
        if (keepOpenForMore) {
          reset(blankValues());
        } else {
          onClose();
        }
      }
    } catch (error) {
      toast.error(error instanceof DurationUnitsApiError ? error.message : "Could not save duration unit");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold">
          {mode === "create" ? "Add duration unit" : mode === "edit" ? "Edit duration unit" : "Duration unit details"}
        </h2>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit((values) => submit(values, false))} className="grid grid-cols-2 gap-3 sm:grid-cols-4" noValidate>
        <div className="space-y-1 col-span-2">
          <Label required>Company</Label>
          <Controller
            control={control}
            name="companyId"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => field.onChange(Number(v))}
                disabled={isReadOnly || mode === "edit"}
              >
                <SelectTrigger className="h-10 w-full max-w-full min-w-0" aria-invalid={!!errors.companyId}>
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return "Select company";
                      return companies.find((c) => String(c.companyKey) === value)?.name ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={String(c.companyKey)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.companyId && <p className="text-sm text-destructive">{errors.companyId.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="durationUnitCode" required>
            Code
          </Label>
          <Input
            id="durationUnitCode"
            autoFocus={!isReadOnly}
            disabled={isReadOnly}
            placeholder="e.g. HOUR"
            aria-invalid={!!errors.durationUnitCode}
            {...register("durationUnitCode")}
          />
          {errors.durationUnitCode && <p className="text-sm text-destructive">{errors.durationUnitCode.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="durationUnitName" required>
            Name
          </Label>
          <Input
            id="durationUnitName"
            disabled={isReadOnly}
            placeholder="e.g. Hour"
            aria-invalid={!!errors.durationUnitName}
            {...register("durationUnitName")}
          />
          {errors.durationUnitName && <p className="text-sm text-destructive">{errors.durationUnitName.message}</p>}
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
          <div className="col-span-2 flex items-center gap-2 sm:col-span-4">
            <Button type="submit" disabled={isSubmitting || companies.length === 0}>
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

function DurationUnitList({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const activeTenant = useTenantStore((s) => s.tenant);
  const [rows, setRows] = useState<DurationUnit[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<DurationUnit | undefined>();
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string>(ALL_COMPANIES);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>("displayOrder");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const scopeTenantId = platformMode ? 0 : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);

  const canEdit = can(roleDef, "durationUnit", "edit");
  const canCreate = can(roleDef, "durationUnit", "create");
  const canDelete = can(roleDef, "durationUnit", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  async function refresh() {
    if (scopeTenantId <= 0) {
      setRows([]);
      setCompanies([]);
      setLoading(false);
      setLoadError(platformMode ? "Select a tenant workspace to manage duration units." : "Missing tenant scope.");
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [rowsResult, companyRows] = await Promise.all([
        listDurationUnits({ tenantId: scopeTenantId }),
        listCompanies({ tenantId: scopeTenantId, activeOnly: true }),
      ]);
      setRows(rowsResult);
      setCompanies(companyRows.filter((c) => c.companyKey > 0));
    } catch (error) {
      setLoadError(error instanceof DurationUnitsApiError ? error.message : "Failed to load duration units");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeTenantId]);

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
    if (companyFilter !== ALL_COMPANIES) {
      const companyKey = Number(companyFilter);
      result = result.filter((r) => r.companyId === companyKey);
    }
    if (term) {
      result = result.filter(
        (r) => r.durationUnitName.toLowerCase().includes(term) || r.durationUnitCode.toLowerCase().includes(term)
      );
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
  }, [rows, search, companyFilter, statusFilter, sortKey, sortDirection]);

  async function toggleActive(row: DurationUnit) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setDurationUnitActive(row.durationUnitId, !row.isActive, userKey);
      await refresh();
      toast.success(row.isActive ? "Duration unit deactivated" : "Duration unit activated");
    } catch (error) {
      toast.error(error instanceof DurationUnitsApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: DurationUnit) {
    try {
      await deleteDurationUnit(row.durationUnitId);
      await refresh();
      toast.success("Duration unit deleted");
    } catch (error) {
      toast.error(error instanceof DurationUnitsApiError ? error.message : "Could not delete duration unit");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Duration Unit"
        description="Duration units (Minute, Hour, Day, Night, Week, Month) are scoped to a company within the current tenant."
        actions={
          canCreate && panelMode === "closed" && scopeTenantId > 0 ? (
            <Button
              onClick={() => {
                setTarget(undefined);
                setPanelMode("create");
              }}
              disabled={companies.length === 0}
            >
              <Plus className="h-4 w-4" />
              Add duration unit
            </Button>
          ) : undefined
        }
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading duration units…</p>}
      {!loading && scopeTenantId > 0 && companies.length === 0 && (
        <p className="text-sm text-muted-foreground">Create a company first before adding duration units.</p>
      )}

      {panelMode !== "closed" && scopeTenantId > 0 && (
        <DurationUnitPanel
          mode={panelMode}
          row={target}
          rows={rows}
          companies={companies}
          userKey={userKey}
          tenantId={scopeTenantId}
          onSaved={refresh}
          onClose={() => {
            setPanelMode("closed");
            setTarget(undefined);
          }}
        />
      )}

      {rows.length > 0 && (
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
          <Select value={companyFilter} onValueChange={(v) => setCompanyFilter(v ?? ALL_COMPANIES)}>
            <SelectTrigger className="w-52">
              <SelectValue>
                {(value: string | null) => {
                  if (!value || value === ALL_COMPANIES) return "All companies";
                  return companies.find((c) => String(c.companyKey) === value)?.name ?? value;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_COMPANIES}>All companies</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={String(c.companyKey)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        {!loading && rows.length === 0 && scopeTenantId > 0 ? (
          <EmptyState icon={Clock} tone="primary" heading="No duration units yet" description="Add your first duration unit." size="compact" />
        ) : visible.length === 0 && !loading && scopeTenantId > 0 ? (
          <EmptyState icon={Search} tone="muted" heading="No matching duration units" description="Try a different search, company, or status filter." size="compact" />
        ) : scopeTenantId > 0 ? (
          <Table className="table-fixed border-collapse text-xs [&_th]:h-auto [&_th]:whitespace-normal [&_td]:whitespace-normal">
            <TableHeader>
              <TableRow>
                <SortableTableHead sortKey="durationUnitCode" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} className="w-[16%] px-2 py-1.5">
                  Code
                </SortableTableHead>
                <SortableTableHead sortKey="durationUnitName" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} className="w-[24%] px-2 py-1.5">
                  Name
                </SortableTableHead>
                <TableHead className="w-[24%] px-2 py-1.5">Company</TableHead>
                <SortableTableHead sortKey="displayOrder" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} className="w-[10%] px-2 py-1.5">
                  Order
                </SortableTableHead>
                <TableHead className="w-[12%] px-2 py-1.5">Status</TableHead>
                <TableHead className="w-[14%] px-2 py-1.5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => (
                <TableRow key={row.durationUnitId}>
                  <TableCell className="px-2 py-1.5 font-mono font-medium leading-tight">{row.durationUnitCode}</TableCell>
                  <TableCell className="px-2 py-1.5 font-medium leading-tight">{row.durationUnitName}</TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">
                    {row.companyName ?? companies.find((c) => c.companyKey === row.companyId)?.name ?? `C${row.companyId}`}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.displayOrder}</TableCell>
                  <TableCell className="px-2 py-1.5">
                    <Badge variant={row.isActive ? "default" : "secondary"} className="px-1.5 py-0 text-[11px]">
                      {row.isActive ? "active" : "inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="View"
                              onClick={() => {
                                setTarget(row);
                                setPanelMode("view");
                              }}
                            />
                          }
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </TooltipTrigger>
                        <TooltipContent>View</TooltipContent>
                      </Tooltip>
                      {canEdit && (
                        <>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label="Edit"
                                  onClick={() => {
                                    setTarget(row);
                                    setPanelMode("edit");
                                  }}
                                />
                              }
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={row.isActive ? "Deactivate" : "Activate"}
                                  onClick={() => void toggleActive(row)}
                                />
                              }
                            >
                              {row.isActive ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                            </TooltipTrigger>
                            <TooltipContent>{row.isActive ? "Deactivate" : "Activate"}</TooltipContent>
                          </Tooltip>
                        </>
                      )}
                      {canDelete && (
                        <Tooltip>
                          <TooltipTrigger
                            render={<Button variant="ghost" size="icon-sm" aria-label="Delete" onClick={() => void removeRow(row)} />}
                          >
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
        ) : null}
      </Card>
    </div>
  );
}

export default function DurationUnitMasterPage() {
  return <AccessGate module="durationUnit">{(roleDef) => <DurationUnitList roleDef={roleDef} />}</AccessGate>;
}
