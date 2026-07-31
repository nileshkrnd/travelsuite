"use client";

import { useEffect } from "react";
import { getTenantByUid } from "@/lib/services/tenants.service";
import { applyTenantDefaultLocale } from "@/lib/tenant-locale";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantsStore } from "@/lib/store/tenants.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { useUiPrefsStore } from "@/lib/store/ui-prefs.store";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";

/**
 * Reloads the signed-in user's tenant (with Culture.direction) from PostgreSQL
 * so RTL/LTR from the default culture is available after login / refresh.
 */
export function useHydrateSessionTenant() {
  const user = useSessionStore((s) => s.user);
  const upsertTenant = useTenantsStore((s) => s.upsertTenant);
  const setTenant = useTenantStore((s) => s.setTenant);
  const syncActiveTenant = useTenantStore((s) => s.syncActiveTenant);

  useEffect(() => {
    if (!user?.tenantId) return;
    if (user.roleId === SUPER_ADMIN_ROLE_ID || user.scope === "superAdmin") return;

    let cancelled = false;
    getTenantByUid(user.tenantId)
      .then((tenant) => {
        if (cancelled) return;
        upsertTenant(tenant);

        const activeId = useTenantStore.getState().tenantId;
        if (activeId === tenant.id) {
          syncActiveTenant(tenant);
          const locale = useUiPrefsStore.getState().locale;
          if (!tenant.supportedLocales.includes(locale)) {
            applyTenantDefaultLocale(tenant);
          }
        } else {
          setTenant(tenant.id);
        }
      })
      .catch(() => {
        /* keep registry / persisted tenant if API unavailable */
      });

    return () => {
      cancelled = true;
    };
  }, [user?.tenantId, user?.roleId, user?.scope, upsertTenant, setTenant, syncActiveTenant]);
}
