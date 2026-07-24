"use client";

import { useEffect } from "react";
import { useTenantStore } from "@/lib/store/tenant.store";
import { useTenantsStore } from "@/lib/store/tenants.store";
import { LoginForm } from "./LoginForm";
import { UnknownTenant } from "./UnknownTenant";

/**
 * Resolves the tenant from the URL against the live tenant registry (client-side,
 * since Super-Admin-registered tenants only exist in the persisted zustand store —
 * a server component can't see them), syncs the global tenant store, and renders
 * the locked-tenant login form.
 */
export function TenantScopedLogin({ tenantSlug }: { tenantSlug: string }) {
  const setTenant = useTenantStore((s) => s.setTenant);
  const tenants = useTenantsStore((s) => s.tenants);
  const tenant = tenants.find((t) => t.slug.toLowerCase() === tenantSlug.toLowerCase());

  useEffect(() => {
    if (tenant) setTenant(tenant.id);
  }, [tenant, setTenant]);

  useEffect(() => {
    if (tenant) document.title = `Sign in — ${tenant.branding.name}`;
  }, [tenant]);

  if (!tenant) return <UnknownTenant tenantSlug={tenantSlug} />;
  return <LoginForm lockedTenant={tenant} />;
}
