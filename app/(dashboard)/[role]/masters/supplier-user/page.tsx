"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Plus,
  UserPlus,
  MoreHorizontal,
  Search,
  Eye,
  Pencil,
  Power,
  PowerOff,
  CheckCircle2,
  CircleDashed,
  Trash2,
} from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SortableTableHead, type SortDirection } from "@/components/shared/SortableTableHead";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { useTenantStore } from "@/lib/store/tenant.store";
import { listSuppliers } from "@/lib/services/suppliers.service";
import {
  listSupplierUsers,
  setSupplierUserActive,
  deleteSupplierUser,
  SupplierUsersApiError,
} from "@/lib/services/supplier-users.service";
import { can } from "@/config/permissions";
import type { RoleDef, Supplier, SupplierUser } from "@/types";

type SortKey = "name" | "supplier" | "email" | "status";

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

function displayName(entry: SupplierUser) {
  return `${entry.firstName} ${entry.lastName}`.trim();
}

function SupplierUserList({ roleDef }: { roleDef: RoleDef }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;
  const actorKey = sessionUser?.userKey ?? 0;

  const [entries, setEntries] = useState<SupplierUser[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const canEdit = can(roleDef, "supplierUser", "edit");
  const canCreate = can(roleDef, "supplierUser", "create");
  const canDelete = can(roleDef, "supplierUser", "delete");

  useEffect(() => {
    if (tenantKey <= 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      listSupplierUsers({ tenantId: tenantKey }),
      listSuppliers({ tenantId: tenantKey, activeOnly: true }),
    ])
      .then(([userRows, supplierRows]) => {
        if (cancelled) return;
        setEntries(userRows);
        setSuppliers(supplierRows);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof SupplierUsersApiError ? err.message : "Failed to load supplier users");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantKey]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  const supplierName = (supplierId: number) =>
    suppliers.find((s) => s.supplierKey === supplierId)?.name ??
    entries.find((e) => e.supplierId === supplierId)?.supplierName ??
    `Supplier ${supplierId}`;

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = entries;
    if (supplierFilter !== "all") {
      result = result.filter((e) => String(e.supplierId) === supplierFilter);
    }
    if (statusFilter === "active") result = result.filter((e) => e.isActive);
    if (statusFilter === "inactive") result = result.filter((e) => !e.isActive);
    if (term) {
      result = result.filter((e) => {
        const name = displayName(e).toLowerCase();
        const supplier = (e.supplierName ?? supplierName(e.supplierId)).toLowerCase();
        return (
          name.includes(term) ||
          e.email.toLowerCase().includes(term) ||
          supplier.includes(term) ||
          (e.accessRoleName ?? "").toLowerCase().includes(term)
        );
      });
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        if (sortKey === "name") cmp = displayName(a).localeCompare(displayName(b));
        else if (sortKey === "supplier") {
          cmp = (a.supplierName ?? "").localeCompare(b.supplierName ?? "");
        } else if (sortKey === "email") cmp = a.email.localeCompare(b.email);
        else cmp = Number(a.isActive) - Number(b.isActive);
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [entries, search, supplierFilter, statusFilter, sortKey, sortDirection, suppliers]);

  const activeCount = entries.filter((e) => e.isActive).length;

  async function toggleStatus(entry: SupplierUser) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await setSupplierUserActive(entry.supplierUserKey, !entry.isActive, actorKey);
      setEntries((prev) => prev.map((r) => (r.supplierUserKey === saved.supplierUserKey ? saved : r)));
      toast.success(saved.isActive ? "Supplier user activated" : "Supplier user deactivated");
    } catch (error) {
      toast.error(error instanceof SupplierUsersApiError ? error.message : "Could not update status");
    }
  }

  async function removeEntry(entry: SupplierUser) {
    try {
      await deleteSupplierUser(entry.supplierUserKey);
      setEntries((prev) => prev.filter((r) => r.supplierUserKey !== entry.supplierUserKey));
      toast.success("Supplier user removed");
    } catch (error) {
      toast.error(error instanceof SupplierUsersApiError ? error.message : "Could not remove supplier user");
    }
  }

  function goToView(entry: SupplierUser) {
    router.push(`/${role}/masters/supplier-user/${entry.supplierUserKey}`);
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Supplier User"
        description="Portal contacts for each supplier — registering one also creates their login account."
        actions={
          canCreate ? (
            <Button
              nativeButton={false}
              render={<Link href={`/${role}/masters/supplier-user/new`} />}
              disabled={suppliers.length === 0}
            >
              <Plus className="h-4 w-4" />
              Register user
            </Button>
          ) : undefined
        }
      />

      {loading && <p className="text-sm text-muted-foreground">Loading supplier users…</p>}

      {entries.length > 0 && (
        <div className="grid max-w-xl grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard icon={UserPlus} label="Total users" value={entries.length} />
          <StatCard icon={CheckCircle2} label="Active" value={activeCount} />
          <StatCard icon={CircleDashed} label="Inactive" value={entries.length - activeCount} />
        </div>
      )}

      {suppliers.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, email, supplier…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>
          <Select value={supplierFilter} onValueChange={(v) => setSupplierFilter(v ?? "all")}>
            <SelectTrigger className="w-56">
              <SelectValue>
                {(value: string | null) =>
                  !value || value === "all" ? "All suppliers" : supplierName(Number(value))
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All suppliers</SelectItem>
              {suppliers.map((s) => (
                <SelectItem key={s.supplierKey} value={String(s.supplierKey)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
            <SelectTrigger className="w-40">
              <SelectValue>
                {(value: string | null) =>
                  value === "active" ? "Active" : value === "inactive" ? "Inactive" : "All statuses"
                }
              </SelectValue>
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
        {suppliers.length === 0 && !loading ? (
          <EmptyState
            icon={UserPlus}
            tone="muted"
            heading="Add a supplier first"
            description="Supplier users belong to a supplier — create one under Masters → Supplier."
            size="compact"
          />
        ) : entries.length === 0 && !loading ? (
          <EmptyState
            icon={UserPlus}
            tone="primary"
            heading="No supplier users yet"
            description="Register your first supplier contact to get started."
            size="compact"
            action={
              canCreate ? (
                <Button nativeButton={false} render={<Link href={`/${role}/masters/supplier-user/new`} />}>
                  <Plus className="h-4 w-4" />
                  Register user
                </Button>
              ) : undefined
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Search}
            tone="muted"
            heading="No matching supplier users"
            description="Try a different search term or filter."
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
                  sortKey="supplier"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Supplier
                </SortableTableHead>
                <SortableTableHead sortKey="email" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Email
                </SortableTableHead>
                <TableHead>Access role</TableHead>
                <SortableTableHead sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Status
                </SortableTableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((entry, index) => (
                <TableRow
                  key={entry.id}
                  className="cursor-pointer"
                  onClick={() => goToView(entry)}
                >
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{displayName(entry)}</TableCell>
                  <TableCell>{entry.supplierName ?? supplierName(entry.supplierId)}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{entry.accessRoleName ?? "—"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={entry.isActive ? "default" : "secondary"}>
                      {entry.isActive ? "active" : "inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => goToView(entry)}>
                          <Eye className="h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        {canEdit && (
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/${role}/masters/supplier-user/${entry.supplierUserKey}/edit`)
                            }
                          >
                            <Pencil className="h-4 w-4" />
                            Modify
                          </DropdownMenuItem>
                        )}
                        {canEdit && (
                          <DropdownMenuItem onClick={() => void toggleStatus(entry)}>
                            {entry.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                            {entry.isActive ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem onClick={() => void removeEntry(entry)}>
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </DropdownMenuItem>
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

export default function SupplierUserPage() {
  return <AccessGate module="supplierUser">{(roleDef) => <SupplierUserList roleDef={roleDef} />}</AccessGate>;
}
