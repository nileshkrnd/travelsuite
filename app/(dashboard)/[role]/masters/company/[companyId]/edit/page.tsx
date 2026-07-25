"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { CompanyForm } from "@/components/masters/CompanyForm";
import { useCompaniesStore } from "@/lib/store/companies.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { listCompanies } from "@/lib/services/db-companies.service";

function EditCompany() {
  const { role, companyId } = useParams<{ role: string; companyId: string }>();
  const companies = useCompaniesStore((s) => s.companies);
  const setCompanies = useCompaniesStore((s) => s.setCompanies);
  const activeTenant = useTenantStore((s) => s.tenant);
  const company = companies.find((c) => c.id === companyId);
  const [loading, setLoading] = useState(!company);
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
        title={`Edit ${company.name}`}
        description="Update this company's details."
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/${role}/masters/company/${company.id}`} />}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to details
          </Button>
        }
      />
      <CompanyForm company={company} />
    </div>
  );
}

export default function EditCompanyPage() {
  return (
    <AccessGate module="company" action="edit">
      {() => <EditCompany />}
    </AccessGate>
  );
}
