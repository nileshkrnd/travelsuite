"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Plus,
  Building2,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSessionStore } from "@/lib/store/session.store";
import { useCompaniesStore } from "@/lib/store/companies.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { listCompanies, setCompanyActive, CompaniesApiError } from "@/lib/services/db-companies.service";
import { contrastForeground } from "@/lib/color";
import { initials } from "@/lib/utils";
import { can } from "@/config/permissions";
import type { Company, RoleDef } from "@/types";

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

function CompanyList({ roleDef }: { roleDef: RoleDef }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const allCompanies = useCompaniesStore((s) => s.companies);
  const setCompanies = useCompaniesStore((s) => s.setCompanies);
  const upsertCompany = useCompaniesStore((s) => s.upsertCompany);
  const accentColor = useTenantStore((s) => s.tenant.branding.primaryColor);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const canCreate = can(roleDef, "company", "create");
  const canEdit = can(roleDef, "company", "edit");
  const actorKey = sessionUser?.userKey ?? 0;
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;
  const companies = useMemo(
    () => allCompanies.filter((c) => c.tenantKey === tenantKey),
    [allCompanies, tenantKey]
  );

  useEffect(() => {
    if (tenantKey <= 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    listCompanies({ tenantId: tenantKey })
      .then((rows) => {
        if (cancelled) return;
        const others = useCompaniesStore.getState().companies.filter((c) => c.tenantKey !== tenantKey);
        setCompanies([...others, ...rows]);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof CompaniesApiError ? err.message : "Failed to load companies");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantKey, setCompanies]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  const visibleCompanies = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = companies;
    if (term) {
      result = result.filter(
        (c) => c.name.toLowerCase().includes(term) || c.code.toLowerCase().includes(term)
      );
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const cmp = a[sortKey].localeCompare(b[sortKey]);
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [companies, search, sortKey, sortDirection]);

  const activeCount = companies.filter((c) => c.isActive).length;

  async function toggleStatus(company: Company) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await setCompanyActive(company.companyKey, !company.isActive, actorKey);
      upsertCompany(saved);
      toast.success(saved.isActive ? "Company activated" : "Company deactivated");
    } catch (error) {
      toast.error(error instanceof CompaniesApiError ? error.message : "Could not update company");
    }
  }

  function goToView(company: Company) {
    router.push(`/${role}/masters/company/${company.id}`);
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Company"
        description="Companies operating under your tenant (TenantID scoped)."
        actions={
          canCreate ? (
            <Button nativeButton={false} render={<Link href={`/${role}/masters/company/new`} />}>
              <Plus className="h-4 w-4" />
              Add company
            </Button>
          ) : undefined
        }
      />

      {loading && <p className="text-sm text-muted-foreground">Loading companies…</p>}

      {companies.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:max-w-xl">
          <StatCard icon={Building2} label="Total companies" value={companies.length} />
          <StatCard icon={CheckCircle2} label="Active" value={activeCount} />
          <StatCard icon={CircleDashed} label="Inactive" value={companies.length - activeCount} />
        </div>
      )}

      {companies.length > 0 && (
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
        {!loading && companies.length === 0 ? (
          <EmptyState
            icon={Building2}
            tone="primary"
            heading="No companies yet"
            description="Add your first company to get started."
            size="compact"
          />
        ) : visibleCompanies.length === 0 && !loading ? (
          <EmptyState
            icon={Search}
            tone="muted"
            heading="No matching companies"
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
                <SortableTableHead sortKey="code" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Company code
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
              {visibleCompanies.map((company, index) => (
                <TableRow key={company.id} onClick={() => goToView(company)} className="cursor-pointer">
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold"
                        style={{ backgroundColor: accentColor, color: contrastForeground(accentColor) }}
                        aria-hidden
                      >
                        {initials(company.name)}
                      </div>
                      <span className="font-medium">{company.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                      {company.code}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge variant={company.status === "active" ? "default" : "secondary"} className="gap-1">
                      {company.status === "active" ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <CircleDashed className="h-3 w-3" />
                      )}
                      {company.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(company.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem render={<Link href={`/${role}/masters/company/${company.id}`} />}>
                          <Eye className="h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        {canEdit && (
                          <>
                            <DropdownMenuItem
                              render={<Link href={`/${role}/masters/company/${company.id}/edit`} />}
                            >
                              <Pencil className="h-4 w-4" />
                              Modify
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void toggleStatus(company)}>
                              {company.isActive ? (
                                <PowerOff className="h-4 w-4" />
                              ) : (
                                <Power className="h-4 w-4" />
                              )}
                              {company.isActive ? "Deactivate" : "Activate"}
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

export default function CompanyMasterPage() {
  return <AccessGate module="company">{(roleDef) => <CompanyList roleDef={roleDef} />}</AccessGate>;
}
