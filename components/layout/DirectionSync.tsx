"use client";

import { useEffect } from "react";
import { useUiPrefsStore } from "@/lib/store/ui-prefs.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { resolveTextDirection } from "@/lib/tenant-locale";

/**
 * Mirrors the whole app to RTL when the active culture/locale is RTL.
 * Prefers Culture.direction from the tenant's assigned cultures; falls back
 * to the static locale map. next-intl may still serve English copy in Phase 1,
 * but layout direction flips from the default culture after login.
 */
export function DirectionSync() {
  const locale = useUiPrefsStore((s) => s.locale);
  const tenant = useTenantStore((s) => s.tenant);

  useEffect(() => {
    document.documentElement.dir = resolveTextDirection(locale, tenant);
    document.documentElement.lang = locale;
  }, [locale, tenant]);

  return null;
}
