"use client";

import { useEffect } from "react";
import { useSessionStore } from "@/lib/store/session.store";
import { isPlatformMode, useTenantStore } from "@/lib/store/tenant.store";
import { BrandFavicon } from "@/components/layout/BrandFavicon";
import { contrastForeground } from "@/lib/color";
import { SAAS_BRAND } from "@/config/saasBrand";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";

/**
 * Applies brand color tokens and keeps favicon in sync with chrome brand
 * (Al Asmakh Nexus for Super Admin, tenant branding for Tenant Admin).
 */
export function TenantThemeProvider({ children }: { children: React.ReactNode }) {
  const user = useSessionStore((s) => s.user);
  const tenantId = useTenantStore((s) => s.tenantId);
  const tenantPrimary = useTenantStore((s) => s.tenant.branding.primaryColor);
  const platformMode = !user || (user.roleId === SUPER_ADMIN_ROLE_ID && isPlatformMode(tenantId));
  const primaryColor = platformMode ? SAAS_BRAND.primaryColor : tenantPrimary;

  useEffect(() => {
    const root = document.documentElement;
    const foreground = contrastForeground(primaryColor);
    root.style.setProperty("--primary", primaryColor);
    root.style.setProperty("--primary-foreground", foreground);
    root.style.setProperty("--ring", primaryColor);
    root.style.setProperty("--sidebar-primary", primaryColor);
    root.style.setProperty("--sidebar-primary-foreground", foreground);
    root.style.setProperty("--sidebar-ring", primaryColor);
  }, [primaryColor]);

  return (
    <>
      <BrandFavicon />
      {children}
    </>
  );
}
