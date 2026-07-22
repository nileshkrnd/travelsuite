"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSessionStore, useSessionHydrated } from "@/lib/store/session.store";
import { roleHomePath } from "@/config/permissions";
import { AppShell } from "@/components/layout/AppShell";
import type { Role } from "@/types";

export default function DashboardRoleLayout({ children }: { children: React.ReactNode }) {
  const { role } = useParams<{ role: string }>();
  const user = useSessionStore((s) => s.user);
  const hydrated = useSessionHydrated();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    // Role is always derived from the session, never taken from the URL as-is
    // — a stale/forged URL segment gets corrected back to the real home.
    if (user.role !== role) {
      router.replace(roleHomePath(user.role));
    }
  }, [hydrated, user, role, router]);

  if (!hydrated || !user || user.role !== role) {
    return null;
  }

  return <AppShell role={user.role as Role}>{children}</AppShell>;
}
