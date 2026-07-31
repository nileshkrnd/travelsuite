"use client";

import { useSessionStore } from "@/lib/store/session.store";
import { isPlatformMode, useTenantStore } from "@/lib/store/tenant.store";
import { DEFAULT_BRANDING } from "@/mock/data/tenants";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import type { TenantBranding } from "@/types";

/**
 * Logo / favicon branding for chrome:
 * - Super Admin (and platform mode / signed-out preview) → Al Asmakh Nexus brand assets
 * - Tenant Admin and other roles → their tenant branding
 */
export function useChromeBranding(): TenantBranding {
  const user = useSessionStore((s) => s.user);
  const tenant = useTenantStore((s) => s.tenant);
  const tenantId = useTenantStore((s) => s.tenantId);

  if (!user || user.roleId === SUPER_ADMIN_ROLE_ID || isPlatformMode(tenantId)) {
    return DEFAULT_BRANDING;
  }

  return tenant.branding;
}
