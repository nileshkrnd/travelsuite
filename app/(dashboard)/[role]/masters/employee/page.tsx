"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Plus,
  UserCog,
  MoreHorizontal,
  Search,
  Eye,
  Pencil,
  Power,
  PowerOff,
  CheckCircle2,
  MailQuestion,
} from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SortableTableHead, type SortDirection } from "@/components/shared/SortableTableHead";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSessionStore } from "@/lib/store/session.store";
import { useUsersStore } from "@/lib/store/users.store";
import { useRolesStore } from "@/lib/store/roles.store";
import { useCompaniesStore } from "@/lib/store/companies.store";
import { useBranchesStore } from "@/lib/store/branches.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { listUsers, setUserActive, UsersApiError } from "@/lib/services/db-users.service";
import { can } from "@/config/permissions";
import { initials } from "@/lib/utils";
import type { RoleDef, User } from "@/types";

type SortKey = "name" | "status" | "createdAt";

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmployeeList({ roleDef }: { roleDef: RoleDef }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const sessionUser = useSessionStore((s) => s.user);
  const tenantId = useTenantStore((s) => s.tenantId);
  const activeTenant = useTenantStore((s) => s.tenant);
  const users = useUsersStore((s) => s.users);
  const setUsers = useUsersStore((s) => s.setUsers);
  const upsertUser = useUsersStore((s) => s.upsertUser);
  const roles = useRolesStore((s) => s.roles);
  const companies = useCompaniesStore((s) => s.companies);
  const branches = useBranchesStore((s) => s.branches);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const canEdit = can(roleDef, "employee", "edit");
  const canCreate = can(roleDef, "employee", "create");
  const canDelete = can(roleDef, "employee", "delete");
  const actorKey = sessionUser?.userKey ?? 0;
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;

  const roleFor = (id: string) => roles.find((r) => r.id === id);
  const companyName = (id?: string) => companies.find((c) => c.id === id)?.name ?? "—";
  const branchName = (id?: string) => branches.find((b) => b.id === id)?.name ?? "—";

  useEffect(() => {
    if (tenantKey <= 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    listUsers({ tenantId: tenantKey })
      .then((rows) => {
        if (cancelled) return;
        const existing = useUsersStore.getState().users;
        const companyByKey = new Map(companies.map((c) => [c.companyKey, c.id]));
        const employees = rows
          .filter((u) => u.companyKey > 0)
          .map((row) => {
            const prev = existing.find((u) => u.userKey === row.userKey || u.id === row.id);
            return {
              ...row,
              roleId: prev?.roleId && prev.roleId !== "role_hr" ? prev.roleId : row.roleId,
              companyId: prev?.companyId ?? companyByKey.get(row.companyKey) ?? row.companyId,
              branchId: prev?.branchId,
              department: prev?.department,
            };
          });
        const others = existing.filter((u) => u.tenantKey !== tenantKey || u.companyKey === 0);
        setUsers([...others, ...employees]);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err instanceof UsersApiError ? err.message : "Failed to load employees");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantKey, companies, setUsers]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  const employees = useMemo(
    () => users.filter((u) => u.tenantId === tenantId && u.companyKey > 0),
    [users, tenantId]
  );

  const visibleEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = employees;
    if (companyFilter !== "all") {
      result = result.filter((u) => u.companyId === companyFilter);
    }
    if (term) {
      result = result.filter(
        (u) => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)
      );
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const cmp = a[sortKey].localeCompare(b[sortKey]);
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [employees, search, companyFilter, sortKey, sortDirection]);

  const activeCount = employees.filter((u) => u.status === "active").length;
  const invitedCount = employees.filter((u) => u.status === "invited").length;

  async function toggleStatus(user: User) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await setUserActive(user.userKey, !user.isActive, actorKey);
      upsertUser({
        ...saved,
        roleId: user.roleId,
        companyId: user.companyId,
        branchId: user.branchId,
        department: user.department,
      });
      toast.success(saved.isActive ? "Employee activated" : "Employee deactivated");
    } catch (error) {
      toast.error(error instanceof UsersApiError ? error.message : "Could not update employee");
    }
  }

  function goToView(user: User) {
    router.push(`/${role}/masters/employee/${user.id}`);
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Employee"
        description="Register staff under a company — their company email becomes the login. Users master is only in Tenant Configuration."
        actions={
          canCreate ? (
            <Button
              nativeButton={false}
              render={<Link href={`/${role}/masters/employee/new`} />}
              disabled={companies.length === 0}
            >
              <Plus className="h-4 w-4" />
              Register employee
            </Button>
          ) : undefined
        }
      />

      {loading && <p className="text-sm text-muted-foreground">Loading employees…</p>}

      {employees.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:max-w-xl">
          <StatCard icon={UserCog} label="Total employees" value={employees.length} />
          <StatCard icon={CheckCircle2} label="Active" value={activeCount} />
          <StatCard icon={MailQuestion} label="Invited" value={invitedCount} />
        </div>
      )}

      {companies.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>
          <Select value={companyFilter} onValueChange={(v) => setCompanyFilter(v ?? "all")}>
            <SelectTrigger className="w-56">
              <SelectValue>
                {(value: string | null) => (!value || value === "all" ? "All companies" : companyName(value))}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All companies</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Card>
        {companies.length === 0 ? (
          <EmptyState
            icon={UserCog}
            tone="muted"
            heading="Add a company first"
            description="Employees belong to a company and branch — create one under Masters → Company."
            size="compact"
          />
        ) : employees.length === 0 ? (
          <EmptyState
            icon={UserCog}
            tone="primary"
            heading="No employees yet"
            description="Register your first employee to get started."
            size="compact"
          />
        ) : visibleEmployees.length === 0 ? (
          <EmptyState
            icon={Search}
            tone="muted"
            heading="No matching employees"
            description="Try a different search term or company filter."
            size="compact"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Sr. No</TableHead>
                <SortableTableHead sortKey="name" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Name
                </SortableTableHead>
                <TableHead>Role</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Branch</TableHead>
                <SortableTableHead
                  sortKey="status"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Status
                </SortableTableHead>
                <SortableTableHead
                  sortKey="createdAt"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Created
                </SortableTableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleEmployees.map((user, index) => (
                <TableRow key={user.id} onClick={() => goToView(user)} className="cursor-pointer">
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar size="sm">
                        <AvatarFallback>{initials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{user.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{roleFor(user.roleId)?.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{companyName(user.companyId)}</TableCell>
                  <TableCell className="text-muted-foreground">{branchName(user.branchId)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.status === "active" ? "default" : user.status === "invited" ? "secondary" : "outline"
                      }
                    >
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    {(canEdit || canDelete) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem render={<Link href={`/${role}/masters/employee/${user.id}`} />}>
                            <Eye className="h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          {canEdit && (
                            <DropdownMenuItem
                              render={<Link href={`/${role}/masters/employee/${user.id}/edit`} />}
                            >
                              <Pencil className="h-4 w-4" />
                              Modify
                            </DropdownMenuItem>
                          )}
                          {canDelete && user.status !== "deactivated" && (
                            <DropdownMenuItem variant="destructive" onClick={() => toggleStatus(user)}>
                              <PowerOff className="h-4 w-4" />
                              Deactivate
                            </DropdownMenuItem>
                          )}
                          {canDelete && user.status === "deactivated" && (
                            <DropdownMenuItem onClick={() => toggleStatus(user)}>
                              <Power className="h-4 w-4" />
                              Reactivate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
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

export default function EmployeeMasterPage() {
  return <AccessGate module="employee">{(roleDef) => <EmployeeList roleDef={roleDef} />}</AccessGate>;
}
