"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { CompanyForm } from "@/components/masters/CompanyForm";

function NewCompany() {
  const { role } = useParams<{ role: string }>();

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip p-6">
      <PageHeader
        title="Add company"
        description="Register a new company under your tenant."
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href={`/${role}/masters/company`} />}>
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </Button>
        }
      />
      <CompanyForm />
    </div>
  );
}

export default function NewCompanyPage() {
  return (
    <AccessGate module="company" action="create">
      {() => <NewCompany />}
    </AccessGate>
  );
}
