import type { Tenant } from "@/types";

export const tenants: Tenant[] = [
  {
    id: "tenant_horizon",
    slug: "horizon-travel",
    branding: {
      name: "Horizon Travel Group",
      logoUrl: "/tenant-logos/horizon.svg",
      primaryColor: "#2563EB",
    },
    defaultCurrency: "USD",
    supportedCurrencies: ["USD", "EUR", "GBP", "INR", "AED"],
    defaultLocale: "en",
    supportedLocales: ["en", "fr", "ar", "hi"],
  },
  {
    id: "tenant_bluewave",
    slug: "bluewave-holidays",
    branding: {
      name: "BlueWave Holidays",
      logoUrl: "/tenant-logos/bluewave.svg",
      primaryColor: "#0D9488",
    },
    defaultCurrency: "AED",
    supportedCurrencies: ["AED", "USD", "EUR"],
    defaultLocale: "en",
    supportedLocales: ["en", "ar"],
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
  },
];

export const DEFAULT_TENANT_ID = tenants[0].id;
