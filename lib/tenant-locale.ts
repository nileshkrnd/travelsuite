import { LOCALE_DIR } from "@/config/i18n/locales";
import { useUiPrefsStore } from "@/lib/store/ui-prefs.store";
import type { Tenant } from "@/types";

/** Resolve LTR/RTL from Culture.direction when available, else locale map. */
export function resolveTextDirection(
  locale: string,
  tenant?: Pick<Tenant, "defaultLocale" | "defaultDirection" | "cultureDirections"> | null
): "ltr" | "rtl" {
  const fromCulture = tenant?.cultureDirections?.[locale];
  if (fromCulture === "rtl" || fromCulture === "ltr") return fromCulture;

  if (tenant?.defaultLocale === locale && (tenant.defaultDirection === "rtl" || tenant.defaultDirection === "ltr")) {
    return tenant.defaultDirection;
  }

  return LOCALE_DIR[locale] ?? "ltr";
}

/**
 * Apply the tenant's default culture as the active UI locale (and thus direction).
 * Call on login / tenant switch so RTL default cultures take effect immediately.
 */
export function applyTenantDefaultLocale(tenant: Tenant) {
  const locale = tenant.defaultLocale?.trim() || "en";
  useUiPrefsStore.getState().setLocale(locale);
}
