"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Building,
  Building2,
  MoreHorizontal,
  Search,
  Eye,
  Pencil,
  Power,
  PowerOff,
  CheckCircle2,
  CircleDashed,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SortableTableHead, type SortDirection } from "@/components/shared/SortableTableHead";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TenantLogo } from "@/components/layout/TenantLogo";
import { useTenantsStore } from "@/lib/store/tenants.store";
import { useSessionStore } from "@/lib/store/session.store";
import { useUsersStore } from "@/lib/store/users.store";
import { useHydrateTenants } from "@/lib/hooks/useHydrateTenants";
import { setTenantStatus, TenantsApiError } from "@/lib/services/tenants.service";
import { can } from "@/config/permissions";
import type { RoleDef, Tenant } from "@/types";

type SortKey = "name" | "slug" | "groupName" | "status" | "createdAt";

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

function TenantList({ roleDef }: { roleDef: RoleDef }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const tenants = useTenantsStore((s) => s.tenants);
  const upsertTenant = useTenantsStore((s) => s.upsertTenant);
  const { loading, error } = useHydrateTenants();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const canCreate = can(roleDef, "tenantProfile", "create");
  const canEdit = can(roleDef, "tenantProfile", "edit");
  const actorKey = user
    ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0)
    : 0;

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  const visibleTenants = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = tenants;
    if (term) {
      result = result.filter(
        (t) =>
          t.branding.name.toLowerCase().includes(term) ||
          t.slug.toLowerCase().includes(term) ||
          t.groupName.toLowerCase().includes(term)
      );
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const av =
          sortKey === "name"
            ? a.branding.name
            : sortKey === "slug"
              ? a.slug
              : sortKey === "groupName"
                ? a.groupName
                : a[sortKey];
        const bv =
          sortKey === "name"
            ? b.branding.name
            : sortKey === "slug"
              ? b.slug
              : sortKey === "groupName"
                ? b.groupName
                : b[sortKey];
        const cmp = String(av).localeCompare(String(bv));
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [tenants, search, sortKey, sortDirection]);

  const activeCount = tenants.filter((t) => t.status === "active").length;

  async function toggleStatus(tenant: Tenant) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await setTenantStatus(
        tenant.tenantKey,
        tenant.status === "active" ? "inactive" : "active",
        actorKey
      );
      upsertTenant(saved);
      toast.success(saved.status === "active" ? "Tenant activated" : "Tenant deactivated");
    } catch (err) {
      toast.error(err instanceof TenantsApiError ? err.message : "Could not update status");
    }
  }

  function goToView(tenant: Tenant) {
    router.push(`/${role}/masters/tenant/${tenant.id}`);
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Tenant"
        description="Primary PostgreSQL entry point — holdings registered on Klyra. Companies and regions hang off TenantID."
        actions={
          canCreate ? (
            <Button nativeButton={false} render={<Link href={`/${role}/masters/tenant/new`} />}>
              <Plus className="h-4 w-4" />
              Register tenant
            </Button>
          ) : undefined
        }
      />

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading tenants from database…
        </div>
      )}

      {error && !loading && (
        <EmptyState
          icon={Building}
          tone="muted"
          heading="Could not load tenants"
          description={error}
          size="compact"
        />
      )}

      {!loading && !error && tenants.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:max-w-xl">
          <StatCard icon={Building2} label="Total tenants" value={tenants.length} />
          <StatCard icon={CheckCircle2} label="Active" value={activeCount} />
          <StatCard icon={CircleDashed} label="Inactive" value={tenants.length - activeCount} />
        </div>
      )}

      {!loading && !error && tenants.length > 0 && (
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
      )}

      <Card>
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : error ? null : tenants.length === 0 ? (
          <EmptyState
            icon={Building}
            tone="primary"
            heading="No tenants yet"
            description="Register your first tenant to get started."
            size="compact"
          />
        ) : visibleTenants.length === 0 ? (
          <EmptyState
            icon={Search}
            tone="muted"
            heading="No matching tenants"
            description="Try a different search term."
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
                <SortableTableHead
                  sortKey="groupName"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Holding group
                </SortableTableHead>
                <SortableTableHead sortKey="slug" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Tenant code
                </SortableTableHead>
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
              {visibleTenants.map((tenant, index) => (
                <TableRow
                  key={tenant.id}
                  onClick={() => goToView(tenant)}
                  className="cursor-pointer"
                >
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell>
                    <TenantLogo branding={tenant.branding} size="sm" showName />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{tenant.groupName}</TableCell>
                  <TableCell>
                    <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                      {tenant.slug}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={tenant.status === "active" ? "default" : "secondary"}
                      className="gap-1"
                    >
                      {tenant.status === "active" ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <CircleDashed className="h-3 w-3" />
                      )}
                      {tenant.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem render={<Link href={`/${role}/masters/tenant/${tenant.id}`} />}>
                          <Eye className="h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        {canEdit && (
                          <>
                            <DropdownMenuItem
                              render={<Link href={`/${role}/masters/tenant/${tenant.id}/edit`} />}
                            >
                              <Pencil className="h-4 w-4" />
                              Modify
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleStatus(tenant)}>
                              {tenant.status === "active" ? (
                                <PowerOff className="h-4 w-4" />
                              ) : (
                                <Power className="h-4 w-4" />
                              )}
                              {tenant.status === "active" ? "Deactivate" : "Activate"}
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

export default function TenantMasterPage() {
  return <AccessGate module="tenantProfile">{(roleDef) => <TenantList roleDef={roleDef} />}</AccessGate>;
}
