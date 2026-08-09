"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Store, MoreHorizontal, Search, Star } from "lucide-react";
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
  listSupplierPropertyGrants,
  setSupplierPropertyGrantActive,
  PropertySuppliersApiError,
} from "@/lib/services/property-suppliers.service";
import { can } from "@/config/permissions";
import type { RoleDef, SupplierPropertyGrant } from "@/types";

function PropertySupplierList({ roleDef }: { roleDef: RoleDef }) {
  const { role } = useParams<{ role: string }>();
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;
  const [grants, setGrants] = useState<SupplierPropertyGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const canEdit = can(roleDef, "propertySupplier", "edit");
  const canCreate = can(roleDef, "propertySupplier", "create");

  useEffect(() => {
    if (tenantKey <= 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    listSupplierPropertyGrants(tenantKey)
      .then((rows) => {
        if (!cancelled) setGrants(rows);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load property links");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantKey]);

  function upsertLocal(row: SupplierPropertyGrant) {
    setGrants((prev) => {
      const idx = prev.findIndex((r) => r.supplierId === row.supplierId);
      return idx === -1 ? [row, ...prev] : prev.map((r, i) => (i === idx ? row : r));
    });
  }

  async function toggleActive(grant: SupplierPropertyGrant) {
    try {
      const saved = await setSupplierPropertyGrantActive(grant.supplierId, !grant.isActive);
      upsertLocal(saved);
      toast.success(saved.isActive ? "Activated" : "Deactivated");
    } catch (error) {
      toast.error(error instanceof PropertySuppliersApiError ? error.message : "Could not update status");
    }
  }

  const visibleGrants = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return grants;
    return grants.filter((g) => (g.supplierName ?? "").toLowerCase().includes(term));
  }, [grants, search]);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Property Supplier"
        description="Which properties each supplier services — link one supplier to several properties at once."
        actions={
          canCreate ? (
            <Button nativeButton={false} render={<Link href={`/${role}/masters/property-supplier/new`} />}>
              <Plus className="h-4 w-4" />
              Link properties
            </Button>
          ) : undefined
        }
      />

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {grants.length > 0 && (
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search supplier…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
      )}

      <Card>
        {!loading && grants.length === 0 ? (
          <EmptyState
            icon={Store}
            tone="primary"
            heading="No property links yet"
            description="Link a supplier to one or more properties to get started."
            size="compact"
          />
        ) : visibleGrants.length === 0 && !loading ? (
          <EmptyState icon={Search} tone="muted" heading="No matching suppliers" description="Try a different search term." size="compact" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Properties</TableHead>
                <TableHead>Primary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleGrants.map((grant) => (
                <TableRow key={grant.supplierId}>
                  <TableCell className="font-medium">
                    <Link href={`/${role}/masters/property-supplier/${grant.supplierId}`} className="hover:underline">
                      {grant.supplierName ?? `Supplier ${grant.supplierId}`}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {grant.properties.length} propert{grant.properties.length === 1 ? "y" : "ies"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {grant.isPrimary ? <Star className="h-4 w-4 fill-primary text-primary" /> : "—"}
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
                          render={<Link href={`/${role}/masters/property-supplier/${grant.supplierId}`} />}
                        >
                          View
                        </DropdownMenuItem>
                        {canEdit && (
                          <>
                            <DropdownMenuItem
                              nativeButton={false}
                              render={<Link href={`/${role}/masters/property-supplier/${grant.supplierId}/edit`} />}
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

export default function PropertySupplierPage() {
  return <AccessGate module="propertySupplier">{(roleDef) => <PropertySupplierList roleDef={roleDef} />}</AccessGate>;
}
