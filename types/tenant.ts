import type { CurrencyCode } from "./money";

export type TenantStatus = "active" | "inactive";

export interface TenantBranding {
  name: string;
  logoUrl: string;
  /** Hex color, e.g. "#2563EB" — drives --primary and related CSS vars at runtime. */
  primaryColor: string;
}

export interface TenantAddress {
  line1: string;
  line2?: string;
  /** ISO 3166-1 alpha-2 country code, e.g. "US". */
  country: string;
  city: string;
  zip: string;
  /** IANA timezone identifier, e.g. "Asia/Kolkata". */
  timezone: string;
}

export interface TenantContact {
  email: string;
  dialCode: string;
  phone: string;
}

export interface Tenant {
  id: string;
  slug: string;
  branding: TenantBranding;
  /**
   * Holding / group this workspace belongs to (e.g. "Regency Group Holding").
   * Standalone tenants use their own name as the group.
   */
  groupName: string;
  defaultCurrency: CurrencyCode;
  supportedCurrencies: CurrencyCode[];
  defaultLocale: string;
  supportedLocales: string[];
  status: TenantStatus;
  createdAt: string;
  address: TenantAddress;
  contact: TenantContact;
}
