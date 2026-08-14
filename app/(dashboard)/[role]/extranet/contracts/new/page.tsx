"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { PropertyContractForm } from "@/components/masters/PropertyContractForm";

function NewPropertyContract() {
  const { role } = useParams<{ role: string }>();

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip p-6">
      <PageHeader
        title="New property contract"
        description="Filter by country and city to find the property, then attach the supplier's signed contract."
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href={`/${role}/extranet/contracts`} />}>
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </Button>
        }
      />
      <PropertyContractForm />
    </div>
  );
}

export default function NewPropertyContractPage() {
  return (
    <AccessGate module="contracts" action="create">
      {() => (
        <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
          <NewPropertyContract />
        </Suspense>
      )}
    </AccessGate>
  );
}
