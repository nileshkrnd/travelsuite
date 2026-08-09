"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { SupplierPropertyGrantForm } from "@/components/masters/SupplierPropertyGrantForm";

function NewPropertySupplier() {
  const { role } = useParams<{ role: string }>();

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip p-6">
      <PageHeader
        title="Link properties to a supplier"
        description="Pick a supplier, filter properties by country and city, then multi-select which ones they service."
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href={`/${role}/masters/property-supplier`} />}>
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </Button>
        }
      />
      <SupplierPropertyGrantForm />
    </div>
  );
}

export default function NewPropertySupplierPage() {
  return (
    <AccessGate module="propertySupplier" action="create">
      {() => <NewPropertySupplier />}
    </AccessGate>
  );
}
