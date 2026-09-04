"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Landmark, Eye, Pencil, Power, PowerOff, Trash2, Search, ClipboardList } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SortableTableHead, type SortDirection } from "@/components/shared/SortableTableHead";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore, isPlatformMode } from "@/lib/store/tenant.store";
import { useUsersStore } from "@/lib/store/users.store";
import { listB2BCustomerTypes, B2BCustomerTypesApiError } from "@/lib/services/b2b-customer-types.service";
import {
  listB2BCustomers,
  setB2BCustomerActive,
  deleteB2BCustomer,
  B2BCustomersApiError,
} from "@/lib/services/b2b-customers.service";
import { b2bCustomerPaths } from "@/components/masters/B2BCustomerForm";
import { cn } from "@/lib/utils";
import { can } from "@/config/permissions";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import type { RoleDef, B2BCustomer, B2BCustomerType } from "@/types";

type SortKey = "b2bCustomerCode" | "b2bCustomerName";
type StatusFilter = "all" | "active" | "inactive";

function CustomerList({ roleDef }: { roleDef: RoleDef }) {
  const { role } = useParams<{ role: string }>();
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const activeTenant = useTenantStore((s) => s.tenant);

  const [types, setTypes] = useState<B2BCustomerType[]>([]);
  const [rows, setRows] = useState<B2BCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>("b2bCustomerName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const scopeTenantId = platformMode ? 0 : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);

  const canEdit = can(roleDef, "b2bCustomer", "edit");
  const canCreate = can(roleDef, "b2bCustomer", "create");
  const canDelete = can(roleDef, "b2bCustomer", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;
  const paths = b2bCustomerPaths(role);

  async function loadAll() {
    if (scopeTenantId <= 0) {
      setRows([]);
      setLoading(false);
      setLoadError(platformMode ? "Select a tenant workspace to manage B2B customers." : "Missing tenant scope.");
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [typeRows, customerRows] = await Promise.all([
        listB2BCustomerTypes({ tenantId: scopeTenantId, activeOnly: true }),
        listB2BCustomers({ tenantId: scopeTenantId }),
      ]);
      setTypes(typeRows);
      setRows(customerRows);
    } catch (error) {
      setLoadError(
        error instanceof B2BCustomerTypesApiError || error instanceof B2BCustomersApiError
          ? error.message
          : "Failed to load B2B customers"
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
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
    let result = rows;
    if (typeFilter) result = result.filter((r) => r.b2bCustomerTypeId === typeFilter);
    if (term) {
      result = result.filter(
        (r) => r.b2bCustomerName.toLowerCase().includes(term) || r.b2bCustomerCode.toLowerCase().includes(term)
      );
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
  }, [rows, search, typeFilter, statusFilter, sortKey, sortDirection]);

  async function toggleActive(row: B2BCustomer) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setB2BCustomerActive(row.b2bCustomerId, !row.isActive, userKey);
      await loadAll();
      toast.success(row.isActive ? "Customer deactivated" : "Customer activated");
    } catch (error) {
      toast.error(error instanceof B2BCustomersApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: B2BCustomer) {
    try {
      await deleteB2BCustomer(row.b2bCustomerId);
      await loadAll();
      toast.success("Customer deleted");
    } catch (error) {
      toast.error(error instanceof B2BCustomersApiError ? error.message : "Could not delete customer");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="B2B Customer"
        description="Corporate and Sub-Agent accounts — credit terms, account manager, and status in one place."
        actions={
          canCreate ? (
            <Button nativeButton={false} render={<Link href={paths.create} />}>
              <Plus className="h-4 w-4" />
              Add B2B customer
            </Button>
          ) : undefined
        }
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}

      {!loadError && (
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
          <Select value={typeFilter ? String(typeFilter) : "all"} onValueChange={(v) => setTypeFilter(v === "all" ? null : Number(v))}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {types.map((t) => (
                <SelectItem key={t.b2bCustomerTypeId} value={String(t.b2bCustomerTypeId)}>
                  {t.customerTypeName}
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
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading B2B customers…</p>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Landmark}
            tone="primary"
            heading="No B2B customers yet"
            description="Add your first Corporate or Sub-Agent account."
            size="compact"
          />
        ) : visible.length === 0 ? (
          <EmptyState icon={Search} tone="muted" heading="No matching customers" description="Try a different search or filter." size="compact" />
        ) : (
          <Table className="table-fixed border-collapse text-xs [&_th]:h-auto [&_th]:whitespace-normal [&_td]:whitespace-normal [&_td]:break-words">
            <TableHeader>
              <TableRow>
                <SortableTableHead sortKey="b2bCustomerCode" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} className="w-[12%] px-2 py-1.5">
                  Code
                </SortableTableHead>
                <SortableTableHead sortKey="b2bCustomerName" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} className="w-[20%] px-2 py-1.5">
                  Name
                </SortableTableHead>
                <TableHead className="w-[12%] px-2 py-1.5">Type</TableHead>
                <TableHead className="w-[14%] px-2 py-1.5">Category</TableHead>
                <TableHead className="w-[12%] px-2 py-1.5">Country</TableHead>
                <TableHead className="w-[10%] px-2 py-1.5">Currency</TableHead>
                <TableHead className="w-[10%] px-2 py-1.5">Status</TableHead>
                <TableHead className="w-[10%] px-2 py-1.5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => {
                const rowPaths = b2bCustomerPaths(role, row.b2bCustomerId);
                return (
                  <TableRow key={row.b2bCustomerId}>
                    <TableCell className="px-2 py-1.5 font-mono font-medium leading-tight">{row.b2bCustomerCode}</TableCell>
                    <TableCell className="px-2 py-1.5 font-medium leading-tight">{row.b2bCustomerName}</TableCell>
                    <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.customerTypeName ?? "—"}</TableCell>
                    <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.categoryName ?? "—"}</TableCell>
                    <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.countryName ?? "—"}</TableCell>
                    <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.currencyCode ?? "—"}</TableCell>
                    <TableCell className="px-2 py-1.5">
                      <Badge variant={row.isActive ? "default" : "secondary"} className="px-1.5 py-0 text-[11px]">
                        {row.statusName ?? (row.isActive ? "active" : "inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Tooltip>
                          <TooltipTrigger
                            nativeButton={false}
                            render={
                              <Link
                                href={rowPaths.view}
                                aria-label="View"
                                className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
                              />
                            }
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </TooltipTrigger>
                          <TooltipContent>View</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger
                            nativeButton={false}
                            render={
                              <Link
                                href={rowPaths.details}
                                aria-label="Details"
                                className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
                              />
                            }
                          >
                            <ClipboardList className="h-3.5 w-3.5" />
                          </TooltipTrigger>
                          <TooltipContent>Details</TooltipContent>
                        </Tooltip>
                        {canEdit && (
                          <>
                            <Tooltip>
                              <TooltipTrigger
                                nativeButton={false}
                                render={
                                  <Link
                                    href={rowPaths.edit}
                                    aria-label="Edit"
                                    className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
                                  />
                                }
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </TooltipTrigger>
                              <TooltipContent>Edit</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={row.isActive ? "Deactivate" : "Activate"}
                                    onClick={() => void toggleActive(row)}
                                  />
                                }
                              >
                                {row.isActive ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                              </TooltipTrigger>
                              <TooltipContent>{row.isActive ? "Deactivate" : "Activate"}</TooltipContent>
                            </Tooltip>
                          </>
                        )}
                        {canDelete && (
                          <Tooltip>
                            <TooltipTrigger
                              render={<Button variant="ghost" size="icon-sm" aria-label="Delete" onClick={() => void removeRow(row)} />}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

export default function B2BCustomerMasterPage() {
  return <AccessGate module="b2bCustomer">{(roleDef) => <CustomerList roleDef={roleDef} />}</AccessGate>;
}
