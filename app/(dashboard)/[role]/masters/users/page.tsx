"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Plus,
  Users,
  MoreHorizontal,
  Search,
  Eye,
  Pencil,
  Power,
  PowerOff,
  CheckCircle2,
  Shield,
  Building2,
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
import { useTenantStore, isPlatformMode } from "@/lib/store/tenant.store";
import { listUsers, setUserActive, UsersApiError } from "@/lib/services/db-users.service";
import { can } from "@/config/permissions";
import { initials } from "@/lib/utils";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import type { RoleDef, User, UserScope } from "@/types";

type SortKey = "name" | "username" | "scope" | "createdAt";
type ScopeFilter = "all" | UserScope;

function scopeLabel(scope: UserScope) {
  if (scope === "superAdmin") return "Super Admin";
  if (scope === "tenantAdmin") return "Tenant Admin";
  return "Employee";
}

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

function UsersList({ roleDef }: { roleDef: RoleDef }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const activeTenant = useTenantStore((s) => s.tenant);
  const users = useUsersStore((s) => s.users);
  const setUsers = useUsersStore((s) => s.setUsers);
  const upsertUser = useUsersStore((s) => s.upsertUser);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const canEdit = can(roleDef, "users", "edit");
  const canCreate = can(roleDef, "users", "create");
  const actorKey = sessionUser?.userKey ?? 0;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const opts =
      isSuperAdmin && platformMode
        ? undefined
        : { tenantId: sessionUser?.tenantKey ?? activeTenant.tenantKey ?? undefined };

    listUsers(opts)
      .then((rows) => {
        if (cancelled) return;
        setUsers(rows);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof UsersApiError ? err.message : "Failed to load users");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    isSuperAdmin,
    platformMode,
    sessionUser?.tenantKey,
    activeTenant.tenantKey,
    setUsers,
  ]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  const visibleUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = users;
    if (!platformMode && !isSuperAdmin) {
      const tk = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;
      result = result.filter((u) => u.tenantKey === tk);
    }
    if (scopeFilter !== "all") {
      result = result.filter((u) => u.scope === scopeFilter);
    }
    if (term) {
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(term) ||
          u.username.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term)
      );
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const av = sortKey === "username" ? a.username : sortKey === "scope" ? a.scope : a[sortKey];
        const bv = sortKey === "username" ? b.username : sortKey === "scope" ? b.scope : b[sortKey];
        const cmp = String(av).localeCompare(String(bv));
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [
    users,
    search,
    scopeFilter,
    sortKey,
    sortDirection,
    platformMode,
    isSuperAdmin,
    sessionUser?.tenantKey,
    activeTenant.tenantKey,
  ]);

  async function toggleActive(user: User) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await setUserActive(user.userKey, !user.isActive, actorKey);
      upsertUser(saved);
      toast.success(saved.isActive ? "User activated" : "User deactivated");
    } catch (error) {
      toast.error(error instanceof UsersApiError ? error.message : "Could not update user");
    }
  }

  const activeCount = users.filter((u) => u.isActive).length;
  const superCount = users.filter((u) => u.scope === "superAdmin").length;
  const tenantAdminCount = users.filter((u) => u.scope === "tenantAdmin").length;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Users"
        description={
          platformMode
            ? "Platform User master — Super Admin (0/0) and Tenant Admins (tenant/0)."
            : "User master for this tenant — Tenant Admins and employee logins."
        }
        actions={
          canCreate ? (
            <Button nativeButton={false} render={<Link href={`/${role}/masters/users/new`} />}>
              <Plus className="h-4 w-4" />
              Add user
            </Button>
          ) : undefined
        }
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading users…</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={CheckCircle2} label="Active" value={activeCount} />
        <StatCard icon={Shield} label="Super Admins" value={superCount} />
        <StatCard icon={Building2} label="Tenant Admins" value={tenantAdminCount} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name or username…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
        <Select value={scopeFilter} onValueChange={(value) => setScopeFilter((value as ScopeFilter) ?? "all")}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All scopes</SelectItem>
            <SelectItem value="superAdmin">Super Admin</SelectItem>
            <SelectItem value="tenantAdmin">Tenant Admin</SelectItem>
            <SelectItem value="employee">Employee</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        {!loading && visibleUsers.length === 0 ? (
          <EmptyState
            icon={Users}
            tone="muted"
            heading="No users found"
            description="Create a user to get started."
            size="compact"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Sr.</TableHead>
                <SortableTableHead sortKey="name" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Name
                </SortableTableHead>
                <SortableTableHead
                  sortKey="username"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Username
                </SortableTableHead>
                <SortableTableHead sortKey="scope" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Scope
                </SortableTableHead>
                <TableHead>Tenant / Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleUsers.map((user, index) => (
                <TableRow key={user.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar size="sm">
                        <AvatarFallback>{initials(user.name)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{scopeLabel(user.scope)}</TableCell>
                  <TableCell className="text-muted-foreground text-xs tabular-nums">
                    T{user.tenantKey} / C{user.companyKey}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "default" : "secondary"}>
                      {user.isActive ? "active" : "inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/${role}/masters/users/${user.id}`)}>
                          <Eye className="h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        {canEdit && (
                          <>
                            <DropdownMenuItem
                              onClick={() => router.push(`/${role}/masters/users/${user.id}/edit`)}
                            >
                              <Pencil className="h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void toggleActive(user)}>
                              {user.isActive ? (
                                <>
                                  <PowerOff className="h-4 w-4" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Power className="h-4 w-4" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                          </>
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

export default function UsersMasterPage() {
  return <AccessGate module="users">{(roleDef) => <UsersList roleDef={roleDef} />}</AccessGate>;
}
