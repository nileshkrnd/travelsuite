"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { CompanyForm } from "@/components/masters/CompanyForm";
import { useCompaniesStore } from "@/lib/store/companies.store";

function EditCompany() {
  const { role, companyId } = useParams<{ role: string; companyId: string }>();
  const companies = useCompaniesStore((s) => s.companies);
  const company = companies.find((c) => c.id === companyId);

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
