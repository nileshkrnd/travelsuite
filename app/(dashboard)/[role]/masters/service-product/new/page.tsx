"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { ServiceProductForm } from "@/components/masters/ServiceProductForm";
import type { RoleDef } from "@/types";

function NewProduct({ roleDef }: { roleDef: RoleDef }) {
  const { role } = useParams<{ role: string }>();

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip p-6">
      <PageHeader
        title="Add product"
        description="Create a sellable product — classify it, then manage options, rates, and schedules from their own masters."
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href={`/${role}/masters/service-product`} />}>
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </Button>
        }
      />
      <ServiceProductForm roleDef={roleDef} />
    </div>
  );
}

export default function NewServiceProductPage() {
  return (
    <AccessGate module="serviceProduct" action="create">
      {(roleDef) => <NewProduct roleDef={roleDef} />}
    </AccessGate>
  );
}
