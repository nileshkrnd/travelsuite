import type { Tenant, TenantBranding } from "@/types";

export const tenants: Tenant[] = [
  {
    id: "tenant_horizon",
    slug: "horizonTravel",
    branding: {
      name: "Horizon Travel Group",
      logoUrl: "/tenant-logos/horizon.svg",
      primaryColor: "#2563EB",
    },
    defaultCurrency: "USD",
    supportedCurrencies: ["USD", "EUR", "GBP", "INR", "AED"],
    defaultLocale: "en",
    supportedLocales: ["en", "fr", "ar", "hi"],
    status: "active",
    createdAt: "2023-11-01T09:00:00.000Z",
    address: {
      line1: "1 Liberty Plaza",
      line2: "Suite 2400",
      country: "US",
      city: "New York",
      zip: "10006",
      timezone: "America/New_York",
    },
    contact: {
      email: "hello@horizontravel.example",
      dialCode: "+1",
      phone: "2125550142",
    },
  },
  {
    id: "tenant_bluewave",
    slug: "blueWaveHolidays",
    branding: {
      name: "BlueWave Holidays",
      logoUrl: "/tenant-logos/bluewave.svg",
      primaryColor: "#0D9488",
    },
    defaultCurrency: "AED",
    supportedCurrencies: ["AED", "USD", "EUR"],
    defaultLocale: "en",
    supportedLocales: ["en", "ar"],
    status: "active",
    createdAt: "2024-02-10T09:00:00.000Z",
    address: {
      line1: "Sheikh Zayed Road",
      line2: "Tower 3, Floor 12",
      country: "AE",
      city: "Dubai",
      zip: "00000",
      timezone: "Asia/Dubai",
    },
    contact: {
      email: "hello@bluewaveholidays.example",
      dialCode: "+971",
      phone: "42345678",
    },
  },
  {
    id: "tenant_novatrip",
    slug: "novatrip",
    branding: {
      name: "NovaTrip DMC",
      logoUrl: "/tenant-logos/novatrip.svg",
      primaryColor: "#C2410C",
    },
    defaultCurrency: "EUR",
    supportedCurrencies: ["EUR", "USD", "GBP"],
    defaultLocale: "en",
    supportedLocales: ["en", "fr"],
    status: "active",
    createdAt: "2024-05-20T09:00:00.000Z",
    address: {
      line1: "12 Rue de Rivoli",
      country: "FR",
      city: "Paris",
      zip: "75004",
      timezone: "Europe/Paris",
    },
    contact: {
      email: "hello@novatripdmc.example",
      dialCode: "+33",
      phone: "142345678",
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
