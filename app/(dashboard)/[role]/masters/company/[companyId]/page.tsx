"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, Pencil, GitBranch } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCompaniesStore } from "@/lib/store/companies.store";
import { useBranchesStore } from "@/lib/store/branches.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { getCountry } from "@/config/countries";
import { can } from "@/config/permissions";
import type { RoleDef } from "@/types";

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 border-b border-border py-3 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2">{children}</dd>
    </div>
  );
}

function CompanyView({ roleDef }: { roleDef: RoleDef }) {
  const { role, companyId } = useParams<{ role: string; companyId: string }>();
  const tenantId = useTenantStore((s) => s.tenantId);
  const companies = useCompaniesStore((s) => s.companies);
  const branches = useBranchesStore((s) => s.branches);
  const company = companies.find((c) => c.id === companyId && c.tenantId === tenantId);
  const canEdit = can(roleDef, "company", "edit");

  if (!company) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Building2}
          tone="muted"
          heading="Company not found"
          description="This company may have been removed."
          action={
            <Button nativeButton={false} render={<Link href={`/${role}/masters/company`} />}>
              Back to list
            </Button>
          }
        />
      </div>
    );
  }

  const companyBranches = branches.filter((b) => b.companyId === company.id);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={company.name}
        description="Company details."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href={`/${role}/masters/company`} />}>
              <ArrowLeft className="h-4 w-4" />
              Back to list
            </Button>
            {canEdit && (
              <Button nativeButton={false} render={<Link href={`/${role}/masters/company/${company.id}/edit`} />}>
                <Pencil className="h-4 w-4" />
                Modify
              </Button>
            )}
          </div>
        }
      />

      <Card className="max-w-xl">
        <CardContent>
          <dl>
            <DetailRow label="Company name">{company.name}</DetailRow>
            <DetailRow label="Company code">{company.code}</DetailRow>
            <DetailRow label="Status">
              <Badge variant={company.status === "active" ? "default" : "secondary"}>{company.status}</Badge>
            </DetailRow>
            <DetailRow label="Registered">{new Date(company.createdAt).toLocaleDateString()}</DetailRow>
          </dl>
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardContent>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <GitBranch className="h-4 w-4 text-muted-foreground" />
              Branches ({companyBranches.length})
            </h3>
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/${role}/masters/branch`} />}>
              View all branches
            </Button>
          </div>
          {companyBranches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No branches under this company yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {companyBranches.map((branch) => (
                <li key={branch.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{branch.name}</span>
                  <span className="text-muted-foreground">
                    {branch.city}, {getCountry(branch.country)?.name ?? branch.country}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function CompanyViewPage() {
  return <AccessGate module="company">{(roleDef) => <CompanyView roleDef={roleDef} />}</AccessGate>;
}
