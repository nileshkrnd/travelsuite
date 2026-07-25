"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Briefcase, MoreHorizontal, X, Search, Loader2 } from "lucide-react";
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
  listDesignations,
  createDesignation,
  updateDesignation,
  setDesignationActive,
  deleteDesignation,
  DesignationsApiError,
} from "@/lib/services/designations.service";
import { can } from "@/config/permissions";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import type { Company, Designation, RoleDef } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type SortKey = "designationCode" | "designationName" | "createdDtTm";
type StatusFilter = "all" | "active" | "inactive";

const ALL_COMPANIES = "all";

function useDesignationSchema(designations: Designation[], currentId?: number) {
  return z.object({
    companyId: z.number().int().positive("Company is required"),
    designationCode: z
      .string()
      .trim()
      .min(1, "Designation code is required")
      .max(20, "Code must be 20 characters or fewer")
      .regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,19}$/, "Use letters, numbers, underscore or hyphen"),
    designationName: z.string().trim().min(1, "Designation name is required").max(100),
  }).superRefine((values, ctx) => {
    const duplicate = designations.some(
      (d) =>
        d.designationId !== currentId &&
        d.companyId === values.companyId &&
        d.designationCode.toLowerCase() === values.designationCode.trim().toLowerCase()
    );
    if (duplicate) {
      ctx.addIssue({
        code: "custom",
        path: ["designationCode"],
        message: "This designation code already exists for the selected company",
      });
    }
  });
}

type FormValues = z.infer<ReturnType<typeof useDesignationSchema>>;

function DesignationPanel({
  mode,
  designation,
  designations,
  companies,
  userKey,
  tenantId,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  designation?: Designation;
  designations: Designation[];
  companies: Company[];
  userKey: number;
  tenantId: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const schema = useDesignationSchema(designations, designation?.designationId);
  const isReadOnly = mode === "view";

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      companyId: designation?.companyId ?? companies[0]?.companyKey ?? 0,
      designationCode: designation?.designationCode ?? "",
      designationName: designation?.designationName ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      if (mode === "edit" && designation) {
        await updateDesignation(designation.designationId, {
          designationCode: values.designationCode.trim(),
          designationName: values.designationName.trim(),
          tenantId,
          companyId: values.companyId,
          isActive: designation.isActive,
          modifiedBy: userKey,
        });
        toast.success("Designation updated");
      } else if (mode === "create") {
        await createDesignation({
          designationCode: values.designationCode.trim(),
          designationName: values.designationName.trim(),
          tenantId,
          companyId: values.companyId,
          createdBy: userKey,
        });
        toast.success("Designation created");
      }
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof DesignationsApiError ? error.message : "Could not save designation");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">
            {mode === "create" ? "Add designation" : mode === "edit" ? "Edit designation" : "Designation details"}
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

        <div className="space-y-2">
          <Label htmlFor="designationCode" required>
            Designation code
          </Label>
          <Input
            id="designationCode"
            autoFocus={!isReadOnly}
            disabled={isReadOnly || mode === "edit"}
            aria-invalid={!!errors.designationCode}
            {...register("designationCode")}
          />
          {errors.designationCode && (
            <p className="text-sm text-destructive">{errors.designationCode.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="designationName" required>
            Designation name
          </Label>
          <Input
            id="designationName"
            disabled={isReadOnly}
            aria-invalid={!!errors.designationName}
            {...register("designationName")}
          />
          {errors.designationName && (
            <p className="text-sm text-destructive">{errors.designationName.message}</p>
          )}
        </div>

        {mode === "view" && designation && (
          <div className="space-y-2 sm:col-span-2">
            <Label>Status</Label>
            <div>
              <Badge variant={designation.isActive ? "default" : "secondary"}>
                {designation.isActive ? "active" : "inactive"}
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

function DesignationList({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const activeTenant = useTenantStore((s) => s.tenant);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<Designation | undefined>();
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string>(ALL_COMPANIES);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const scopeTenantId = platformMode ? 0 : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);

  const canEdit = can(roleDef, "designation", "edit");
  const canCreate = can(roleDef, "designation", "create");
  const canDelete = can(roleDef, "designation", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  async function refresh() {
    if (scopeTenantId <= 0) {
      setDesignations([]);
      setCompanies([]);
      setLoading(false);
      setLoadError(platformMode ? "Select a tenant workspace to manage designations." : "Missing tenant scope.");
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [desigRows, companyRows] = await Promise.all([
        listDesignations({ tenantId: scopeTenantId }),
        listCompanies({ tenantId: scopeTenantId, activeOnly: true }),
      ]);
      setDesignations(desigRows);
      setCompanies(companyRows.filter((c) => c.companyKey > 0));
    } catch (error) {
      setLoadError(error instanceof DesignationsApiError ? error.message : "Failed to load designations");
      setDesignations([]);
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
    let result = designations;
    if (companyFilter !== ALL_COMPANIES) {
      const companyKey = Number(companyFilter);
      result = result.filter((d) => d.companyId === companyKey);
    }
    if (term) {
      result = result.filter(
        (d) =>
          d.designationCode.toLowerCase().includes(term) ||
          d.designationName.toLowerCase().includes(term) ||
          (d.companyName ?? "").toLowerCase().includes(term)
      );
    }
    if (statusFilter === "active") result = result.filter((d) => d.isActive);
    if (statusFilter === "inactive") result = result.filter((d) => !d.isActive);
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const cmp = String(a[sortKey]).localeCompare(String(b[sortKey]));
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [designations, search, companyFilter, statusFilter, sortKey, sortDirection]);

  async function toggleActive(row: Designation) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setDesignationActive(row.designationId, !row.isActive, userKey);
      await refresh();
      toast.success(row.isActive ? "Designation deactivated" : "Designation activated");
    } catch (error) {
      toast.error(error instanceof DesignationsApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: Designation) {
    try {
      await deleteDesignation(row.designationId);
      await refresh();
      toast.success("Designation deleted");
    } catch (error) {
      toast.error(error instanceof DesignationsApiError ? error.message : "Could not delete designation");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Designation"
        description="Designations are scoped to a company within the current tenant."
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
              Add designation
            </Button>
          ) : undefined
        }
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading designations…</p>}
      {!loading && scopeTenantId > 0 && companies.length === 0 && (
        <p className="text-sm text-muted-foreground">Create a company first before adding designations.</p>
      )}

      {panelMode !== "closed" && scopeTenantId > 0 && (
        <DesignationPanel
          mode={panelMode}
          designation={target}
          designations={designations}
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

      {designations.length > 0 && (
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
        {!loading && designations.length === 0 && scopeTenantId > 0 ? (
          <EmptyState
            icon={Briefcase}
            tone="primary"
            heading="No designations yet"
            description="Add your first designation under a company."
            size="compact"
          />
        ) : visible.length === 0 && !loading && scopeTenantId > 0 ? (
          <EmptyState
            icon={Search}
            tone="muted"
            heading="No matching designations"
            description="Try a different search, company, or status filter."
            size="compact"
          />
        ) : scopeTenantId > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Sr.</TableHead>
                <SortableTableHead
                  sortKey="designationCode"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Code
                </SortableTableHead>
                <SortableTableHead
                  sortKey="designationName"
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
                <TableRow key={row.designationId}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium tabular-nums">{row.designationCode}</TableCell>
                  <TableCell>{row.designationName}</TableCell>
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

export default function DesignationMasterPage() {
  return <AccessGate module="designation">{(roleDef) => <DesignationList roleDef={roleDef} />}</AccessGate>;
}
