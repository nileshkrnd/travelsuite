import type { CurrencyCode } from "./money";

export interface TenantBranding {
  name: string;
  logoUrl: string;
  /** Hex color, e.g. "#2563EB" — drives --primary and related CSS vars at runtime. */
  primaryColor: string;
}

export interface Tenant {
  id: string;
  slug: string;
  branding: TenantBranding;
  defaultCurrency: CurrencyCode;
  supportedCurrencies: CurrencyCode[];
  defaultLocale: string;
  supportedLocales: string[];
}
