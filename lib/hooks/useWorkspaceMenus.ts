"use client";

import { useEffect, useMemo, useState } from "react";
import { getMenuForRole, type MenuItem } from "@/config/permissions";
import { buildTenantWorkspaceMenus } from "@/lib/subscription-menu-access";
import { listTenantSubscriptionModuleMenus } from "@/lib/services/subscription-module-menus.service";
import { isPlatformMode, useTenantStore } from "@/lib/store/tenant.store";
import type { RoleDef, SubscriptionModuleMenu } from "@/types";

/**
 * Sidebar / topbar / search menus for the current workspace.
 * Tenant Admin: Module Menu rows for granted modules only.
 * Super Admin (platform): hardcoded platform MENU_ITEMS.
 */
export function useWorkspaceMenus(roleDef: RoleDef | undefined): {
  items: MenuItem[];
  menusLoaded: boolean;
} {
  const tenantId = useTenantStore((s) => s.tenantId);
  const tenantKey = useTenantStore((s) => s.tenant.tenantKey);
  const platformMode = isPlatformMode(tenantId);
  const [dbMenus, setDbMenus] = useState<SubscriptionModuleMenu[]>([]);
  const [menusLoaded, setMenusLoaded] = useState(platformMode);

  useEffect(() => {
    if (!roleDef || platformMode || !tenantKey || tenantKey <= 0) {
      setDbMenus([]);
      setMenusLoaded(true);
      return;
    }
    let cancelled = false;
    setMenusLoaded(false);
    listTenantSubscriptionModuleMenus(tenantKey)
      .then((rows) => {
        if (!cancelled) {
          setDbMenus(rows);
          setMenusLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDbMenus([]);
          setMenusLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [roleDef, platformMode, tenantKey, tenantId]);

  const items = useMemo(() => {
    if (!roleDef) return [];
    if (platformMode) {
      return getMenuForRole(roleDef, { platformMode: true });
    }
    const roleMenus = getMenuForRole(roleDef, { platformMode: false });
    return buildTenantWorkspaceMenus(roleMenus, menusLoaded ? dbMenus : []);
  }, [platformMode, roleDef, dbMenus, menusLoaded]);

  return { items, menusLoaded };
}
