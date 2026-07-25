"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, KeyRound, MoreHorizontal, X, Search, Loader2 } from "lucide-react";
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
import {
  listAccessRoles,
  createAccessRole,
  updateAccessRole,
  setAccessRoleActive,
  deleteAccessRole,
  AccessRolesApiError,
} from "@/lib/services/access-roles.service";
import { can } from "@/config/permissions";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import type { AccessRole, RoleDef } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type SortKey = "accessRoleName" | "createdDtTm";
type StatusFilter = "all" | "active" | "inactive";

function useAccessRoleSchema(roles: AccessRole[], scopeTenantId: number, scopeCompanyId: number, currentId?: number) {
  return z.object({
    accessRoleName: z
      .string()
      .min(1, "Access role name is required")
      .max(50, "Name must be 50 characters or fewer")
      .refine(
        (value) =>
          !roles.some(
            (r) =>
              r.accessRoleId !== currentId &&
              r.tenantId === scopeTenantId &&
              r.companyId === scopeCompanyId &&
              r.accessRoleName.toLowerCase() === value.trim().toLowerCase()
          ),
        "This access role name already exists for this scope"
      ),
  });
}

type FormValues = z.infer<ReturnType<typeof useAccessRoleSchema>>;

function AccessRolePanel({
  mode,
  role,
  roles,
  userKey,
  tenantId,
  companyId,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  role?: AccessRole;
  roles: AccessRole[];
  userKey: number;
  tenantId: number;
  companyId: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const schema = useAccessRoleSchema(roles, tenantId, companyId, role?.accessRoleId);
  const isReadOnly = mode === "view";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      accessRoleName: role?.accessRoleName ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      if (mode === "edit" && role) {
        await updateAccessRole(role.accessRoleId, {
          accessRoleName: values.accessRoleName.trim(),
          tenantId,
          companyId,
          isActive: role.isActive,
          modifiedBy: userKey,
        });
        toast.success("Access role updated");
      } else if (mode === "create") {
        await createAccessRole({
          accessRoleName: values.accessRoleName.trim(),
          tenantId,
          companyId,
          createdBy: userKey,
        });
        toast.success("Access role created");
      }
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof AccessRolesApiError ? error.message : "Could not save access role");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">
            {mode === "create" ? "Add access role" : mode === "edit" ? "Edit access role" : "Access role details"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Scope T{tenantId} / C{companyId}
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="accessRoleName" required>
            Access role name
          </Label>
          <Input
            id="accessRoleName"
            autoFocus={mode !== "view"}
            disabled={isReadOnly}
            aria-invalid={!!errors.accessRoleName}
            {...register("accessRoleName")}
          />
          {errors.accessRoleName && (
            <p className="text-sm text-destructive">{errors.accessRoleName.message}</p>
          )}
        </div>

        {mode === "view" && role && (
          <div className="space-y-2 sm:col-span-2">
            <Label>Status</Label>
            <div>
              <Badge variant={role.isActive ? "default" : "secondary"}>
                {role.isActive ? "active" : "inactive"}
              </Badge>
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

function AccessRoleList({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const activeTenant = useTenantStore((s) => s.tenant);
  const [roles, setRoles] = useState<AccessRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<AccessRole | undefined>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const scopeTenantId = platformMode ? 0 : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);
  const scopeCompanyId = 0;

  const canEdit = can(roleDef, "accessRole", "edit");
  const canCreate = can(roleDef, "accessRole", "create");
  const canDelete = can(roleDef, "accessRole", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  async function refresh() {
    setLoading(true);
    setLoadError(null);
    try {
      setRoles(await listAccessRoles({ tenantId: scopeTenantId, companyId: scopeCompanyId }));
    } catch (error) {
      setLoadError(error instanceof AccessRolesApiError ? error.message : "Failed to load access roles");
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeTenantId, scopeCompanyId]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  const visibleRoles = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = roles;
    if (term) {
      result = result.filter((r) => r.accessRoleName.toLowerCase().includes(term));
    }
    if (statusFilter === "active") result = result.filter((r) => r.isActive);
    if (statusFilter === "inactive") result = result.filter((r) => !r.isActive);
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const cmp = String(a[sortKey]).localeCompare(String(b[sortKey]));
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [roles, search, statusFilter, sortKey, sortDirection]);

  async function toggleActive(role: AccessRole) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setAccessRoleActive(role.accessRoleId, !role.isActive, userKey);
      await refresh();
      toast.success(role.isActive ? "Access role deactivated" : "Access role activated");
    } catch (error) {
      toast.error(error instanceof AccessRolesApiError ? error.message : "Could not update status");
    }
  }

  async function removeRole(role: AccessRole) {
    try {
      await deleteAccessRole(role.accessRoleId);
      await refresh();
      toast.success("Access role deleted");
    } catch (error) {
      toast.error(error instanceof AccessRolesApiError ? error.message : "Could not delete access role");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Access Role"
        description={
          platformMode
            ? "Platform access roles — TenantID 0, CompanyID 0 (T0C0)."
            : "Access roles for this tenant (CompanyID 0)."
        }
        actions={
          canCreate && panelMode === "closed" ? (
            <Button
              onClick={() => {
                setTarget(undefined);
                setPanelMode("create");
              }}
            >
              <Plus className="h-4 w-4" />
              Add access role
            </Button>
          ) : undefined
        }
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading access roles…</p>}

      {panelMode !== "closed" && (
        <AccessRolePanel
          mode={panelMode}
          role={target}
          roles={roles}
          userKey={userKey}
          tenantId={scopeTenantId}
          companyId={scopeCompanyId}
          onSaved={refresh}
          onClose={() => {
            setPanelMode("closed");
            setTarget(undefined);
          }}
        />
      )}

      {roles.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name…"
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

      <Card>
        {!loading && roles.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            tone="primary"
            heading="No access roles yet"
            description="Add your first access role to get started."
            size="compact"
          />
        ) : visibleRoles.length === 0 && !loading ? (
          <EmptyState
            icon={Search}
            tone="muted"
            heading="No matching access roles"
            description="Try a different search term or status filter."
            size="compact"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Sr.</TableHead>
                <SortableTableHead
                  sortKey="accessRoleName"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Name
                </SortableTableHead>
                <TableHead>T / C</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRoles.map((role, index) => (
                <TableRow key={role.accessRoleId}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{role.accessRoleName}</TableCell>
                  <TableCell className="text-muted-foreground text-xs tabular-nums">
                    T{role.tenantId} / C{role.companyId}
                  </TableCell>
                  <TableCell>
                    <Badge variant={role.isActive ? "default" : "secondary"}>
                      {role.isActive ? "active" : "inactive"}
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
                            setTarget(role);
                            setPanelMode("view");
                          }}
                        >
                          View
                        </DropdownMenuItem>
                        {canEdit && (
                          <>
                            <DropdownMenuItem
                              onClick={() => {
                                setTarget(role);
                                setPanelMode("edit");
                              }}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void toggleActive(role)}>
                              {role.isActive ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                          </>
                        )}
                        {canDelete && (
                          <DropdownMenuItem onClick={() => void removeRole(role)}>Delete</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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

export default function AccessRoleMasterPage() {
  return <AccessGate module="accessRole">{(roleDef) => <AccessRoleList roleDef={roleDef} />}</AccessGate>;
}
