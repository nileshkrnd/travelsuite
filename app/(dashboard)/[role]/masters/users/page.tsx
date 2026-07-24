"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
import { useUsersStore } from "@/lib/store/users.store";
import { useRolesStore } from "@/lib/store/roles.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { useOrgName } from "@/lib/hooks/useOrgName";
import { can } from "@/config/permissions";
import { initials } from "@/lib/utils";
import type { RoleCategory, RoleDef, User } from "@/types";

const CATEGORY_LABELS: Record<RoleCategory, string> = {
  internal: "Internal Staff",
  agency: "Agency",
  subAgency: "SubAgency",
  corporate: "Corporate",
  supplier: "Supplier",
};
const CATEGORIES: RoleCategory[] = ["internal", "agency", "subAgency", "corporate", "supplier"];

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

function UsersList({ roleDef }: { roleDef: RoleDef }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const tenantId = useTenantStore((s) => s.tenantId);
  const users = useUsersStore((s) => s.users);
  const setUserStatus = useUsersStore((s) => s.setUserStatus);
  const roles = useRolesStore((s) => s.roles);
  const getOrgName = useOrgName();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const canEdit = can(roleDef, "users", "edit");
  const canCreate = can(roleDef, "users", "create");
  const canDelete = can(roleDef, "users", "delete");

  const roleFor = (id: string) => roles.find((r) => r.id === id);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  const tenantUsers = useMemo(() => users.filter((u) => u.tenantId === tenantId), [users, tenantId]);

  const visibleUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = tenantUsers;
    if (categoryFilter !== "all") {
      result = result.filter((u) => roleFor(u.roleId)?.category === categoryFilter);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantUsers, search, categoryFilter, sortKey, sortDirection, roles]);

  const activeCount = tenantUsers.filter((u) => u.status === "active").length;
  const invitedCount = tenantUsers.filter((u) => u.status === "invited").length;

  function toggleStatus(user: User) {
    setUserStatus(user.id, user.status === "deactivated" ? "active" : "deactivated");
  }

  function goToView(user: User) {
    router.push(`/${role}/masters/users/${user.id}`);
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Users"
        description="Every account with a login to this tenant, across every category."
        actions={
          canCreate ? (
            <Button nativeButton={false} render={<Link href={`/${role}/masters/users/new`} />}>
              <Plus className="h-4 w-4" />
              Register user
            </Button>
          ) : undefined
        }
      />

      {tenantUsers.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:max-w-xl">
          <StatCard icon={Users} label="Total users" value={tenantUsers.length} />
          <StatCard icon={CheckCircle2} label="Active" value={activeCount} />
          <StatCard icon={MailQuestion} label="Invited" value={invitedCount} />
        </div>
      )}

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
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "all")}>
          <SelectTrigger className="w-56">
            <SelectValue>
              {(value: string | null) =>
                !value || value === "all" ? "All categories" : CATEGORY_LABELS[value as RoleCategory]
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        {tenantUsers.length === 0 ? (
          <EmptyState
            icon={Users}
            tone="primary"
            heading="No users yet"
            description="Register your first user to get started."
            size="compact"
          />
        ) : visibleUsers.length === 0 ? (
          <EmptyState
            icon={Search}
            tone="muted"
            heading="No matching users"
            description="Try a different search term or category filter."
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
                <TableHead>Organization</TableHead>
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
              {visibleUsers.map((user, index) => (
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
                  <TableCell className="text-muted-foreground">{getOrgName(user)}</TableCell>
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
                          <DropdownMenuItem render={<Link href={`/${role}/masters/users/${user.id}`} />}>
                            <Eye className="h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          {canEdit && (
                            <DropdownMenuItem render={<Link href={`/${role}/masters/users/${user.id}/edit`} />}>
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

export default function UsersMasterPage() {
  return <AccessGate module="users">{(roleDef) => <UsersList roleDef={roleDef} />}</AccessGate>;
}
