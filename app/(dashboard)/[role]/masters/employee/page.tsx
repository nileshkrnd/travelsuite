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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { listCompanies } from "@/lib/services/db-companies.service";
import {
  listEmployees,
  setEmployeeActive,
  deleteEmployee,
  EmployeesApiError,
} from "@/lib/services/employees.service";
import { can } from "@/config/permissions";
import { initials } from "@/lib/utils";
import type { Company, Employee, RoleDef } from "@/types";
import { employeeDisplayName } from "@/types/employee";

type SortKey = "name" | "employeeNumber" | "email" | "status";

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
  const activeTenant = useTenantStore((s) => s.tenant);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
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

  async function refresh() {
    if (tenantKey <= 0) {
      setEmployees([]);
      setCompanies([]);
      return;
    }
    const [employeeRows, companyRows] = await Promise.all([
      listEmployees({ tenantId: tenantKey }),
      listCompanies({ tenantId: tenantKey, activeOnly: true }),
    ]);
    setEmployees(employeeRows);
    setCompanies(companyRows);
  }

  useEffect(() => {
    if (tenantKey <= 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    refresh()
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof EmployeesApiError ? err.message : "Failed to load employees");
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

  const companyName = (companyId: number) =>
    companies.find((c) => c.companyKey === companyId)?.name ??
    employees.find((e) => e.companyId === companyId)?.companyName ??
    "—";

  const visibleEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = employees;
    if (companyFilter !== "all") {
      result = result.filter((e) => String(e.companyId) === companyFilter);
    }
    if (term) {
      result = result.filter((e) => {
        const name = employeeDisplayName(e).toLowerCase();
        return (
          name.includes(term) ||
          e.employeeNumber.toLowerCase().includes(term) ||
          e.email.toLowerCase().includes(term)
        );
      });
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        if (sortKey === "name") {
          cmp = employeeDisplayName(a).localeCompare(employeeDisplayName(b));
        } else if (sortKey === "status") {
          cmp = Number(a.isActive) - Number(b.isActive);
        } else {
          cmp = a[sortKey].localeCompare(b[sortKey]);
        }
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [employees, search, companyFilter, sortKey, sortDirection]);

  const activeCount = employees.filter((e) => e.isActive).length;

  async function toggleStatus(employee: Employee) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await setEmployeeActive(employee.employeeId, !employee.isActive, actorKey);
      setEmployees((prev) => prev.map((e) => (e.employeeId === saved.employeeId ? saved : e)));
      toast.success(saved.isActive ? "Employee activated" : "Employee deactivated");
    } catch (error) {
      toast.error(error instanceof EmployeesApiError ? error.message : "Could not update employee");
    }
  }

  async function removeEmployee(employee: Employee) {
    try {
      await deleteEmployee(employee.employeeId);
      setEmployees((prev) => prev.filter((e) => e.employeeId !== employee.employeeId));
      toast.success("Employee deleted");
    } catch (error) {
      toast.error(error instanceof EmployeesApiError ? error.message : "Could not delete employee");
    }
  }

  function goToView(employee: Employee) {
    router.push(`/${role}/masters/employee/${employee.employeeId}`);
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Employee"
        description="HR records linked to company login users."
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
          <StatCard icon={CircleDashed} label="Inactive" value={employees.length - activeCount} />
        </div>
      )}

      {companies.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, number, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>
          <Select value={companyFilter} onValueChange={(v) => setCompanyFilter(v ?? "all")}>
            <SelectTrigger className="w-56">
              <SelectValue>
                {(value: string | null) =>
                  !value || value === "all" ? "All companies" : companyName(Number(value))
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All companies</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={String(c.companyKey)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Card>
        {companies.length === 0 && !loading ? (
          <EmptyState
            icon={UserCog}
            tone="muted"
            heading="Add a company first"
            description="Employees belong to a company and branch — create one under Masters → Company."
            size="compact"
          />
        ) : employees.length === 0 && !loading ? (
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
                <SortableTableHead
                  sortKey="employeeNumber"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Employee #
                </SortableTableHead>
                <TableHead>Company</TableHead>
                <TableHead>Designation</TableHead>
                <SortableTableHead sortKey="email" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Email
                </SortableTableHead>
                <SortableTableHead sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Status
                </SortableTableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleEmployees.map((employee, index) => {
                const name = employeeDisplayName(employee);
                return (
                  <TableRow
                    key={employee.employeeId}
                    onClick={() => goToView(employee)}
                    className="cursor-pointer"
                  >
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar size="sm">
                          {employee.employeeImage ? (
                            <AvatarImage src={employee.employeeImage} alt="" />
                          ) : null}
                          <AvatarFallback>{initials(name)}</AvatarFallback>
                        </Avatar>
                        <p className="truncate font-medium">{name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{employee.employeeNumber}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {employee.companyName ?? companyName(employee.companyId)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {employee.designationName ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{employee.email}</TableCell>
                    <TableCell>
                      <Badge variant={employee.isActive ? "default" : "outline"}>
                        {employee.isActive ? "active" : "inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {(canEdit || canDelete) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              render={<Link href={`/${role}/masters/employee/${employee.employeeId}`} />}
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            {canEdit && (
                              <DropdownMenuItem
                                render={
                                  <Link href={`/${role}/masters/employee/${employee.employeeId}/edit`} />
                                }
                              >
                                <Pencil className="h-4 w-4" />
                                Modify
                              </DropdownMenuItem>
                            )}
                            {canDelete && employee.isActive && (
                              <DropdownMenuItem variant="destructive" onClick={() => toggleStatus(employee)}>
                                <PowerOff className="h-4 w-4" />
                                Deactivate
                              </DropdownMenuItem>
                            )}
                            {canDelete && !employee.isActive && (
                              <DropdownMenuItem onClick={() => toggleStatus(employee)}>
                                <Power className="h-4 w-4" />
                                Reactivate
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <DropdownMenuItem variant="destructive" onClick={() => removeEmployee(employee)}>
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
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

export default function EmployeeMasterPage() {
  return <AccessGate module="employee">{(roleDef) => <EmployeeList roleDef={roleDef} />}</AccessGate>;
}
