"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
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
import { useSessionStore } from "@/lib/store/session.store";
import { useBranchesStore } from "@/lib/store/branches.store";
import { useCompaniesStore } from "@/lib/store/companies.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { listBranches, setBranchActive, BranchesApiError } from "@/lib/services/db-branches.service";
import { listCompanies } from "@/lib/services/db-companies.service";
import { contrastForeground } from "@/lib/color";
import { initials } from "@/lib/utils";
import { can } from "@/config/permissions";
import type { Branch, RoleDef } from "@/types";

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

function BranchList({ roleDef }: { roleDef: RoleDef }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const accentColor = useTenantStore((s) => s.tenant.branding.primaryColor);
  const allBranches = useBranchesStore((s) => s.branches);
  const setBranches = useBranchesStore((s) => s.setBranches);
  const upsertBranch = useBranchesStore((s) => s.upsertBranch);
  const companies = useCompaniesStore((s) => s.companies);
  const setCompanies = useCompaniesStore((s) => s.setCompanies);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const canCreate = can(roleDef, "branch", "create");
  const canEdit = can(roleDef, "branch", "edit");
  const actorKey = sessionUser?.userKey ?? 0;
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;

  const branches = useMemo(
    () => allBranches.filter((b) => b.tenantKey === tenantKey),
    [allBranches, tenantKey]
  );
  const tenantCompanies = useMemo(
    () => companies.filter((c) => c.tenantKey === tenantKey),
    [companies, tenantKey]
  );
  const companyName = (companyId: string) => companies.find((c) => c.id === companyId)?.name ?? "—";

  useEffect(() => {
    if (tenantKey <= 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([listBranches({ tenantId: tenantKey }), listCompanies({ tenantId: tenantKey })])
      .then(([branchRows, companyRows]) => {
        if (cancelled) return;
        const otherBranches = useBranchesStore.getState().branches.filter((b) => b.tenantKey !== tenantKey);
        setBranches([...otherBranches, ...branchRows]);
        const otherCompanies = useCompaniesStore.getState().companies.filter((c) => c.tenantKey !== tenantKey);
        setCompanies([...otherCompanies, ...companyRows]);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof BranchesApiError ? err.message : "Failed to load branches");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantKey, setBranches, setCompanies]);

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
      result = result.filter((b) => b.name.toLowerCase().includes(term));
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const cmp = a[sortKey].localeCompare(b[sortKey]);
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [branches, search, companyFilter, sortKey, sortDirection]);

  const activeCount = branches.filter((b) => b.isActive).length;

  async function toggleStatus(branch: Branch) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await setBranchActive(branch.branchKey, !branch.isActive, actorKey);
      upsertBranch(saved);
      toast.success(saved.isActive ? "Branch activated" : "Branch deactivated");
    } catch (error) {
      toast.error(error instanceof BranchesApiError ? error.message : "Could not update branch");
    }
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
              disabled={tenantCompanies.length === 0}
            >
              <Plus className="h-4 w-4" />
              Add branch
            </Button>
          ) : undefined
        }
      />

      {loading && <p className="text-sm text-muted-foreground">Loading branches…</p>}

      {branches.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:max-w-xl">
          <StatCard icon={GitBranch} label="Total branches" value={branches.length} />
          <StatCard icon={CheckCircle2} label="Active" value={activeCount} />
          <StatCard icon={CircleDashed} label="Inactive" value={branches.length - activeCount} />
        </div>
      )}

      {tenantCompanies.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>
          <Select value={companyFilter} onValueChange={(v) => setCompanyFilter(v ?? "all")}>
            <SelectTrigger className="w-56">
              <SelectValue>
                {(value: string | null) => (!value || value === "all" ? "All companies" : companyName(value))}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All companies</SelectItem>
              {tenantCompanies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Card>
        {!loading && tenantCompanies.length === 0 ? (
          <EmptyState
            icon={GitBranch}
            tone="muted"
            heading="Add a company first"
            description="Branches belong to a company — create one under Masters → Company."
            size="compact"
          />
        ) : !loading && branches.length === 0 ? (
          <EmptyState
            icon={GitBranch}
            tone="primary"
            heading="No branches yet"
            description="Add a branch to get started."
            size="compact"
          />
        ) : visibleBranches.length === 0 && !loading ? (
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
                <TableHead>Type</TableHead>
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
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold"
                        style={{ backgroundColor: accentColor, color: contrastForeground(accentColor) }}
                        aria-hidden
                      >
                        {initials(branch.name)}
                      </div>
                      <span className="font-medium">{branch.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{branch.branchTypeName ?? "—"}</TableCell>
                  <TableCell>{companyName(branch.companyId)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {branch.cityName ?? branch.cityId}, {branch.countryName ?? branch.countryId}
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
                            <DropdownMenuItem render={<Link href={`/${role}/masters/branch/${branch.id}/edit`} />}>
                              <Pencil className="h-4 w-4" />
                              Modify
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void toggleStatus(branch)}>
                              {branch.isActive ? (
                                <PowerOff className="h-4 w-4" />
                              ) : (
                                <Power className="h-4 w-4" />
                              )}
                              {branch.isActive ? "Deactivate" : "Activate"}
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
