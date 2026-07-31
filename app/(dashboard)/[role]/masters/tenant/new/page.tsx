"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { SAAS_BRAND } from "@/config/saasBrand";
import { Button } from "@/components/ui/button";
import { TenantForm } from "@/components/masters/TenantForm";
import { useHydrateTenants } from "@/lib/hooks/useHydrateTenants";

function NewTenant() {
  const { role } = useParams<{ role: string }>();
  const { loading, error } = useHydrateTenants();

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading tenant registry…</div>;
  }

  if (error) {
    return <div className="p-6 text-sm text-destructive">{error}</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Register tenant"
        description={`Set up a new organization on ${SAAS_BRAND.name}.`}
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
