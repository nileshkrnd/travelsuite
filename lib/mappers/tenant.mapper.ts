import type { CurrencyCode, Tenant, TenantStatus } from "@/types";
import { DEFAULT_BRANDING } from "@/mock/data/tenants";

/** Prisma Tenant row shape (camelCase client fields). */
export interface TenantRow {
  tenantId: number;
  tenantUid: string;
  tenantCode: string;
  tenantName: string;
  groupName: string;
  defaultCurrency: string;
  supportedCurrencies: string;
  defaultLocale: string;
  supportedLocales: string;
  primaryColor: string;
  logoUrl: string;
  addressLine1: string;
  addressLine2: string | null;
  country: string;
  city: string;
  zip: string;
  timezone: string;
  email: string;
  dialCode: string;
  phone: string;
  status: string;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function toIso(value: Date | string): string {
  return typeof value === "string" ? value : value.toISOString();
}

/** Maps a DB Tenant row to the app Tenant used by shell / branding / masters. */
export function toAppTenant(row: TenantRow): Tenant {
  const currencies = splitList(row.supportedCurrencies) as CurrencyCode[];
  const locales = splitList(row.supportedLocales);
  return {
    id: row.tenantUid,
    tenantKey: row.tenantId,
    slug: row.tenantCode,
    groupName: row.groupName,
    branding: {
      name: row.tenantName,
      logoUrl: row.logoUrl || "",
      primaryColor: row.primaryColor || DEFAULT_BRANDING.primaryColor,
    },
    defaultCurrency: (row.defaultCurrency as CurrencyCode) || "USD",
    supportedCurrencies: currencies.length ? currencies : [row.defaultCurrency as CurrencyCode],
    defaultLocale: row.defaultLocale || "en",
    supportedLocales: locales.length ? locales : ["en"],
    status: (row.status === "inactive" ? "inactive" : "active") as TenantStatus,
    createdAt: toIso(row.createdDtTm),
    address: {
      line1: row.addressLine1,
      line2: row.addressLine2 || undefined,
      country: row.country,
      city: row.city,
      zip: row.zip,
      timezone: row.timezone,
    },
    contact: {
      email: row.email,
      dialCode: row.dialCode,
      phone: row.phone,
    },
  };
}

export function joinList(values: string[]): string {
  return values.join(",");
}
