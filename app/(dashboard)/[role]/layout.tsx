"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSessionStore, useSessionHydrated } from "@/lib/store/session.store";
import { useRolesStore } from "@/lib/store/roles.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { roleHomePath } from "@/config/permissions";
import { AppShell } from "@/components/layout/AppShell";
import { useHydrateReferenceMasters } from "@/lib/hooks/useReferenceMasters";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";

export default function DashboardRoleLayout({ children }: { children: React.ReactNode }) {
  const { role: slug } = useParams<{ role: string }>();
  const user = useSessionStore((s) => s.user);
  const hydrated = useSessionHydrated();
  const roles = useRolesStore((s) => s.roles);
  const setTenant = useTenantStore((s) => s.setTenant);
  const tenantId = useTenantStore((s) => s.tenantId);
  const router = useRouter();
  useHydrateReferenceMasters();

  const userRoleDef = user ? roles.find((r) => r.id === user.roleId) : undefined;

  useEffect(() => {
    if (!hydrated) return;
    if (!user || !userRoleDef) {
      router.replace("/login");
      return;
    }
    // Role is always derived from the session, never taken from the URL as-is
    // — a stale/forged URL segment gets corrected back to the real home.
    if (userRoleDef.slug !== slug) {
      router.replace(roleHomePath(userRoleDef));
    }
  }, [hydrated, user, userRoleDef, slug, router]);

  // Keep tenant branding/scope aligned with the signed-in user (Tenant Admin etc.).
  // Super Admin may stay in platform mode or pick a tenant separately.
  useEffect(() => {
    if (!hydrated || !user) return;
    if (user.roleId === SUPER_ADMIN_ROLE_ID || user.scope === "superAdmin") return;
    if (user.tenantId && user.tenantId !== tenantId) {
      setTenant(user.tenantId);
    }
  }, [hydrated, user, tenantId, setTenant]);

  if (!hydrated || !user || !userRoleDef || userRoleDef.slug !== slug) {
    return null;
  }

  return <AppShell roleDef={userRoleDef}>{children}</AppShell>;
}
