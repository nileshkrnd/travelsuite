"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  GitBranch,
  MoreHorizontal,
  Search,
  Eye,
  Pencil,
  Power,
  PowerOff,
  CheckCircle2,
  CircleDashed,
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
import { useBranchesStore } from "@/lib/store/branches.store";
import { useCompaniesStore } from "@/lib/store/companies.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { getCountry } from "@/config/countries";
import { can } from "@/config/permissions";
import type { Branch, RoleDef } from "@/types";

type SortKey = "name" | "code" | "status" | "createdAt";

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

function BranchList({ roleDef }: { roleDef: RoleDef }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const tenantId = useTenantStore((s) => s.tenantId);
  const allBranches = useBranchesStore((s) => s.branches);
  const branches = useMemo(
    () => allBranches.filter((b) => b.tenantId === tenantId),
    [allBranches, tenantId]
  );
  const updateBranch = useBranchesStore((s) => s.updateBranch);
  const allCompanies = useCompaniesStore((s) => s.companies);
  const companies = useMemo(
    () => allCompanies.filter((c) => c.tenantId === tenantId),
    [allCompanies, tenantId]
  );
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const canCreate = can(roleDef, "branch", "create");
  const canEdit = can(roleDef, "branch", "edit");

  const companyName = (id: string) => companies.find((c) => c.id === id)?.name ?? "—";

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  const visibleBranches = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = branches;
    if (companyFilter !== "all") {
      result = result.filter((b) => b.companyId === companyFilter);
    }
    if (term) {
      result = result.filter(
        (b) => b.name.toLowerCase().includes(term) || b.code.toLowerCase().includes(term)
      );
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const cmp = a[sortKey].localeCompare(b[sortKey]);
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [branches, search, companyFilter, sortKey, sortDirection]);

  const activeCount = branches.filter((b) => b.status === "active").length;

  function toggleStatus(branch: Branch) {
    updateBranch(branch.id, { status: branch.status === "active" ? "inactive" : "active" });
  }

  function goToView(branch: Branch) {
    router.push(`/${role}/masters/branch/${branch.id}`);
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Branch"
        description="Branches within each company."
        actions={
          canCreate ? (
            <Button
              nativeButton={false}
              render={<Link href={`/${role}/masters/branch/new`} />}
              disabled={companies.length === 0}
            >
              <Plus className="h-4 w-4" />
              Add branch
            </Button>
          ) : undefined
        }
      />

      {branches.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:max-w-xl">
          <StatCard icon={GitBranch} label="Total branches" value={branches.length} />
          <StatCard icon={CheckCircle2} label="Active" value={activeCount} />
          <StatCard icon={CircleDashed} label="Inactive" value={branches.length - activeCount} />
        </div>
      )}

      {companies.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>
          <Select value={companyFilter} onValueChange={(value) => setCompanyFilter(value ?? "all")}>
            <SelectTrigger className="w-56">
              <SelectValue>
                {(value: string | null) =>
                  !value || value === "all" ? "All companies" : companyName(value)
                }
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
            icon={GitBranch}
            tone="muted"
            heading="Add a company first"
            description="Branches belong to a company — create one under Masters → Company."
            size="compact"
          />
        ) : branches.length === 0 ? (
          <EmptyState
            icon={GitBranch}
            tone="primary"
            heading="No branches yet"
            description="Add a branch to get started."
            size="compact"
          />
        ) : visibleBranches.length === 0 ? (
          <EmptyState
            icon={Search}
            tone="muted"
            heading="No matching branches"
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
                <SortableTableHead sortKey="code" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Branch code
                </SortableTableHead>
                <TableHead>Company</TableHead>
                <TableHead>Location</TableHead>
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
              {visibleBranches.map((branch, index) => (
                <TableRow key={branch.id} onClick={() => goToView(branch)} className="cursor-pointer">
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{branch.name}</TableCell>
                  <TableCell>
                    <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                      {branch.code}
                    </code>
                  </TableCell>
                  <TableCell>{companyName(branch.companyId)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {branch.city}, {getCountry(branch.country)?.name ?? branch.country}
                  </TableCell>
                  <TableCell>
                    <Badge variant={branch.status === "active" ? "default" : "secondary"} className="gap-1">
                      {branch.status === "active" ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <CircleDashed className="h-3 w-3" />
                      )}
                      {branch.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(branch.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem render={<Link href={`/${role}/masters/branch/${branch.id}`} />}>
                          <Eye className="h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        {canEdit && (
                          <>
                            <DropdownMenuItem
                              render={<Link href={`/${role}/masters/branch/${branch.id}/edit`} />}
                            >
                              <Pencil className="h-4 w-4" />
                              Modify
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleStatus(branch)}>
                              {branch.status === "active" ? (
                                <PowerOff className="h-4 w-4" />
                              ) : (
                                <Power className="h-4 w-4" />
                              )}
                              {branch.status === "active" ? "Deactivate" : "Activate"}
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

export default function BranchMasterPage() {
  return <AccessGate module="branch">{(roleDef) => <BranchList roleDef={roleDef} />}</AccessGate>;
}
