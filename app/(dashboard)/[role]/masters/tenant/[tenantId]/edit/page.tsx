"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { TenantForm } from "@/components/masters/TenantForm";
import { useTenantsStore } from "@/lib/store/tenants.store";

function EditTenant() {
  const { role, tenantId } = useParams<{ role: string; tenantId: string }>();
  const tenants = useTenantsStore((s) => s.tenants);
  const tenant = tenants.find((t) => t.id === tenantId);

  if (!tenant) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Building}
          tone="muted"
          heading="Tenant not found"
          description="This tenant may have been removed."
          action={
            <Button nativeButton={false} render={<Link href={`/${role}/masters/tenant`} />}>
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
        title={`Edit ${tenant.branding.name}`}
        description="Update this tenant's details."
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/${role}/masters/tenant/${tenant.id}`} />}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to details
          </Button>
        }
      />
      <TenantForm tenant={tenant} />
    </div>
  );
}

export default function EditTenantPage() {
  return <AccessGate module="tenantProfile" action="edit">{() => <EditTenant />}</AccessGate>;
}
