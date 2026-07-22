"use client";

import { useEffect } from "react";
import { useTenantStore } from "@/lib/store/tenant.store";
import { contrastForeground } from "@/lib/color";

/**
 * Applies the active tenant's brand color to the shadcn design tokens at
 * runtime, so every component that reads --primary/--ring/--sidebar-primary
 * picks up the tenant's accent color with no per-component branching.
 */
export function TenantThemeProvider({ children }: { children: React.ReactNode }) {
  const primaryColor = useTenantStore((s) => s.tenant.branding.primaryColor);

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

  return <>{children}</>;
}
