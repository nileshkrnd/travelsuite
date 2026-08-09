"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, ShieldCheck, MoreHorizontal, Search, Globe2 } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card } from "@/components/ui/card";
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
import {
  listEmployeePropertyGrants,
  setEmployeePropertyGrantActive,
  EmployeePropertyAccessApiError,
} from "@/lib/services/employee-property-access.service";
import { can } from "@/config/permissions";
import type { EmployeePropertyGrant, RoleDef } from "@/types";

const FLAGS = [
  { key: "canView", label: "View" },
  { key: "canCreate", label: "Create" },
  { key: "canEdit", label: "Edit" },
  { key: "canSubmit", label: "Submit" },
  { key: "canApprove", label: "Approve" },
] as const;

function EmployeePropertyAccessList({ roleDef }: { roleDef: RoleDef }) {
  const { role } = useParams<{ role: string }>();
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;
  const [grants, setGrants] = useState<EmployeePropertyGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const canEdit = can(roleDef, "employeePropertyAccess", "edit");
  const canCreate = can(roleDef, "employeePropertyAccess", "create");

  useEffect(() => {
    if (tenantKey <= 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    listEmployeePropertyGrants({ tenantId: tenantKey })
      .then((rows) => {
        if (!cancelled) setGrants(rows);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load access grants");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantKey]);

  function upsertLocal(row: EmployeePropertyGrant) {
    setGrants((prev) => {
      const idx = prev.findIndex((r) => r.employeeId === row.employeeId);
      return idx === -1 ? [row, ...prev] : prev.map((r, i) => (i === idx ? row : r));
    });
  }

  async function toggleActive(grant: EmployeePropertyGrant) {
    try {
      const saved = await setEmployeePropertyGrantActive(grant.employeeId, !grant.isActive);
      upsertLocal(saved);
      toast.success(saved.isActive ? "Activated" : "Deactivated");
    } catch (error) {
      toast.error(error instanceof EmployeePropertyAccessApiError ? error.message : "Could not update status");
    }
  }

  const visibleGrants = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return grants;
    return grants.filter((g) => (g.employeeName ?? "").toLowerCase().includes(term));
  }, [grants, search]);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Employee Property Access"
        description="Grant employees explicit view/create/edit/submit/approve access to one, several, or all properties."
        actions={
          canCreate ? (
            <Button nativeButton={false} render={<Link href={`/${role}/masters/employee-property-access/new`} />}>
              <Plus className="h-4 w-4" />
              Grant access
            </Button>
          ) : undefined
        }
      />

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {grants.length > 0 && (
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employee…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
      )}

      <Card>
        {!loading && grants.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            tone="primary"
            heading="No access grants yet"
            description="Grant an employee access to a property to get started."
            size="compact"
          />
        ) : visibleGrants.length === 0 && !loading ? (
          <EmptyState
            icon={Search}
            tone="muted"
            heading="No matching employees"
            description="Try a different search term."
            size="compact"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Property scope</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleGrants.map((grant) => (
                <TableRow key={grant.employeeId}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/${role}/masters/employee-property-access/${grant.employeeId}`}
                      className="hover:underline"
                    >
                      {grant.employeeName ?? `Employee ${grant.employeeId}`}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {grant.isAllProperties ? (
                      <Badge variant="default" className="gap-1">
                        <Globe2 className="h-3 w-3" />
                        All properties
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        {grant.properties.length} propert{grant.properties.length === 1 ? "y" : "ies"}
                      </Badge>
                    )}
                  </TableCell>
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
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          nativeButton={false}
                          render={<Link href={`/${role}/masters/employee-property-access/${grant.employeeId}`} />}
                        >
                          View
                        </DropdownMenuItem>
                        {canEdit && (
                          <>
                            <DropdownMenuItem
                              nativeButton={false}
                              render={
                                <Link href={`/${role}/masters/employee-property-access/${grant.employeeId}/edit`} />
                              }
                            >
                              Modify
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void toggleActive(grant)}>
                              {grant.isActive ? "Deactivate" : "Activate"}
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

export default function EmployeePropertyAccessPage() {
  return (
    <AccessGate module="employeePropertyAccess">
      {(roleDef) => <EmployeePropertyAccessList roleDef={roleDef} />}
    </AccessGate>
  );
}
