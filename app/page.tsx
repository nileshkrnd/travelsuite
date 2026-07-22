"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore, useSessionHydrated } from "@/lib/store/session.store";
import { roleHomePath } from "@/config/permissions";

export default function RootPage() {
  const user = useSessionStore((s) => s.user);
  const hydrated = useSessionHydrated();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    router.replace(user ? roleHomePath(user.role) : "/login");
  }, [hydrated, user, router]);

  return null;
}
