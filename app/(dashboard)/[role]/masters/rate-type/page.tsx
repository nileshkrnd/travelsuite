"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Tags, MoreHorizontal, X, Search, Loader2 } from "lucide-react";
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
import { listCompanies } from "@/lib/services/db-companies.service";
import { listRateTypeGroups, RateTypeGroupsApiError } from "@/lib/services/rate-type-groups.service";
import {
  listRateTypes,
  createRateType,
  updateRateType,
  setRateTypeActive,
  deleteRateType,
  RateTypesApiError,
} from "@/lib/services/rate-types.service";
import { can } from "@/config/permissions";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import type { Company, RateType, RateTypeGroup, RoleDef } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type SortKey = "rateTypeName" | "rateTypeCode" | "displayOrder";
type StatusFilter = "all" | "active" | "inactive";

const ALL_COMPANIES = "all";
const ALL_GROUPS = "all";
const NO_GROUP = "none";

function useRateTypeSchema(rows: RateType[], currentId?: number) {
  return z.object({
    companyId: z.number().int().positive("Company is required"),
    rateTypeCode: z.string().trim().min(1, "Code is required").max(50, "Must be 50 characters or fewer"),
    rateTypeName: z.string().trim().min(1, "Name is required").max(100, "Must be 100 characters or fewer"),
    description: z.string().trim().max(500).optional().or(z.literal("")),
    rateTypeGroupId: z.number().int().positive().nullable(),
    isPaxType: z.boolean(),
    isQuantityType: z.boolean(),
    displayOrder: z.preprocess((v) => (v === "" || v == null ? 0 : Number(v)), z.number().int().min(0)),
  }).superRefine((values, ctx) => {
    const duplicate = rows.some(
      (r) =>
        r.rateTypeId !== currentId &&
        r.companyId === values.companyId &&
        r.rateTypeCode.toLowerCase() === values.rateTypeCode.trim().toLowerCase()
    );
    if (duplicate) {
      ctx.addIssue({ code: "custom", path: ["rateTypeCode"], message: "This code already exists for the selected company" });
    }
  });
}

type FormValues = z.infer<ReturnType<typeof useRateTypeSchema>>;

function RateTypePanel({
  mode,
  row,
  rows,
  companies,
  groups,
  userKey,
  tenantId,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: RateType;
  rows: RateType[];
  companies: Company[];
  groups: RateTypeGroup[];
  userKey: number;
  tenantId: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const schema = useRateTypeSchema(rows, row?.rateTypeId);
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
      companyId: row?.companyId ?? companies[0]?.companyKey ?? 0,
      rateTypeCode: row?.rateTypeCode ?? "",
      rateTypeName: row?.rateTypeName ?? "",
      description: row?.description ?? "",
      rateTypeGroupId: row?.rateTypeGroupId ?? null,
      isPaxType: row?.isPaxType ?? false,
      isQuantityType: row?.isQuantityType ?? false,
      displayOrder: row?.displayOrder ?? 0,
    },
  });

  async function onSubmit(values: FormValues) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    const payload = {
      rateTypeCode: values.rateTypeCode.trim(),
      rateTypeName: values.rateTypeName.trim(),
      description: values.description || undefined,
      rateTypeGroupId: values.rateTypeGroupId,
      isPaxType: values.isPaxType,
      isQuantityType: values.isQuantityType,
      displayOrder: values.displayOrder,
      tenantId,
      companyId: values.companyId,
    };
    try {
      if (mode === "edit" && row) {
        await updateRateType(row.rateTypeId, { ...payload, isActive: row.isActive, modifiedBy: userKey });
        toast.success("Rate type updated");
      } else if (mode === "create") {
        await createRateType({ ...payload, createdBy: userKey });
        toast.success("Rate type created");
      }
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof RateTypesApiError ? error.message : "Could not save rate type");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold">
          {mode === "create" ? "Add rate type" : mode === "edit" ? "Edit rate type" : "Rate type details"}
        </h2>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <div className="space-y-2 sm:col-span-2">
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

        <div className="space-y-2">
          <Label htmlFor="rateTypeCode" required>
            Code
          </Label>
          <Input
            id="rateTypeCode"
            autoFocus={!isReadOnly}
            disabled={isReadOnly}
            placeholder="e.g. ADULT"
            aria-invalid={!!errors.rateTypeCode}
            {...register("rateTypeCode")}
          />
          {errors.rateTypeCode && <p className="text-sm text-destructive">{errors.rateTypeCode.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="rateTypeName" required>
            Name
          </Label>
          <Input
            id="rateTypeName"
            disabled={isReadOnly}
            placeholder="e.g. Adult"
            aria-invalid={!!errors.rateTypeName}
            {...register("rateTypeName")}
          />
          {errors.rateTypeName && <p className="text-sm text-destructive">{errors.rateTypeName.message}</p>}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" rows={2} disabled={isReadOnly} {...register("description")} />
        </div>

        <div className="space-y-2">
          <Label>Rate type group</Label>
          <Controller
            control={control}
            name="rateTypeGroupId"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : NO_GROUP}
                onValueChange={(v) => field.onChange(!v || v === NO_GROUP ? null : Number(v))}
                disabled={isReadOnly}
              >
                <SelectTrigger className="h-10 w-full max-w-full min-w-0">
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value || value === NO_GROUP) return "None";
                      return groups.find((g) => String(g.rateTypeGroupId) === value)?.rateTypeGroupName ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_GROUP}>None</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.rateTypeGroupId} value={String(g.rateTypeGroupId)}>
                      {g.rateTypeGroupName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayOrder">Display order</Label>
          <Input id="displayOrder" type="number" min={0} disabled={isReadOnly} {...register("displayOrder")} />
        </div>

        <div className="flex items-end gap-4 pb-2 sm:col-span-2">
          <Controller
            control={control}
            name="isPaxType"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={isReadOnly} />
                Passenger / age type
              </label>
            )}
          />
          <Controller
            control={control}
            name="isQuantityType"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={isReadOnly} />
                Unit / quantity type
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
            <Button type="submit" disabled={isSubmitting || companies.length === 0}>
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

function RateTypeList({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const activeTenant = useTenantStore((s) => s.tenant);
  const [rows, setRows] = useState<RateType[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [groups, setGroups] = useState<RateTypeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<RateType | undefined>();
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string>(ALL_COMPANIES);
  const [groupFilter, setGroupFilter] = useState<string>(ALL_GROUPS);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>("displayOrder");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const scopeTenantId = platformMode ? 0 : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);

  const canEdit = can(roleDef, "rateType", "edit");
  const canCreate = can(roleDef, "rateType", "create");
  const canDelete = can(roleDef, "rateType", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  async function refresh() {
    if (scopeTenantId <= 0) {
      setRows([]);
      setCompanies([]);
      setGroups([]);
      setLoading(false);
      setLoadError(platformMode ? "Select a tenant workspace to manage rate types." : "Missing tenant scope.");
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [rowsResult, companyRows, groupRows] = await Promise.all([
        listRateTypes({ tenantId: scopeTenantId }),
        listCompanies({ tenantId: scopeTenantId, activeOnly: true }),
        listRateTypeGroups({ tenantId: scopeTenantId, activeOnly: true }),
      ]);
      setRows(rowsResult);
      setCompanies(companyRows.filter((c) => c.companyKey > 0));
      setGroups(groupRows);
    } catch (error) {
      setLoadError(
        error instanceof RateTypesApiError || error instanceof RateTypeGroupsApiError ? error.message : "Failed to load rate types"
      );
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
    if (groupFilter === NO_GROUP) {
      result = result.filter((r) => r.rateTypeGroupId == null);
    } else if (groupFilter !== ALL_GROUPS) {
      const groupId = Number(groupFilter);
      result = result.filter((r) => r.rateTypeGroupId === groupId);
    }
    if (term) {
      result = result.filter((r) => r.rateTypeName.toLowerCase().includes(term) || r.rateTypeCode.toLowerCase().includes(term));
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
  }, [rows, search, companyFilter, groupFilter, statusFilter, sortKey, sortDirection]);

  async function toggleActive(row: RateType) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setRateTypeActive(row.rateTypeId, !row.isActive, userKey);
      await refresh();
      toast.success(row.isActive ? "Rate type deactivated" : "Rate type activated");
    } catch (error) {
      toast.error(error instanceof RateTypesApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: RateType) {
    try {
      await deleteRateType(row.rateTypeId);
      await refresh();
      toast.success("Rate type deleted");
    } catch (error) {
      toast.error(error instanceof RateTypesApiError ? error.message : "Could not delete rate type");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Rate Type"
        description="Passenger, unit, vehicle, and other rate types used to price service products — Adult, Child, Vehicle, Room, …"
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
              Add rate type
            </Button>
          ) : undefined
        }
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading rate types…</p>}
      {!loading && scopeTenantId > 0 && companies.length === 0 && (
        <p className="text-sm text-muted-foreground">Create a company first before adding rate types.</p>
      )}

      {panelMode !== "closed" && scopeTenantId > 0 && (
        <RateTypePanel
          mode={panelMode}
          row={target}
          rows={rows}
          companies={companies}
          groups={groups}
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
          <Select value={groupFilter} onValueChange={(v) => setGroupFilter(v ?? ALL_GROUPS)}>
            <SelectTrigger className="w-52">
              <SelectValue>
                {(value: string | null) => {
                  if (!value || value === ALL_GROUPS) return "All groups";
                  if (value === NO_GROUP) return "Ungrouped";
                  return groups.find((g) => String(g.rateTypeGroupId) === value)?.rateTypeGroupName ?? value;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_GROUPS}>All groups</SelectItem>
              <SelectItem value={NO_GROUP}>Ungrouped</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.rateTypeGroupId} value={String(g.rateTypeGroupId)}>
                  {g.rateTypeGroupName}
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
          <EmptyState icon={Tags} tone="primary" heading="No rate types yet" description="Add your first rate type." size="compact" />
        ) : visible.length === 0 && !loading && scopeTenantId > 0 ? (
          <EmptyState icon={Search} tone="muted" heading="No matching rate types" description="Try a different search, company, group, or status filter." size="compact" />
        ) : scopeTenantId > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead sortKey="rateTypeCode" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Code
                </SortableTableHead>
                <SortableTableHead sortKey="rateTypeName" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Name
                </SortableTableHead>
                <TableHead>Group</TableHead>
                <TableHead>Flags</TableHead>
                <SortableTableHead sortKey="displayOrder" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Order
                </SortableTableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => (
                <TableRow key={row.rateTypeId}>
                  <TableCell className="font-mono text-xs font-medium">{row.rateTypeCode}</TableCell>
                  <TableCell className="font-medium">{row.rateTypeName}</TableCell>
                  <TableCell className="text-muted-foreground">{row.rateTypeGroupName ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {row.isPaxType && <Badge variant="outline">Pax</Badge>}
                      {row.isQuantityType && <Badge variant="outline">Qty</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.displayOrder}</TableCell>
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
        ) : null}
      </Card>
    </div>
  );
}

export default function RateTypeMasterPage() {
  return <AccessGate module="rateType">{(roleDef) => <RateTypeList roleDef={roleDef} />}</AccessGate>;
}
