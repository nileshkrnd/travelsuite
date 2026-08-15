"use client";

import { useEffect, useMemo, useState } from "react";
import { getMenuForRole, type MenuItem } from "@/config/permissions";
import { buildTenantWorkspaceMenus } from "@/lib/subscription-menu-access";
import { listTenantSubscriptionModuleMenus } from "@/lib/services/subscription-module-menus.service";
import { isPlatformMode, useTenantStore } from "@/lib/store/tenant.store";
import { useSessionStore } from "@/lib/store/session.store";
import type { RoleDef, SubscriptionModuleMenu } from "@/types";

/**
 * Sidebar / topbar / search menus for the current workspace.
 * Tenant workspace: Module Access menus (employees filtered by Access Role CanView).
 * Super Admin (platform): hardcoded platform MENU_ITEMS.
 */
export function useWorkspaceMenus(roleDef: RoleDef | undefined): {
  items: MenuItem[];
  menusLoaded: boolean;
  /** False for tenant workspaces with no active Module Access / menus. */
  hasModuleAccess: boolean;
} {
  const tenantId = useTenantStore((s) => s.tenantId);
  const storeTenantKey = useTenantStore((s) => s.tenant.tenantKey) ?? 0;
  const user = useSessionStore((s) => s.user);
  const userKey = user?.userKey ?? 0;
  const userTenantKey = user?.tenantKey ?? 0;
  const isSuperAdmin = user?.scope === "superAdmin";
  const isTenantAdmin = user?.scope === "tenantAdmin";
  // Tenant users must query their own tenant even if the persisted workspace
  // still points at platform preview or another Super Admin selection.
  const tenantKey = !isSuperAdmin && userTenantKey > 0 ? userTenantKey : storeTenantKey;
  // Super Admin with no tenant selected uses platform menus. Tenant users never do,
  // even if the persisted workspace is still the platform preview tenant.
  const platformMode = isSuperAdmin && isPlatformMode(tenantId);
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
    // Tenant Admin sees every granted module; employees are filtered by CanView.
    listTenantSubscriptionModuleMenus(tenantKey, {
      userId: !isTenantAdmin && userKey > 0 ? userKey : undefined,
    })
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
  }, [roleDef, platformMode, tenantKey, tenantId, userKey, isTenantAdmin]);

  const items = useMemo(() => {
    if (!roleDef) return [];
    if (platformMode) {
      return getMenuForRole(roleDef, { platformMode: true });
    }
    const roleMenus = getMenuForRole(roleDef, { platformMode: false });
    return buildTenantWorkspaceMenus(roleMenus, menusLoaded ? dbMenus : []);
  }, [platformMode, roleDef, dbMenus, menusLoaded]);

  const hasModuleAccess = platformMode || !menusLoaded || items.length > 0;

  return { items, menusLoaded, hasModuleAccess };
}
