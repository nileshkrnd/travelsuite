"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Plus,
  ShieldCheck,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { listPropertySuppliers } from "@/lib/services/property-suppliers.service";
import {
  listSupplierPropertyAccess,
  setSupplierPropertyAccessActive,
  deleteSupplierPropertyAccess,
  SupplierPropertyAccessApiError,
} from "@/lib/services/supplier-property-access.service";
import { can } from "@/config/permissions";
import type { PropertySupplier, RoleDef, SupplierPropertyAccess } from "@/types";

type SortKey = "link" | "user" | "status";

const FLAGS = [
  { key: "canView", label: "View" },
  { key: "canCreateRate", label: "Create rate" },
  { key: "canEditRate", label: "Edit rate" },
  { key: "canSubmitRate", label: "Submit rate" },
  { key: "canApproveRate", label: "Approve rate" },
] as const;

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

function linkLabel(grant: SupplierPropertyAccess) {
  return `${grant.propertyName ?? "Property"} — ${grant.supplierName ?? "Supplier"}`;
}

function SupplierPropertyAccessList({ roleDef }: { roleDef: RoleDef }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;

  const [grants, setGrants] = useState<SupplierPropertyAccess[]>([]);
  const [links, setLinks] = useState<PropertySupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const canEdit = can(roleDef, "supplierPropertyAccess", "edit");
  const canCreate = can(roleDef, "supplierPropertyAccess", "create");
  const canDelete = can(roleDef, "supplierPropertyAccess", "delete");

  useEffect(() => {
    if (tenantKey <= 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([listSupplierPropertyAccess({ tenantId: tenantKey }), listPropertySuppliers({ tenantId: tenantKey })])
      .then(([grantRows, linkRows]) => {
        if (cancelled) return;
        setGrants(grantRows);
        setLinks(linkRows);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load rate access grants");
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

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = grants;
    if (term) {
      result = result.filter((g) => {
        return (
          linkLabel(g).toLowerCase().includes(term) ||
          (g.userName ?? "").toLowerCase().includes(term)
        );
      });
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        if (sortKey === "link") cmp = linkLabel(a).localeCompare(linkLabel(b));
        else if (sortKey === "user") cmp = (a.userName ?? "").localeCompare(b.userName ?? "");
        else cmp = Number(a.isActive) - Number(b.isActive);
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [grants, search, sortKey, sortDirection]);

  const activeCount = grants.filter((g) => g.isActive).length;

  async function toggleStatus(grant: SupplierPropertyAccess) {
    try {
      const saved = await setSupplierPropertyAccessActive(grant.supplierPropertyAccessKey, !grant.isActive);
      setGrants((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
      toast.success(saved.isActive ? "Access activated" : "Access deactivated");
    } catch (error) {
      toast.error(error instanceof SupplierPropertyAccessApiError ? error.message : "Could not update status");
    }
  }

  async function removeGrant(grant: SupplierPropertyAccess) {
    try {
      await deleteSupplierPropertyAccess(grant.supplierPropertyAccessKey);
      setGrants((prev) => prev.filter((r) => r.id !== grant.id));
      toast.success("Access grant removed");
    } catch (error) {
      toast.error(error instanceof SupplierPropertyAccessApiError ? error.message : "Could not remove grant");
    }
  }

  function goToView(grant: SupplierPropertyAccess) {
    router.push(`/${role}/masters/supplier-property-access/${grant.supplierPropertyAccessKey}`);
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Supplier Property Access"
        description="Grant a supplier's portal user rate management access to one of their linked properties."
        actions={
          canCreate ? (
            <Button
              nativeButton={false}
              render={<Link href={`/${role}/masters/supplier-property-access/new`} />}
              disabled={links.length === 0}
            >
              <Plus className="h-4 w-4" />
              Grant access
            </Button>
          ) : undefined
        }
      />

      {loading && <p className="text-sm text-muted-foreground">Loading access grants…</p>}

      {grants.length > 0 && (
        <div className="grid max-w-xl grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard icon={ShieldCheck} label="Total grants" value={grants.length} />
          <StatCard icon={CheckCircle2} label="Active" value={activeCount} />
          <StatCard icon={CircleDashed} label="Inactive" value={grants.length - activeCount} />
        </div>
      )}

      {grants.length > 0 && (
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search property, supplier, user…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
      )}

      <Card>
        {links.length === 0 && !loading ? (
          <EmptyState
            icon={ShieldCheck}
            tone="muted"
            heading="Link a property to a supplier first"
            description="Rate access is granted on a property/supplier link — create one under Masters → Property Supplier."
            size="compact"
          />
        ) : grants.length === 0 && !loading ? (
          <EmptyState
            icon={ShieldCheck}
            tone="primary"
            heading="No access grants yet"
            description="Grant a supplier user rate access to get started."
            size="compact"
            action={
              canCreate ? (
                <Button nativeButton={false} render={<Link href={`/${role}/masters/supplier-property-access/new`} />}>
                  <Plus className="h-4 w-4" />
                  Grant access
                </Button>
              ) : undefined
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Search}
            tone="muted"
            heading="No matching access grants"
            description="Try a different search term."
            size="compact"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Sr. No</TableHead>
                <SortableTableHead sortKey="link" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Property — Supplier
                </SortableTableHead>
                <SortableTableHead sortKey="user" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  User
                </SortableTableHead>
                <TableHead>Permissions</TableHead>
                <SortableTableHead sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Status
                </SortableTableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((grant, index) => (
                <TableRow key={grant.id} className="cursor-pointer" onClick={() => goToView(grant)}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{linkLabel(grant)}</TableCell>
                  <TableCell>{grant.userName ?? `User ${grant.userKey}`}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {FLAGS.filter((f) => grant[f.key]).map((f) => (
                        <Badge key={f.key} variant="outline">
                          {f.label}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={grant.isActive ? "default" : "secondary"}>
                      {grant.isActive ? "active" : "inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => goToView(grant)}>
                          <Eye className="h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        {canEdit && (
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/${role}/masters/supplier-property-access/${grant.supplierPropertyAccessKey}/edit`)
                            }
                          >
                            <Pencil className="h-4 w-4" />
                            Modify
                          </DropdownMenuItem>
                        )}
                        {canEdit && (
                          <DropdownMenuItem onClick={() => void toggleStatus(grant)}>
                            {grant.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                            {grant.isActive ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem onClick={() => void removeGrant(grant)}>
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

export default function SupplierPropertyAccessPage() {
  return (
    <AccessGate module="supplierPropertyAccess">
      {(roleDef) => <SupplierPropertyAccessList roleDef={roleDef} />}
    </AccessGate>
  );
}
