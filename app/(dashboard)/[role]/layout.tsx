"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSessionStore, useSessionHydrated } from "@/lib/store/session.store";
import { useRolesStore } from "@/lib/store/roles.store";
import { roleHomePath } from "@/config/permissions";
import { AppShell } from "@/components/layout/AppShell";

export default function DashboardRoleLayout({ children }: { children: React.ReactNode }) {
  const { role: slug } = useParams<{ role: string }>();
  const user = useSessionStore((s) => s.user);
  const hydrated = useSessionHydrated();
  const roles = useRolesStore((s) => s.roles);
  const router = useRouter();

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

  if (!hydrated || !user || !userRoleDef || userRoleDef.slug !== slug) {
    return null;
  }

  return <AppShell roleDef={userRoleDef}>{children}</AppShell>;
}
