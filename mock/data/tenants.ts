import type { Tenant, TenantBranding } from "@/types";

export const tenants: Tenant[] = [
  // ── Regency Group Holding ──────────────────────────────────────────────
  {
    id: "tenant_regency",
    slug: "regencyTravel",
    groupName: "Regency Group Holding",
    branding: {
      name: "Regency Travel & Tours",
      logoUrl: "",
      primaryColor: "#2563EB",
    },
    defaultCurrency: "AED",
    supportedCurrencies: ["AED", "USD", "EUR", "GBP", "INR"],
    defaultLocale: "en",
    supportedLocales: ["en", "ar"],
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
      email: "hello@regencytravel.example",
      dialCode: "+974",
      phone: "44441234",
    },
  },
  {
    id: "tenant_myholidays",
    slug: "myHolidays",
    groupName: "Regency Group Holding",
    branding: {
      name: "MyHolidays",
      logoUrl: "",
      primaryColor: "#0D9488",
    },
    defaultCurrency: "AED",
    supportedCurrencies: ["AED", "USD", "EUR"],
    defaultLocale: "en",
    supportedLocales: ["en", "ar"],
    status: "active",
    createdAt: "2024-03-12T09:00:00.000Z",
    address: {
      line1: "West Bay",
      country: "QA",
      city: "Doha",
      zip: "00000",
      timezone: "Asia/Qatar",
    },
    contact: {
      email: "hello@myholidays.example",
      dialCode: "+974",
      phone: "44445678",
    },
  },
  {
    id: "tenant_alasmakh",
    slug: "alAsmakhRealEstate",
    groupName: "Regency Group Holding",
    branding: {
      name: "Al Asmakh Real Estate",
      logoUrl: "",
      primaryColor: "#B45309",
    },
    defaultCurrency: "AED",
    supportedCurrencies: ["AED", "USD"],
    defaultLocale: "en",
    supportedLocales: ["en", "ar"],
    status: "active",
    createdAt: "2024-04-01T09:00:00.000Z",
    address: {
      line1: "Al Asmakh Street",
      country: "QA",
      city: "Doha",
      zip: "00000",
      timezone: "Asia/Qatar",
    },
    contact: {
      email: "hello@alasmakh.example",
      dialCode: "+974",
      phone: "44449012",
    },
  },

  // ── Mannai Travel Corporation ──────────────────────────────────────────
  {
    id: "tenant_mannai",
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

  // ── Tawfeeq Group ──────────────────────────────────────────────────────
  {
    id: "tenant_tawfeeq",
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

  // ── Ali Bin Ali Group ──────────────────────────────────────────────────
  {
    id: "tenant_alibinali",
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

  // ── SEERA Group ────────────────────────────────────────────────────────
  {
    id: "tenant_seera",
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

  // ── Nilesh Group Holding ───────────────────────────────────────────────
  {
    id: "tenant_nilesh",
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

/** Neutral, platform-level branding shown on the generic /login page before a tenant code is entered. */
export const DEFAULT_BRANDING: TenantBranding = {
  name: "TravelSuite",
  logoUrl: "",
  primaryColor: "#4F46E5",
};

/** Placeholder Tenant shape carrying DEFAULT_BRANDING, so the tenant store always holds a valid Tenant. */
export const DEFAULT_PREVIEW_TENANT: Tenant = {
  id: "default",
  slug: "",
  groupName: "TravelSuite",
  branding: DEFAULT_BRANDING,
  defaultCurrency: "USD",
  supportedCurrencies: ["USD"],
  defaultLocale: "en",
  supportedLocales: ["en"],
  status: "active",
  createdAt: "2023-01-01T00:00:00.000Z",
  address: { line1: "", country: "", city: "", zip: "", timezone: "UTC" },
  contact: { email: "", dialCode: "", phone: "" },
};
