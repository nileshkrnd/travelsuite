import type { Tenant, TenantBranding } from "@/types";
import { SAAS_BRAND } from "@/config/saasBrand";

/**
 * Tenants = holding / legal entities Super Admin switches between.
 * Operating businesses (e.g. Regency Travel & Tours) live under Companies
 * inside a tenant — see mock/data/companies.ts.
 */
export const tenants: Tenant[] = [
  {
    id: "tenant_regency",
    tenantKey: 1,
    slug: "regencyGroupHolding",
    groupName: "Regency Group Holding",
    branding: {
      name: "Regency Group Holding",
      logoUrl: "",
      primaryColor: "#2563EB",
    },
    defaultCurrency: "AED",
    supportedCurrencies: ["AED", "USD", "EUR", "GBP", "INR"],
    defaultLocale: "en",
    supportedLocales: ["en", "ar"],
    defaultDirection: "ltr",
    cultureDirections: { en: "ltr", ar: "rtl" },
    status: "active",
    createdAt: "2023-11-01T09:00:00.000Z",
    address: {
      line1: "C Ring Road",
      line2: "Regency Tower",
      country: "QA",
      city: "Doha",
      zip: "00000",
      timezone: "Asia/Qatar",
    },
    contact: {
      email: "hello@regencygroup.example",
      dialCode: "+974",
      phone: "44441234",
    },
  },
  {
    id: "tenant_mannai",
    tenantKey: 2,
    slug: "mannaiTravel",
    groupName: "Mannai Travel Corporation",
    branding: {
      name: "Mannai Travel Corporation",
      logoUrl: "",
      primaryColor: "#1D4ED8",
    },
    defaultCurrency: "AED",
    supportedCurrencies: ["AED", "USD", "EUR", "GBP"],
    defaultLocale: "en",
    supportedLocales: ["en", "ar"],
    status: "active",
    createdAt: "2024-02-10T09:00:00.000Z",
    address: {
      line1: "Mannai Avenue",
      country: "QA",
      city: "Doha",
      zip: "00000",
      timezone: "Asia/Qatar",
    },
    contact: {
      email: "hello@mannaitravel.example",
      dialCode: "+974",
      phone: "44221100",
    },
  },
  {
    id: "tenant_tawfeeq",
    tenantKey: 3,
    slug: "tawfeeqGroup",
    groupName: "Tawfeeq Group",
    branding: {
      name: "Tawfeeq Group",
      logoUrl: "",
      primaryColor: "#7C3AED",
    },
    defaultCurrency: "AED",
    supportedCurrencies: ["AED", "USD"],
    defaultLocale: "en",
    supportedLocales: ["en", "ar"],
    status: "active",
    createdAt: "2024-03-20T09:00:00.000Z",
    address: {
      line1: "Salwa Road",
      country: "QA",
      city: "Doha",
      zip: "00000",
      timezone: "Asia/Qatar",
    },
    contact: {
      email: "hello@tawfeeq.example",
      dialCode: "+974",
      phone: "44332200",
    },
  },
  {
    id: "tenant_alibinali",
    tenantKey: 4,
    slug: "aliBinAliGroup",
    groupName: "Ali Bin Ali Group",
    branding: {
      name: "Ali Bin Ali Group",
      logoUrl: "",
      primaryColor: "#BE123C",
    },
    defaultCurrency: "AED",
    supportedCurrencies: ["AED", "USD", "EUR"],
    defaultLocale: "en",
    supportedLocales: ["en", "ar"],
    status: "active",
    createdAt: "2024-04-08T09:00:00.000Z",
    address: {
      line1: "Ali Bin Ali Plaza",
      country: "QA",
      city: "Doha",
      zip: "00000",
      timezone: "Asia/Qatar",
    },
    contact: {
      email: "hello@alibinali.example",
      dialCode: "+974",
      phone: "44445500",
    },
  },
  {
    id: "tenant_seera",
    tenantKey: 5,
    slug: "seeraGroup",
    groupName: "SEERA Group",
    branding: {
      name: "SEERA Group",
      logoUrl: "",
      primaryColor: "#0F766E",
    },
    defaultCurrency: "AED",
    supportedCurrencies: ["AED", "USD", "EUR"],
    defaultLocale: "en",
    supportedLocales: ["en", "ar"],
    status: "active",
    createdAt: "2024-05-20T09:00:00.000Z",
    address: {
      line1: "Olaya Street",
      country: "SA",
      city: "Riyadh",
      zip: "12213",
      timezone: "Asia/Riyadh",
    },
    contact: {
      email: "hello@seera.example",
      dialCode: "+966",
      phone: "114600000",
    },
  },
  {
    id: "tenant_nilesh",
    tenantKey: 6,
    slug: "nileshGroupHolding",
    groupName: "Nilesh Group Holding",
    branding: {
      name: "Nilesh Group Holding",
      logoUrl: "",
      primaryColor: "#4F46E5",
    },
    defaultCurrency: "USD",
    supportedCurrencies: ["USD", "EUR", "GBP", "INR", "AED"],
    defaultLocale: "en",
    supportedLocales: ["en", "ar", "hi"],
    status: "active",
    createdAt: "2024-06-01T09:00:00.000Z",
    address: {
      line1: "Business Bay",
      country: "AE",
      city: "Dubai",
      zip: "00000",
      timezone: "Asia/Dubai",
    },
    contact: {
      email: "hello@nileshgroup.example",
      dialCode: "+971",
      phone: "45001000",
    },
  },
];

export const DEFAULT_TENANT_ID = tenants[0].id;

/** Platform branding — Super Admin chrome and generic /login before a tenant is selected. */
export const DEFAULT_BRANDING: TenantBranding = {
  name: SAAS_BRAND.name,
  logoUrl: SAAS_BRAND.logoUrl,
  primaryColor: SAAS_BRAND.primaryColor,
};

/** Placeholder Tenant shape carrying DEFAULT_BRANDING, so the tenant store always holds a valid Tenant. */
export const DEFAULT_PREVIEW_TENANT: Tenant = {
  id: "default",
  tenantKey: 0,
  slug: "",
  groupName: SAAS_BRAND.shortName,
  branding: DEFAULT_BRANDING,
  defaultCurrency: "USD",
  supportedCurrencies: ["USD"],
  defaultLocale: "en",
  supportedLocales: ["en"],
  defaultDirection: "ltr",
  cultureDirections: { en: "ltr" },
  status: "active",
  createdAt: "2023-01-01T00:00:00.000Z",
  address: { line1: "", country: "", city: "", zip: "", timezone: "UTC" },
  contact: { email: "", dialCode: "", phone: "" },
};
