"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building, RefreshCw, Pencil } from "lucide-react";
import { toast } from "sonner";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTenantsStore } from "@/lib/store/tenants.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { can } from "@/config/permissions";
import { currencyMeta } from "@/mock/data/exchangeRates";
import { LOCALE_LABELS } from "@/config/i18n/locales";
import { getCountry } from "@/config/countries";
import type { RoleDef } from "@/types";

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 border-b border-border py-3 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2">{children}</dd>
    </div>
  );
}

function TenantView({ roleDef }: { roleDef: RoleDef }) {
  const { role, tenantId } = useParams<{ role: string; tenantId: string }>();
  const router = useRouter();
  const tenants = useTenantsStore((s) => s.tenants);
  const setTenant = useTenantStore((s) => s.setTenant);
  const tenant = tenants.find((t) => t.id === tenantId);
  const canEdit = can(roleDef, "tenantProfile", "edit");

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

  function switchToTenant() {
    setTenant(tenant!.id);
    toast.success(`Switched to ${tenant!.branding.name}`);
    router.push(`/${role}/masters/company`);
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={tenant.branding.name}
        description="Tenant details."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href={`/${role}/masters/tenant`} />}>
              <ArrowLeft className="h-4 w-4" />
              Back to list
            </Button>
            <Button variant="outline" onClick={switchToTenant}>
              <RefreshCw className="h-4 w-4" />
              Switch to this tenant
            </Button>
            {canEdit && (
              <Button nativeButton={false} render={<Link href={`/${role}/masters/tenant/${tenant.id}/edit`} />}>
                <Pencil className="h-4 w-4" />
                Modify
              </Button>
            )}
          </div>
        }
      />

      <Card className="max-w-xl">
        <CardContent className="space-y-6">
          <div>
            <h3 className="mb-1 text-sm font-semibold text-foreground">Basic details</h3>
            <dl>
              <DetailRow label="Tenant name">{tenant.branding.name}</DetailRow>
              <DetailRow label="Holding group">{tenant.groupName}</DetailRow>
              <DetailRow label="Tenant code">{tenant.slug}</DetailRow>
              <DetailRow label="Status">
                <Badge variant={tenant.status === "active" ? "default" : "secondary"}>{tenant.status}</Badge>
              </DetailRow>
              <DetailRow label="Brand color">
                <div className="flex items-center gap-2">
                  <span
                    className="h-4 w-4 shrink-0 rounded-full ring-1 ring-border"
                    style={{ backgroundColor: tenant.branding.primaryColor }}
                    aria-hidden
                  />
                  {tenant.branding.primaryColor}
                </div>
              </DetailRow>
              <DetailRow label="Currency">
                {tenant.defaultCurrency} — {currencyMeta[tenant.defaultCurrency].name}
              </DetailRow>
              <DetailRow label="Default language">
                {LOCALE_LABELS[tenant.defaultLocale] ?? tenant.defaultLocale}
              </DetailRow>
              <DetailRow label="Registered">{new Date(tenant.createdAt).toLocaleDateString()}</DetailRow>
            </dl>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="mb-1 text-sm font-semibold text-foreground">Address</h3>
            <dl>
              <DetailRow label="Address">
                {tenant.address.line1}
                {tenant.address.line2 ? `, ${tenant.address.line2}` : ""}
              </DetailRow>
              <DetailRow label="Country">{getCountry(tenant.address.country)?.name ?? tenant.address.country}</DetailRow>
              <DetailRow label="City">{tenant.address.city}</DetailRow>
              <DetailRow label="Zip / postal code">{tenant.address.zip}</DetailRow>
              <DetailRow label="Timezone">{tenant.address.timezone}</DetailRow>
            </dl>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="mb-1 text-sm font-semibold text-foreground">Contact</h3>
            <dl>
              <DetailRow label="Email">{tenant.contact.email}</DetailRow>
              <DetailRow label="Phone">
                {tenant.contact.dialCode} {tenant.contact.phone}
              </DetailRow>
            </dl>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TenantViewPage() {
  return <AccessGate module="tenantProfile">{(roleDef) => <TenantView roleDef={roleDef} />}</AccessGate>;
}
