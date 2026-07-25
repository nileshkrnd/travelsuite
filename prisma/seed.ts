import { PrismaClient } from "@prisma/client";
import { COUNTRY_CITY_SEEDS, CURRENCY_SEEDS } from "./seed-reference";
import { hashPassword } from "../lib/password";

const prisma = new PrismaClient();

const CREATED_BY = 1; // Super Admin userKey
const DEMO_PASSWORD = "123456";

async function seedReferenceMasters() {
  for (const country of COUNTRY_CITY_SEEDS) {
    const row = await prisma.country.upsert({
      where: { countryCode: country.countryCode },
      create: {
        countryCode: country.countryCode,
        countryName: country.countryName,
        dialCode: country.dialCode,
        status: "active",
        createdBy: CREATED_BY,
      },
      update: {
        countryName: country.countryName,
        dialCode: country.dialCode,
        status: "active",
      },
    });

    for (const city of country.cities) {
      await prisma.city.upsert({
        where: {
          countryId_cityCode: {
            countryId: row.countryId,
            cityCode: city.cityCode,
          },
        },
        create: {
          countryId: row.countryId,
          cityCode: city.cityCode,
          cityName: city.cityName,
          status: "active",
          createdBy: CREATED_BY,
        },
        update: {
          cityName: city.cityName,
          status: "active",
        },
      });
    }
  }

  for (const currency of CURRENCY_SEEDS) {
    await prisma.currency.upsert({
      where: { currencyCode: currency.currencyCode },
      create: {
        ...currency,
        status: "active",
        createdBy: CREATED_BY,
      },
      update: {
        currencyName: currency.currencyName,
        symbol: currency.symbol,
        smallCurrencyName: currency.smallCurrencyName,
        significantDigit: currency.significantDigit,
        status: "active",
      },
    });
  }
}

const TENANT_SEEDS = [
  {
    tenantId: 1,
    tenantUid: "tenant_regency",
    tenantCode: "regencyGroupHolding",
    tenantName: "Regency Group Holding",
    groupName: "Regency Group Holding",
    defaultCurrency: "AED",
    supportedCurrencies: "AED,USD,EUR,GBP,INR",
    defaultLocale: "en",
    supportedLocales: "en,ar",
    primaryColor: "#2563EB",
    logoUrl: "",
    addressLine1: "C Ring Road",
    addressLine2: "Regency Tower",
    country: "QA",
    city: "Doha",
    zip: "00000",
    timezone: "Asia/Qatar",
    email: "hello@regencygroup.example",
    dialCode: "+974",
    phone: "44441234",
    status: "active",
    createdBy: CREATED_BY,
  },
  {
    tenantId: 2,
    tenantUid: "tenant_mannai",
    tenantCode: "mannaiTravel",
    tenantName: "Mannai Travel Corporation",
    groupName: "Mannai Travel Corporation",
    defaultCurrency: "AED",
    supportedCurrencies: "AED,USD,EUR,GBP",
    defaultLocale: "en",
    supportedLocales: "en,ar",
    primaryColor: "#1D4ED8",
    logoUrl: "",
    addressLine1: "Mannai Avenue",
    addressLine2: null,
    country: "QA",
    city: "Doha",
    zip: "00000",
    timezone: "Asia/Qatar",
    email: "hello@mannaitravel.example",
    dialCode: "+974",
    phone: "44221100",
    status: "active",
    createdBy: CREATED_BY,
  },
  {
    tenantId: 3,
    tenantUid: "tenant_tawfeeq",
    tenantCode: "tawfeeqGroup",
    tenantName: "Tawfeeq Group",
    groupName: "Tawfeeq Group",
    defaultCurrency: "AED",
    supportedCurrencies: "AED,USD",
    defaultLocale: "en",
    supportedLocales: "en,ar",
    primaryColor: "#7C3AED",
    logoUrl: "",
    addressLine1: "Salwa Road",
    addressLine2: null,
    country: "QA",
    city: "Doha",
    zip: "00000",
    timezone: "Asia/Qatar",
    email: "hello@tawfeeq.example",
    dialCode: "+974",
    phone: "44332200",
    status: "active",
    createdBy: CREATED_BY,
  },
  {
    tenantId: 4,
    tenantUid: "tenant_alibinali",
    tenantCode: "aliBinAliGroup",
    tenantName: "Ali Bin Ali Group",
    groupName: "Ali Bin Ali Group",
    defaultCurrency: "AED",
    supportedCurrencies: "AED,USD,EUR",
    defaultLocale: "en",
    supportedLocales: "en,ar",
    primaryColor: "#BE123C",
    logoUrl: "",
    addressLine1: "Ali Bin Ali Plaza",
    addressLine2: null,
    country: "QA",
    city: "Doha",
    zip: "00000",
    timezone: "Asia/Qatar",
    email: "hello@alibinali.example",
    dialCode: "+974",
    phone: "44445500",
    status: "active",
    createdBy: CREATED_BY,
  },
  {
    tenantId: 5,
    tenantUid: "tenant_seera",
    tenantCode: "seeraGroup",
    tenantName: "SEERA Group",
    groupName: "SEERA Group",
    defaultCurrency: "AED",
    supportedCurrencies: "AED,USD,EUR",
    defaultLocale: "en",
    supportedLocales: "en,ar",
    primaryColor: "#0F766E",
    logoUrl: "",
    addressLine1: "Olaya Street",
    addressLine2: null,
    country: "SA",
    city: "Riyadh",
    zip: "12213",
    timezone: "Asia/Riyadh",
    email: "hello@seera.example",
    dialCode: "+966",
    phone: "114600000",
    status: "active",
    createdBy: CREATED_BY,
  },
  {
    tenantId: 6,
    tenantUid: "tenant_nilesh",
    tenantCode: "nileshGroupHolding",
    tenantName: "Nilesh Group Holding",
    groupName: "Nilesh Group Holding",
    defaultCurrency: "USD",
    supportedCurrencies: "USD,EUR,GBP,INR,AED",
    defaultLocale: "en",
    supportedLocales: "en,ar,hi",
    primaryColor: "#4F46E5",
    logoUrl: "",
    addressLine1: "Business Bay",
    addressLine2: null,
    country: "AE",
    city: "Dubai",
    zip: "00000",
    timezone: "Asia/Dubai",
    email: "hello@nileshgroup.example",
    dialCode: "+971",
    phone: "45001000",
    status: "active",
    createdBy: CREATED_BY,
  },
];

async function seedTenants() {
  for (const row of TENANT_SEEDS) {
    await prisma.tenant.upsert({
      where: { tenantUid: row.tenantUid },
      create: row,
      update: {
        tenantCode: row.tenantCode,
        tenantName: row.tenantName,
        groupName: row.groupName,
        defaultCurrency: row.defaultCurrency,
        supportedCurrencies: row.supportedCurrencies,
        defaultLocale: row.defaultLocale,
        supportedLocales: row.supportedLocales,
        primaryColor: row.primaryColor,
        addressLine1: row.addressLine1,
        addressLine2: row.addressLine2,
        country: row.country,
        city: row.city,
        zip: row.zip,
        timezone: row.timezone,
        email: row.email,
        dialCode: row.dialCode,
        phone: row.phone,
        status: row.status,
      },
    });
  }

  // Keep SERIAL in sync when seeding explicit TenantIDs.
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"Tenant"', 'TenantID'), (SELECT COALESCE(MAX("TenantID"), 1) FROM "Tenant"))`
  );
}

async function seedRegions() {
  const seeds = [
    { regionCode: "GCC", regionName: "Gulf Cooperation Council" },
    { regionCode: "EU", regionName: "Europe" },
    { regionCode: "APAC", regionName: "Asia Pacific" },
  ];

  for (const row of seeds) {
    await prisma.region.upsert({
      where: { regionCode: row.regionCode },
      create: { ...row, status: "active", createdBy: CREATED_BY },
      update: { regionName: row.regionName, status: "active" },
    });
  }
}

async function seedUsers() {
  const passwordHash = hashPassword(DEMO_PASSWORD);
  const now = new Date();

  // Super Admin — TenantID=0, CompanyID=0
  await prisma.user.upsert({
    where: { username: "superadmin@travelsuite.com" },
    create: {
      userId: 1,
      username: "superadmin@travelsuite.com",
      passwordHash,
      userDisplayName: "Super Admin",
      tenantId: 0,
      companyId: 0,
      isActive: true,
      createdBy: CREATED_BY,
      lastPasswordChangeDtTm: now,
    },
    update: {
      passwordHash,
      userDisplayName: "Super Admin",
      tenantId: 0,
      companyId: 0,
      isActive: true,
    },
  });

  // Tenant Admin for Regency (TenantID=1, CompanyID=0)
  await prisma.user.upsert({
    where: { username: "admin@travelsuite.com" },
    create: {
      userId: 2,
      username: "admin@travelsuite.com",
      passwordHash,
      userDisplayName: "Alex Tenant Admin",
      tenantId: 1,
      companyId: 0,
      isActive: true,
      createdBy: CREATED_BY,
      lastPasswordChangeDtTm: now,
    },
    update: {
      passwordHash,
      userDisplayName: "Alex Tenant Admin",
      tenantId: 1,
      companyId: 0,
      isActive: true,
    },
  });

  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"User"', 'UserID'), (SELECT COALESCE(MAX("UserID"), 1) FROM "User"))`
  );
}

async function main() {
  await seedReferenceMasters();
  await seedTenants();
  await seedRegions();
  await seedUsers();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
