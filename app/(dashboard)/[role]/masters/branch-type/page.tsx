"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, ListTree, MoreHorizontal, X, Search, Loader2 } from "lucide-react";
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
import {
  listBranchTypes,
  createBranchType,
  updateBranchType,
  setBranchTypeActive,
  deleteBranchType,
  BranchTypesApiError,
} from "@/lib/services/branch-types.service";
import { can } from "@/config/permissions";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import type { BranchType, Company, RoleDef } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type SortKey = "branchTypeName" | "createdDtTm";
type StatusFilter = "all" | "active" | "inactive";

const ALL_COMPANIES = "all";

function useBranchTypeSchema(branchTypes: BranchType[], currentId?: number) {
  return z.object({
    companyId: z.number().int().positive("Company is required"),
    branchTypeName: z.string().trim().min(1, "Branch type name is required").max(100),
  }).superRefine((values, ctx) => {
    const duplicate = branchTypes.some(
      (t) =>
        t.branchTypeId !== currentId &&
        t.companyId === values.companyId &&
        t.branchTypeName.toLowerCase() === values.branchTypeName.trim().toLowerCase()
    );
    if (duplicate) {
      ctx.addIssue({
        code: "custom",
        path: ["branchTypeName"],
        message: "This branch type already exists for the selected company",
      });
    }
  });
}

type FormValues = z.infer<ReturnType<typeof useBranchTypeSchema>>;

function BranchTypePanel({
  mode,
  branchType,
  branchTypes,
  companies,
  userKey,
  tenantId,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  branchType?: BranchType;
  branchTypes: BranchType[];
  companies: Company[];
  userKey: number;
  tenantId: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const schema = useBranchTypeSchema(branchTypes, branchType?.branchTypeId);
  const isReadOnly = mode === "view";

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      companyId: branchType?.companyId ?? companies[0]?.companyKey ?? 0,
      branchTypeName: branchType?.branchTypeName ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      if (mode === "edit" && branchType) {
        await updateBranchType(branchType.branchTypeId, {
          branchTypeName: values.branchTypeName.trim(),
          tenantId,
          companyId: values.companyId,
          isActive: branchType.isActive,
          modifiedBy: userKey,
        });
        toast.success("Branch type updated");
      } else if (mode === "create") {
        await createBranchType({
          branchTypeName: values.branchTypeName.trim(),
          tenantId,
          companyId: values.companyId,
          createdBy: userKey,
        });
        toast.success("Branch type created");
      }
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof BranchTypesApiError ? error.message : "Could not save branch type");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">
            {mode === "create" ? "Add branch type" : mode === "edit" ? "Edit branch type" : "Branch type details"}
          </h2>
        </div>
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

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="branchTypeName" required>
            Branch type name
          </Label>
          <Input
            id="branchTypeName"
            autoFocus={!isReadOnly}
            disabled={isReadOnly}
            aria-invalid={!!errors.branchTypeName}
            {...register("branchTypeName")}
          />
          {errors.branchTypeName && (
            <p className="text-sm text-destructive">{errors.branchTypeName.message}</p>
          )}
        </div>

        {mode === "view" && branchType && (
          <div className="space-y-2 sm:col-span-2">
            <Label>Status</Label>
            <div>
              <Badge variant={branchType.isActive ? "default" : "secondary"}>
                {branchType.isActive ? "active" : "inactive"}
              </Badge>
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

function BranchTypeList({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const activeTenant = useTenantStore((s) => s.tenant);
  const [branchTypes, setBranchTypes] = useState<BranchType[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<BranchType | undefined>();
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string>(ALL_COMPANIES);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const scopeTenantId = platformMode ? 0 : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);

  const canEdit = can(roleDef, "branchType", "edit");
  const canCreate = can(roleDef, "branchType", "create");
  const canDelete = can(roleDef, "branchType", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  async function refresh() {
    if (scopeTenantId <= 0) {
      setBranchTypes([]);
      setCompanies([]);
      setLoading(false);
      setLoadError(platformMode ? "Select a tenant workspace to manage branch types." : "Missing tenant scope.");
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [typeRows, companyRows] = await Promise.all([
        listBranchTypes({ tenantId: scopeTenantId }),
        listCompanies({ tenantId: scopeTenantId, activeOnly: true }),
      ]);
      setBranchTypes(typeRows);
      setCompanies(companyRows.filter((c) => c.companyKey > 0));
    } catch (error) {
      setLoadError(error instanceof BranchTypesApiError ? error.message : "Failed to load branch types");
      setBranchTypes([]);
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
    let result = branchTypes;
    if (companyFilter !== ALL_COMPANIES) {
      const companyKey = Number(companyFilter);
      result = result.filter((t) => t.companyId === companyKey);
    }
    if (term) {
      result = result.filter(
        (t) =>
          t.branchTypeName.toLowerCase().includes(term) || (t.companyName ?? "").toLowerCase().includes(term)
      );
    }
    if (statusFilter === "active") result = result.filter((t) => t.isActive);
    if (statusFilter === "inactive") result = result.filter((t) => !t.isActive);
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const cmp = String(a[sortKey]).localeCompare(String(b[sortKey]));
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [branchTypes, search, companyFilter, statusFilter, sortKey, sortDirection]);

  async function toggleActive(row: BranchType) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setBranchTypeActive(row.branchTypeId, !row.isActive, userKey);
      await refresh();
      toast.success(row.isActive ? "Branch type deactivated" : "Branch type activated");
    } catch (error) {
      toast.error(error instanceof BranchTypesApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: BranchType) {
    try {
      await deleteBranchType(row.branchTypeId);
      await refresh();
      toast.success("Branch type deleted");
    } catch (error) {
      toast.error(error instanceof BranchTypesApiError ? error.message : "Could not delete branch type");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Branch Type"
        description="Branch types are scoped to a company within the current tenant."
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
              Add branch type
            </Button>
          ) : undefined
        }
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading branch types…</p>}
      {!loading && scopeTenantId > 0 && companies.length === 0 && (
        <p className="text-sm text-muted-foreground">Create a company first before adding branch types.</p>
      )}

      {panelMode !== "closed" && scopeTenantId > 0 && (
        <BranchTypePanel
          mode={panelMode}
          branchType={target}
          branchTypes={branchTypes}
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

      {branchTypes.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name…"
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
        {!loading && branchTypes.length === 0 && scopeTenantId > 0 ? (
          <EmptyState
            icon={ListTree}
            tone="primary"
            heading="No branch types yet"
            description="Add your first branch type under a company."
            size="compact"
          />
        ) : visible.length === 0 && !loading && scopeTenantId > 0 ? (
          <EmptyState
            icon={Search}
            tone="muted"
            heading="No matching branch types"
            description="Try a different search, company, or status filter."
            size="compact"
          />
        ) : scopeTenantId > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Sr.</TableHead>
                <SortableTableHead
                  sortKey="branchTypeName"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Name
                </SortableTableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row, index) => (
                <TableRow key={row.branchTypeId}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{row.branchTypeName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.companyName ??
                      companies.find((c) => c.companyKey === row.companyId)?.name ??
                      `C${row.companyId}`}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.isActive ? "default" : "secondary"}>
                      {row.isActive ? "active" : "inactive"}
                    </Badge>
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
                        {canDelete && (
                          <DropdownMenuItem onClick={() => void removeRow(row)}>Delete</DropdownMenuItem>
                        )}
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

export default function BranchTypeMasterPage() {
  return <AccessGate module="branchType">{(roleDef) => <BranchTypeList roleDef={roleDef} />}</AccessGate>;
}
