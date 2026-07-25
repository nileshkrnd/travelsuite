"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { TenantForm } from "@/components/masters/TenantForm";

function NewTenant() {
  const { role } = useParams<{ role: string }>();

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Register tenant"
        description="Set up a new organization on Klyra."
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href={`/${role}/masters/tenant`} />}>
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </Button>
        }
      />
      <TenantForm />
    </div>
  );
}

export default function NewTenantPage() {
  return <AccessGate module="tenantProfile" action="create">{() => <NewTenant />}</AccessGate>;
}
