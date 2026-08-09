"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { SupplierPropertyAccessForm } from "@/components/masters/SupplierPropertyAccessForm";

function NewSupplierPropertyAccess() {
  const { role } = useParams<{ role: string }>();

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip p-6">
      <PageHeader
        title="Grant rate access"
        description="Give a supplier's portal user rate management access to one of their linked properties."
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/${role}/masters/supplier-property-access`} />}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </Button>
        }
      />
      <SupplierPropertyAccessForm />
    </div>
  );
}

export default function NewSupplierPropertyAccessPage() {
  return (
    <AccessGate module="supplierPropertyAccess" action="create">
      {() => <NewSupplierPropertyAccess />}
    </AccessGate>
  );
}
