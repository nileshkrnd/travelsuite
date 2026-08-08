"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { PropertyForm } from "@/components/masters/PropertyForm";
import type { RoleDef } from "@/types";

function NewProperty({ roleDef }: { roleDef: RoleDef }) {
  const { role } = useParams<{ role: string }>();

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip p-6">
      <PageHeader
        title="Add property"
        description="Create a hotel or property with full identity, classification and address details."
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href={`/${role}/masters/property`} />}>
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </Button>
        }
      />
      <PropertyForm roleDef={roleDef} />
    </div>
  );
}

export default function NewPropertyPage() {
  return (
    <AccessGate module="property" action="create">
      {(roleDef) => <NewProperty roleDef={roleDef} />}
    </AccessGate>
  );
}
