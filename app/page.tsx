"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore, useSessionHydrated } from "@/lib/store/session.store";
import { useRolesStore } from "@/lib/store/roles.store";
import { roleHomePath } from "@/config/permissions";

export default function RootPage() {
  const user = useSessionStore((s) => s.user);
  const hydrated = useSessionHydrated();
  const roles = useRolesStore((s) => s.roles);
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    const roleDef = user ? roles.find((r) => r.id === user.roleId) : undefined;
    router.replace(roleDef ? roleHomePath(roleDef) : "/login");
  }, [hydrated, user, roles, router]);

  return null;
}
