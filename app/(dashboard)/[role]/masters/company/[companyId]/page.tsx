"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, Pencil, GitBranch } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Branch } from "@/types";
import { useCompaniesStore } from "@/lib/store/companies.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { listCompanies } from "@/lib/services/db-companies.service";
import { listBranches } from "@/lib/services/db-branches.service";
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
  const activeTenant = useTenantStore((s) => s.tenant);
  const companies = useCompaniesStore((s) => s.companies);
  const setCompanies = useCompaniesStore((s) => s.setCompanies);
  const company = companies.find((c) => c.id === companyId && c.tenantId === tenantId);
  const canEdit = can(roleDef, "company", "edit");
  const [loading, setLoading] = useState(!company);
  const [companyBranches, setCompanyBranches] = useState<Branch[]>([]);
  const tenantKey = activeTenant.tenantKey ?? 0;

  useEffect(() => {
    if (company || tenantKey <= 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    listCompanies({ tenantId: tenantKey })
      .then((rows) => {
        if (cancelled) return;
        const others = useCompaniesStore.getState().companies.filter((c) => c.tenantKey !== tenantKey);
        setCompanies([...others, ...rows]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [company, tenantKey, setCompanies]);

  useEffect(() => {
    if (!company?.companyKey) return;
    let cancelled = false;
    listBranches({ companyId: company.companyKey })
      .then((rows) => {
        if (!cancelled) setCompanyBranches(rows);
      })
      .catch(() => {
        if (!cancelled) setCompanyBranches([]);
      });
    return () => {
      cancelled = true;
    };
  }, [company?.companyKey]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading company…</div>;
  }

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

      <Card className="max-w-2xl">
        <CardContent>
          <dl>
            <DetailRow label="Company name">{company.name}</DetailRow>
            <DetailRow label="Company code">{company.code}</DetailRow>
            <DetailRow label="Company ID">{company.companyKey}</DetailRow>
            <DetailRow label="Tenant ID">{company.tenantKey}</DetailRow>
            <DetailRow label="Address">
              {[company.address1, company.address2].filter(Boolean).join(", ") || "—"}
            </DetailRow>
            <DetailRow label="Country / City">
              {company.countryName ?? company.countryId} / {company.cityName ?? company.cityId}
            </DetailRow>
            <DetailRow label="Currency">{company.currencyCode ?? company.currencyId}</DetailRow>
            <DetailRow label="Zip / Dial">
              {company.zipCode} / +{company.countryDialCode}
            </DetailRow>
            <DetailRow label="Contact">{company.contactPerson || "—"}</DetailRow>
            <DetailRow label="Phone / Email">
              {company.contactNumber || "—"} / {company.emailAddress || "—"}
            </DetailRow>
            <DetailRow label="Status">
              <Badge variant={company.isActive ? "default" : "secondary"}>
                {company.isActive ? "active" : "inactive"}
              </Badge>
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
                    {branch.cityName ?? branch.cityId}, {branch.countryName ?? branch.countryId}
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
