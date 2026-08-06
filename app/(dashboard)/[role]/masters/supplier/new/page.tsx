"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { SupplierCreateForm } from "@/components/masters/SupplierCreateForm";

function NewSupplier() {
  const { role } = useParams<{ role: string }>();

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip p-6">
      <PageHeader
        title="Add supplier"
        description="Standard fields for onboarding a hotelier, DMC, transport company, or activity provider."
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href={`/${role}/masters/supplier`} />}>
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </Button>
        }
      />
      <SupplierCreateForm />
    </div>
  );
}

export default function NewSupplierPage() {
  return (
    <AccessGate module="supplier" action="create">
      {() => <NewSupplier />}
    </AccessGate>
  );
}
