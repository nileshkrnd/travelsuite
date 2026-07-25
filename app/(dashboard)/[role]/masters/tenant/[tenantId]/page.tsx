"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building, RefreshCw, Pencil, UserPlus, Shield } from "lucide-react";
import { toast } from "sonner";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateTenantAdminDialog } from "@/components/masters/CreateTenantAdminDialog";
import { useTenantsStore } from "@/lib/store/tenants.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { useSessionStore } from "@/lib/store/session.store";
import { useUsersStore } from "@/lib/store/users.store";
import { useHydrateTenants } from "@/lib/hooks/useHydrateTenants";
import { useHydrateReferenceMasters } from "@/lib/hooks/useReferenceMasters";
import { useReferenceStore } from "@/lib/store/reference.store";
import { listUsers, UsersApiError } from "@/lib/services/db-users.service";
import { can } from "@/config/permissions";
import { LOCALE_LABELS } from "@/config/i18n/locales";
import { UserType, type RoleDef, type User } from "@/types";

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
  const sessionUser = useSessionStore((s) => s.user);
  const actorUsers = useUsersStore((s) => s.users);
  const { loading, error } = useHydrateTenants();
  const { loading: referenceLoading } = useHydrateReferenceMasters();
  const countries = useReferenceStore((s) => s.countries);
  const currencies = useReferenceStore((s) => s.currencies);
  const tenant = tenants.find((t) => t.id === tenantId);
  const canEdit = can(roleDef, "tenantProfile", "edit");
  const canCreateAdmin = can(roleDef, "users", "create");

  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [tenantAdmins, setTenantAdmins] = useState<User[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);

  const actorKey = sessionUser
    ? (actorUsers.find((u) => u.id === sessionUser.id)?.userKey ?? sessionUser.userKey ?? 0)
    : 0;

  useEffect(() => {
    if (!tenant?.tenantKey) return;
    let cancelled = false;
    setAdminsLoading(true);
    listUsers({ tenantId: tenant.tenantKey, companyId: 0 })
      .then((rows) => {
        if (cancelled) return;
        setTenantAdmins(rows.filter((u) => u.userTypeId === UserType.TenantAdmin || u.companyKey === 0));
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof UsersApiError ? err.message : "Could not load Tenant Admins");
        }
      })
      .finally(() => {
        if (!cancelled) setAdminsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenant?.tenantKey]);

  if (loading || referenceLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading tenant…</div>;
  }

  if (!tenant) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Building}
          tone="muted"
          heading="Tenant not found"
          description={error ?? "This tenant may have been removed."}
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

  function handleAdminCreated(user: User) {
    setTenantAdmins((prev) => {
      if (prev.some((u) => u.id === user.id)) return prev;
      return [...prev, user].sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={tenant.branding.name}
        description="Tenant details."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href={`/${role}/masters/tenant`} />}>
              <ArrowLeft className="h-4 w-4" />
              Back to list
            </Button>
            <Button variant="outline" onClick={switchToTenant}>
              <RefreshCw className="h-4 w-4" />
              Switch to this tenant
            </Button>
            {canCreateAdmin && (
              <Button onClick={() => setAdminDialogOpen(true)}>
                <UserPlus className="h-4 w-4" />
                Create Tenant Admin
              </Button>
            )}
            {canEdit && (
              <Button nativeButton={false} render={<Link href={`/${role}/masters/tenant/${tenant.id}/edit`} />}>
                <Pencil className="h-4 w-4" />
                Modify
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card>
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
                  {(() => {
                    const meta = currencies.find((c) => c.code === tenant.defaultCurrency);
                    return meta ? `${meta.code} — ${meta.name}` : tenant.defaultCurrency;
                  })()}
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
                <DetailRow label="Country">
                  {countries.find((c) => c.code === tenant.address.country)?.name ?? tenant.address.country}
                </DetailRow>
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

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Shield className="h-4 w-4 text-primary" />
                  Tenant Admin
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create one Tenant Admin and share login details so they can set up companies, branches, and
                  employees.
                </p>
              </div>
              {canCreateAdmin && (
                <Button size="sm" onClick={() => setAdminDialogOpen(true)}>
                  <UserPlus className="h-4 w-4" />
                  Create
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Login: <code className="rounded bg-muted px-1.5 py-0.5 font-mono">/{tenant.slug}/login</code>
            </p>

            {adminsLoading ? (
              <p className="text-sm text-muted-foreground">Loading Tenant Admins…</p>
            ) : tenantAdmins.length === 0 ? (
              <EmptyState
                icon={Shield}
                tone="muted"
                heading="No Tenant Admin yet"
                description="Create an account and share the username and temporary password with the tenant."
                size="compact"
                action={
                  canCreateAdmin ? (
                    <Button size="sm" onClick={() => setAdminDialogOpen(true)}>
                      <UserPlus className="h-4 w-4" />
                      Create Tenant Admin
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {tenantAdmins.map((admin) => (
                  <li key={admin.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{admin.name}</p>
                      <p className="truncate text-muted-foreground">{admin.username}</p>
                    </div>
                    <Badge variant={admin.isActive ? "default" : "secondary"}>
                      {admin.isActive ? "active" : "inactive"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {canCreateAdmin && (
        <CreateTenantAdminDialog
          open={adminDialogOpen}
          onOpenChange={setAdminDialogOpen}
          tenant={tenant}
          createdBy={actorKey}
          onCreated={handleAdminCreated}
        />
      )}
    </div>
  );
}

export default function TenantViewPage() {
  return <AccessGate module="tenantProfile">{(roleDef) => <TenantView roleDef={roleDef} />}</AccessGate>;
}
