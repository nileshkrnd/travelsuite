import { PrismaClient } from "@prisma/client";
import { COUNTRY_CITY_SEEDS, CURRENCY_SEEDS } from "./seed-reference";
import { hashPassword } from "../../lib/password";
import { MODULE_MENU_SEEDS, ADMIN_MENU_PRODUCT_LINKS, type SeedMenuNode } from "./seed-module-menus";

/** Seeds KlyraAdmin only (prefer direct URL when seeding against pooler hosts). */
const adminUrl = process.env.ADMINCNX_DIRECT_URL || process.env.ADMINCNX_URL;
if (!adminUrl) {
  throw new Error("Set ADMINCNX_URL (or ADMINCNX_DIRECT_URL) before seeding.");
}
const prisma = new PrismaClient({
  datasources: { db: { url: adminUrl } },
});


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

async function seedStateAdministrativeTypes() {
  const names = ["State", "Province", "Emirate", "Governorate", "Region"];
  for (const administrativeType of names) {
    await prisma.stateAdministrativeType.upsert({
      where: { administrativeType },
      create: { administrativeType, isActive: true, createdBy: CREATED_BY },
      update: { isActive: true },
    });
  }
}

const STATE_SEEDS: Array<{
  countryCode: string;
  administrativeType: string;
  states: Array<{ stateCode: string; isoCode: string; stateName: string; capitalCityCode?: string }>;
}> = [
  {
    countryCode: "US",
    administrativeType: "State",
    states: [
      { stateCode: "CA", isoCode: "US-CA", stateName: "California" },
      { stateCode: "TX", isoCode: "US-TX", stateName: "Texas" },
      { stateCode: "NY", isoCode: "US-NY", stateName: "New York" },
    ],
  },
  {
    countryCode: "IN",
    administrativeType: "State",
    states: [
      { stateCode: "MH", isoCode: "IN-MH", stateName: "Maharashtra", capitalCityCode: "MUMBAI" },
      { stateCode: "DL", isoCode: "IN-DL", stateName: "Delhi", capitalCityCode: "DELHI" },
      { stateCode: "KA", isoCode: "IN-KA", stateName: "Karnataka", capitalCityCode: "BENGALURU" },
      { stateCode: "TG", isoCode: "IN-TG", stateName: "Telangana", capitalCityCode: "HYDERABAD" },
    ],
  },
  {
    countryCode: "AE",
    administrativeType: "Emirate",
    states: [
      { stateCode: "DU", isoCode: "AE-DU", stateName: "Dubai", capitalCityCode: "DUBAI" },
      { stateCode: "AZ", isoCode: "AE-AZ", stateName: "Abu Dhabi", capitalCityCode: "ABU_DHABI" },
      { stateCode: "SH", isoCode: "AE-SH", stateName: "Sharjah", capitalCityCode: "SHARJAH" },
    ],
  },
];

async function seedStates() {
  for (const group of STATE_SEEDS) {
    const country = await prisma.country.findUnique({ where: { countryCode: group.countryCode } });
    if (!country) continue;
    const adminType = await prisma.stateAdministrativeType.findUnique({
      where: { administrativeType: group.administrativeType },
    });

    for (const [i, state] of group.states.entries()) {
      const capitalCity = state.capitalCityCode
        ? await prisma.city.findFirst({
            where: { countryId: country.countryId, cityCode: state.capitalCityCode },
          })
        : null;

      await prisma.state.upsert({
        where: { countryId_stateCode: { countryId: country.countryId, stateCode: state.stateCode } },
        create: {
          countryId: country.countryId,
          stateCode: state.stateCode,
          isoCode: state.isoCode,
          stateName: state.stateName,
          stateAdministrativeTypeId: adminType?.stateAdministrativeTypeId,
          capitalCityId: capitalCity?.cityId,
          displayOrder: i,
          isActive: true,
          createdBy: CREATED_BY,
        },
        update: {
          isoCode: state.isoCode,
          stateName: state.stateName,
          stateAdministrativeTypeId: adminType?.stateAdministrativeTypeId,
          capitalCityId: capitalCity?.cityId,
          isActive: true,
        },
      });
    }
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"State"', 'StateID'), (SELECT COALESCE(MAX("StateID"), 1) FROM "State"))`
  );
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

async function seedCultures() {
  const seeds = [
    { cultureCode: "en", cultureName: "English", direction: "ltr" },
    { cultureCode: "ar", cultureName: "Arabic", direction: "rtl" },
    { cultureCode: "es", cultureName: "Spanish", direction: "ltr" },
    { cultureCode: "hi", cultureName: "Hindi", direction: "ltr" },
  ];

  for (const row of seeds) {
    await prisma.culture.upsert({
      where: { cultureCode: row.cultureCode },
      create: { ...row, isActive: true, createdBy: CREATED_BY },
      update: {
        cultureName: row.cultureName,
        direction: row.direction,
        isActive: true,
      },
    });
  }
}

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

/** Assign Default + Supported cultures from each tenant's legacy locale fields. */
async function seedTenantCultures() {
  const cultures = await prisma.culture.findMany();
  const byCode = new Map(cultures.map((c) => [c.cultureCode.toLowerCase(), c]));

  for (const seed of TENANT_SEEDS) {
    const tenant = await prisma.tenant.findUnique({ where: { tenantUid: seed.tenantUid } });
    if (!tenant) continue;

    const codes = seed.supportedLocales
      .split(",")
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean);
    const defaultCode = seed.defaultLocale.trim().toLowerCase();
    const ordered = [...new Set([defaultCode, ...codes])];

    await prisma.tenantCulture.deleteMany({ where: { tenantId: tenant.tenantId } });

    for (const code of ordered) {
      const culture = byCode.get(code);
      if (!culture) continue;
      await prisma.tenantCulture.create({
        data: {
          tenantId: tenant.tenantId,
          cultureId: culture.cultureId,
          isDefault: code === defaultCode,
          createdBy: CREATED_BY,
        },
      });
    }
  }
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

  // Super Admin — UserTypeID=1, TenantID=0, CompanyID=0
  await prisma.user.upsert({
    where: { username: "superadmin@travelsuite.com" },
    create: {
      userId: 1,
      username: "superadmin@travelsuite.com",
      passwordHash,
      userDisplayName: "Super Admin",
      userTypeId: 1,
      tenantId: 0,
      companyId: 0,
      isActive: true,
      createdBy: CREATED_BY,
      lastPasswordChangeDtTm: now,
    },
    update: {
      passwordHash,
      userDisplayName: "Super Admin",
      userTypeId: 1,
      tenantId: 0,
      companyId: 0,
      isActive: true,
    },
  });

  // Tenant Admin for Regency — UserTypeID=2, TenantID=1, CompanyID=0
  await prisma.user.upsert({
    where: { username: "admin@travelsuite.com" },
    create: {
      userId: 2,
      username: "admin@travelsuite.com",
      passwordHash,
      userDisplayName: "Alex Tenant Admin",
      userTypeId: 2,
      tenantId: 1,
      companyId: 0,
      isActive: true,
      createdBy: CREATED_BY,
      lastPasswordChangeDtTm: now,
    },
    update: {
      passwordHash,
      userDisplayName: "Alex Tenant Admin",
      userTypeId: 2,
      tenantId: 1,
      companyId: 0,
      isActive: true,
    },
  });

  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"User"', 'UserID'), (SELECT COALESCE(MAX("UserID"), 1) FROM "User"))`
  );
}

async function seedAccessRoles() {
  // Platform Super Admin roles (T0C0)
  await prisma.accessRole.upsert({
    where: {
      tenantId_companyId_accessRoleName: {
        tenantId: 0,
        companyId: 0,
        accessRoleName: "Super Admin",
      },
    },
    create: {
      accessRoleName: "Super Admin",
      tenantId: 0,
      companyId: 0,
      isActive: true,
      createdBy: CREATED_BY,
    },
    update: { isActive: true },
  });

  // Tenant Admin role for Regency (TenantID=1, CompanyID=0)
  await prisma.accessRole.upsert({
    where: {
      tenantId_companyId_accessRoleName: {
        tenantId: 1,
        companyId: 0,
        accessRoleName: "Tenant Admin",
      },
    },
    create: {
      accessRoleName: "Tenant Admin",
      tenantId: 1,
      companyId: 0,
      isActive: true,
      createdBy: CREATED_BY,
    },
    update: { isActive: true },
  });
}

async function seedSubscriptionCatalog() {
  const productSeeds: { name: string; description: string }[] = [
    {
      name: "Administration",
      description: "Shared company setup menus visible across products by access",
    },
    { name: "Travel", description: "Travel booking, POS and operations suite" },
    { name: "Real Estate", description: "Property and real estate management" },
    { name: "Facility Management", description: "Facilities operations and maintenance" },
    { name: "Fleet Management", description: "Vehicle and fleet operations" },
    { name: "Inventory Management", description: "Stock, warehouse and inventory control" },
    { name: "Asset Management", description: "Fixed assets tracking and lifecycle" },
    {
      name: "HRMS (Human Resource Management System)",
      description: "Human resources, payroll and workforce",
    },
    { name: "Procurement", description: "Purchasing, vendors and procurement" },
    { name: "Finance", description: "Finance, vouchers and financial reporting" },
    { name: "Hospitality", description: "Hotels, F&B and hospitality operations" },
    { name: "CRM", description: "Customer relationship management suite" },
    { name: "Helpdesk", description: "Support tickets and helpdesk suite" },
    {
      name: "Extranet",
      description: "Supplier self-service portal for inventory, rates and bookings",
    },
  ];

  const productByName = new Map<string, number>();
  for (const p of productSeeds) {
    const row = await prisma.subscriptionProduct.upsert({
      where: { subscriptionProductName: p.name },
      create: {
        subscriptionProductName: p.name,
        description: p.description,
        isActive: true,
        createdBy: CREATED_BY,
      },
      update: {
        description: p.description,
        isActive: true,
      },
    });
    productByName.set(p.name, row.subscriptionProductId);
  }

  // Remove legacy catalog products entirely (avoid inactive clutter).
  for (const legacy of ["Klyra Core", "Finance Pack"]) {
    const legacyProduct = await prisma.subscriptionProduct.findFirst({
      where: { subscriptionProductName: legacy },
    });
    if (legacyProduct) {
      await deleteSubscriptionProductCascade(legacyProduct.subscriptionProductId);
    }
  }

  // Remount Administration module onto the shared Administration product (was under Travel).
  const administrationProductId = productByName.get("Administration")!;
  const existingAdminModule = await prisma.subscriptionModule.findFirst({
    where: { subscriptionModuleName: "Administration" },
  });
  if (
    existingAdminModule &&
    existingAdminModule.subscriptionProductId !== administrationProductId
  ) {
    await prisma.subscriptionModule.update({
      where: { subscriptionModuleId: existingAdminModule.subscriptionModuleId },
      data: {
        subscriptionProductId: administrationProductId,
        sortOrder: 0,
        isActive: true,
        description: "Shared company, branch, employee and setup menus",
        modifiedBy: CREATED_BY,
        modifiedDtTm: new Date(),
      },
    });
  }

  // Preserve menus/access when renaming legacy module names.
  await renameSubscriptionModule("Inventory", "Inventory Core");
  await renameSubscriptionModule("Accounts", "Finance Core");

  // Promote CRM / Helpdesk from per-product modules to dedicated products.
  await consolidateModulesOntoProduct({
    moduleName: "CRM",
    targetProductId: productByName.get("CRM")!,
    description: "Customer relationship management",
  });
  await consolidateModulesOntoProduct({
    moduleName: "Helpdesk",
    targetProductId: productByName.get("Helpdesk")!,
    description: "Support tickets and helpdesk",
  });

  const modulesByProduct: Record<string, { name: string; description: string }[]> = {
    Administration: [
      {
        name: "Administration",
        description: "Shared company, branch, employee and setup menus",
      },
    ],
    Travel: [
      { name: "POS", description: "Point of sale booking desk" },
      { name: "B2B", description: "Business-to-business travel portal" },
      { name: "CBT", description: "Corporate booking tool" },
      { name: "API", description: "Travel API integrations and connectors" },
      { name: "B2C", description: "Consumer travel booking" },
    ],
    "Real Estate": [
      { name: "Property Management", description: "Properties, units and portfolios" },
      { name: "Tenant Management", description: "Lease and tenant lifecycle" },
    ],
    "Facility Management": [
      { name: "Facility Operations", description: "Facilities ops and maintenance" },
    ],
    "Fleet Management": [
      { name: "Fleet Operations", description: "Vehicles, trips and fleet ops" },
    ],
    "Inventory Management": [
      { name: "Inventory Core", description: "Stock and warehouse operations" },
    ],
    "Asset Management": [
      { name: "Asset Core", description: "Fixed assets tracking and lifecycle" },
    ],
    "HRMS (Human Resource Management System)": [
      { name: "HRMS", description: "HR operations modules" },
    ],
    Procurement: [
      { name: "Procurement Core", description: "Purchasing, vendors and POs" },
    ],
    Finance: [
      { name: "Finance Core", description: "Ledgers, vouchers and financial reports" },
    ],
    Hospitality: [
      { name: "Hospitality Core", description: "Hotels, F&B and hospitality ops" },
    ],
    CRM: [
      { name: "CRM", description: "Customer relationship management" },
    ],
    Helpdesk: [
      { name: "Helpdesk", description: "Support tickets and helpdesk" },
    ],
    Extranet: [
      {
        name: "Extranet",
        description: "Supplier self-service for inventory, rates and bookings",
      },
    ],
  };

  /** Separate portals — licensed via Module Access but not Admin/Super Admin sidebar menus. */
  const PORTAL_MODULE_NAMES = new Set(["B2B", "B2C", "CBT", "API"]);

  const moduleIds: number[] = [];
  const desiredModuleIds = new Set<number>();

  for (const [productName, modules] of Object.entries(modulesByProduct)) {
    const productId = productByName.get(productName);
    if (!productId) continue;

    for (let i = 0; i < modules.length; i++) {
      const m = modules[i]!;
      const sortOrder = productName === "Administration" ? -1 : i;
      const showInMenu = !PORTAL_MODULE_NAMES.has(m.name);
      const existing = await prisma.subscriptionModule.findFirst({
        where: {
          subscriptionProductId: productId,
          subscriptionModuleName: m.name,
        },
      });
      const row = existing
        ? await prisma.subscriptionModule.update({
            where: { subscriptionModuleId: existing.subscriptionModuleId },
            data: {
              description: m.description,
              sortOrder,
              showInMenu,
              isActive: true,
              modifiedBy: CREATED_BY,
              modifiedDtTm: new Date(),
            },
          })
        : await prisma.subscriptionModule.create({
            data: {
              subscriptionProductId: productId,
              subscriptionModuleName: m.name,
              description: m.description,
              sortOrder,
              showInMenu,
              isActive: true,
              createdBy: CREATED_BY,
            },
          });
      moduleIds.push(row.subscriptionModuleId);
      desiredModuleIds.add(row.subscriptionModuleId);
    }
  }

  // Fold legacy Reports menus into Finance Core, then delete Reports.
  const financeCore = await prisma.subscriptionModule.findFirst({
    where: {
      subscriptionProductId: productByName.get("Finance"),
      subscriptionModuleName: "Finance Core",
      isActive: true,
    },
  });
  const reports = await prisma.subscriptionModule.findFirst({
    where: { subscriptionModuleName: "Reports" },
  });
  if (financeCore && reports && reports.subscriptionModuleId !== financeCore.subscriptionModuleId) {
    const financeUrls = new Set(
      (
        await prisma.subscriptionModuleMenu.findMany({
          where: { subscriptionModuleId: financeCore.subscriptionModuleId },
          select: { menuUrl: true },
        })
      ).map((m) => m.menuUrl)
    );
    const reportMenus = await prisma.subscriptionModuleMenu.findMany({
      where: { subscriptionModuleId: reports.subscriptionModuleId },
    });
    for (const menu of reportMenus) {
      if (financeUrls.has(menu.menuUrl)) continue;
      await prisma.subscriptionModuleMenu.update({
        where: { subscriptionModuleMenuId: menu.subscriptionModuleMenuId },
        data: {
          subscriptionModuleId: financeCore.subscriptionModuleId,
          modifiedBy: CREATED_BY,
          modifiedDtTm: new Date(),
        },
      });
    }
    await deleteSubscriptionModuleCascade(reports.subscriptionModuleId);
  }

  // Delete modules not in the catalog (legacy / renamed leftovers).
  const catalogProductIds = [...productByName.values()];
  const staleModules = await prisma.subscriptionModule.findMany({
    where: {
      OR: [
        { subscriptionProductId: { in: catalogProductIds }, subscriptionModuleId: { notIn: [...desiredModuleIds] } },
        { subscriptionProductId: { notIn: catalogProductIds } },
      ],
    },
  });
  for (const stale of staleModules) {
    await deleteSubscriptionModuleCascade(stale.subscriptionModuleId);
  }

  // Hard-delete any remaining inactive products/modules so UI stays clean.
  await purgeInactiveSubscriptionCatalog();

  for (const subscriptionModuleId of moduleIds) {
    await prisma.subscriptionModuleAccess.upsert({
      where: {
        subscriptionModuleId_tenantId: {
          subscriptionModuleId,
          tenantId: 1,
        },
      },
      create: {
        subscriptionModuleId,
        tenantId: 1,
        isActive: true,
        createdBy: CREATED_BY,
      },
      update: { isActive: true },
    });
  }

  // Full menu/submenu trees (name, URL, icon, parent) live in DB after seed.
  async function upsertMenuTree(
    subscriptionModuleId: number,
    nodes: SeedMenuNode[],
    parentMenuId: number | null
  ) {
    let sortOrder = 0;
    for (const node of nodes) {
      const row = await prisma.subscriptionModuleMenu.upsert({
        where: {
          subscriptionModuleId_menuUrl: {
            subscriptionModuleId,
            menuUrl: node.url,
          },
        },
        create: {
          subscriptionModuleId,
          parentMenuId,
          menuName: node.name,
          menuUrl: node.url,
          menuIcon: node.icon,
          sortOrder,
          isActive: true,
          createdBy: CREATED_BY,
        },
        update: {
          parentMenuId,
          menuName: node.name,
          menuIcon: node.icon,
          sortOrder,
          isActive: true,
        },
      });
      if (node.children?.length) {
        await upsertMenuTree(subscriptionModuleId, node.children, row.subscriptionModuleMenuId);
      }
      sortOrder += 1;
    }
  }

  function collectSeedMenuUrls(nodes: SeedMenuNode[], into: Set<string> = new Set()) {
    for (const node of nodes) {
      into.add(node.url);
      if (node.children?.length) collectSeedMenuUrls(node.children, into);
    }
    return into;
  }

  // Seed menus for every active module.
  const activeModules = await prisma.subscriptionModule.findMany({
    where: { isActive: true, subscriptionModuleId: { in: moduleIds } },
    select: { subscriptionModuleId: true, subscriptionModuleName: true },
  });
  for (const mod of activeModules) {
    const tree = MODULE_MENU_SEEDS[mod.subscriptionModuleName];
    if (!tree) continue;
    await upsertMenuTree(mod.subscriptionModuleId, tree, null);

    // Drop legacy menus removed from the seed tree (e.g. old Accounts → Reports parent).
    const desiredUrls = collectSeedMenuUrls(tree);
    await prisma.subscriptionModuleMenu.updateMany({
      where: {
        subscriptionModuleId: mod.subscriptionModuleId,
        menuUrl: { notIn: [...desiredUrls] },
        isActive: true,
      },
      data: {
        isActive: false,
        modifiedBy: CREATED_BY,
        modifiedDtTm: new Date(),
      },
    });
  }

  // Link Administration menus to products that unlock them for tenants.
  const adminModule = activeModules.find((m) => m.subscriptionModuleName === "Administration");
  if (adminModule) {
    const adminMenus = await prisma.subscriptionModuleMenu.findMany({
      where: { subscriptionModuleId: adminModule.subscriptionModuleId, isActive: true },
      select: { subscriptionModuleMenuId: true, menuUrl: true },
    });
    for (const menu of adminMenus) {
      const productNames = ADMIN_MENU_PRODUCT_LINKS[menu.menuUrl];
      if (productNames === undefined) continue;

      const desiredProductIds = productNames
        .map((name) => productByName.get(name))
        .filter((id): id is number => id != null);

      const existingLinks = await prisma.subscriptionModuleMenuProduct.findMany({
        where: { subscriptionModuleMenuId: menu.subscriptionModuleMenuId },
      });
      const existingIds = new Set(existingLinks.map((l) => l.subscriptionProductId));
      const desiredSet = new Set(desiredProductIds);

      for (const link of existingLinks) {
        if (!desiredSet.has(link.subscriptionProductId)) {
          await prisma.subscriptionModuleMenuProduct.delete({
            where: {
              subscriptionModuleMenuProductId: link.subscriptionModuleMenuProductId,
            },
          });
        }
      }

      for (const productId of desiredProductIds) {
        if (existingIds.has(productId)) continue;
        await prisma.subscriptionModuleMenuProduct.create({
          data: {
            subscriptionModuleMenuId: menu.subscriptionModuleMenuId,
            subscriptionProductId: productId,
            createdBy: CREATED_BY,
          },
        });
      }
    }
  }
}

async function renameSubscriptionModule(fromName: string, toName: string) {
  const existing = await prisma.subscriptionModule.findFirst({
    where: { subscriptionModuleName: fromName },
  });
  if (!existing) return;

  const clash = await prisma.subscriptionModule.findFirst({
    where: {
      subscriptionProductId: existing.subscriptionProductId,
      subscriptionModuleName: toName,
      NOT: { subscriptionModuleId: existing.subscriptionModuleId },
    },
  });
  if (clash) {
    const clashUrls = new Set(
      (
        await prisma.subscriptionModuleMenu.findMany({
          where: { subscriptionModuleId: clash.subscriptionModuleId },
          select: { menuUrl: true },
        })
      ).map((m) => m.menuUrl)
    );
    const menus = await prisma.subscriptionModuleMenu.findMany({
      where: { subscriptionModuleId: existing.subscriptionModuleId },
    });
    for (const menu of menus) {
      if (clashUrls.has(menu.menuUrl)) continue;
      await prisma.subscriptionModuleMenu.update({
        where: { subscriptionModuleMenuId: menu.subscriptionModuleMenuId },
        data: {
          subscriptionModuleId: clash.subscriptionModuleId,
          modifiedBy: CREATED_BY,
          modifiedDtTm: new Date(),
        },
      });
    }
    await deleteSubscriptionModuleCascade(existing.subscriptionModuleId);
    return;
  }

  await prisma.subscriptionModule.update({
    where: { subscriptionModuleId: existing.subscriptionModuleId },
    data: {
      subscriptionModuleName: toName,
      modifiedBy: CREATED_BY,
      modifiedDtTm: new Date(),
    },
  });
}

/**
 * Collapse duplicate modules with the same name (e.g. CRM under every product)
 * onto a single dedicated product, preserving menus and tenant grants.
 */
async function consolidateModulesOntoProduct(options: {
  moduleName: string;
  targetProductId: number;
  description: string;
}) {
  const { moduleName, targetProductId, description } = options;
  const modules = await prisma.subscriptionModule.findMany({
    where: { subscriptionModuleName: moduleName },
    orderBy: { subscriptionModuleId: "asc" },
  });
  if (modules.length === 0) return;

  const primary =
    modules.find((m) => m.subscriptionProductId === targetProductId) ?? modules[0]!;

  await prisma.subscriptionModule.update({
    where: { subscriptionModuleId: primary.subscriptionModuleId },
    data: {
      subscriptionProductId: targetProductId,
      description,
      sortOrder: 0,
      isActive: true,
      modifiedBy: CREATED_BY,
      modifiedDtTm: new Date(),
    },
  });

  for (const other of modules) {
    if (other.subscriptionModuleId === primary.subscriptionModuleId) continue;

    const otherAccess = await prisma.subscriptionModuleAccess.findMany({
      where: { subscriptionModuleId: other.subscriptionModuleId },
    });
    for (const grant of otherAccess) {
      await prisma.subscriptionModuleAccess.upsert({
        where: {
          subscriptionModuleId_tenantId: {
            subscriptionModuleId: primary.subscriptionModuleId,
            tenantId: grant.tenantId,
          },
        },
        create: {
          subscriptionModuleId: primary.subscriptionModuleId,
          tenantId: grant.tenantId,
          isActive: grant.isActive,
          createdBy: grant.createdBy,
        },
        update: { isActive: true },
      });
    }
    await deleteSubscriptionModuleCascade(other.subscriptionModuleId);
  }
}

async function deleteSubscriptionModuleCascade(subscriptionModuleId: number) {
  await prisma.subscriptionModuleAccess.deleteMany({
    where: { subscriptionModuleId },
  });
  await prisma.subscriptionModuleMenu.updateMany({
    where: { subscriptionModuleId },
    data: { parentMenuId: null },
  });
  // Menu→product links cascade when menus are deleted.
  await prisma.subscriptionModuleMenu.deleteMany({
    where: { subscriptionModuleId },
  });
  await prisma.subscriptionModule.delete({
    where: { subscriptionModuleId },
  });
}

async function deleteSubscriptionProductCascade(subscriptionProductId: number) {
  await prisma.subscriptionModuleMenuProduct.deleteMany({
    where: { subscriptionProductId },
  });
  const modules = await prisma.subscriptionModule.findMany({
    where: { subscriptionProductId },
    select: { subscriptionModuleId: true },
  });
  for (const mod of modules) {
    await deleteSubscriptionModuleCascade(mod.subscriptionModuleId);
  }
  await prisma.subscriptionProduct.delete({
    where: { subscriptionProductId },
  });
}

/** Remove soft-deleted catalog rows so inactive products/modules never linger in the UI. */
async function purgeInactiveSubscriptionCatalog() {
  const inactiveModules = await prisma.subscriptionModule.findMany({
    where: { isActive: false },
    select: { subscriptionModuleId: true },
  });
  for (const mod of inactiveModules) {
    await deleteSubscriptionModuleCascade(mod.subscriptionModuleId);
  }

  const inactiveProducts = await prisma.subscriptionProduct.findMany({
    where: { isActive: false },
    select: { subscriptionProductId: true },
  });
  for (const product of inactiveProducts) {
    await deleteSubscriptionProductCascade(product.subscriptionProductId);
  }
}

async function seedAviation() {
  const fullService = await prisma.airlineType.upsert({
    where: { airlineTypeName: "Full Service" },
    create: {
      airlineTypeName: "Full Service",
      isActive: true,
      createdBy: CREATED_BY,
    },
    update: { isActive: true },
  });
  await prisma.airlineType.upsert({
    where: { airlineTypeName: "Low Cost" },
    create: {
      airlineTypeName: "Low Cost",
      isActive: true,
      createdBy: CREATED_BY,
    },
    update: { isActive: true },
  });

  await prisma.airline.upsert({
    where: { airlineCode: "EK" },
    create: {
      airlineTypeId: fullService.airlineTypeId,
      airlineCode: "EK",
      airlineName: "Emirates",
      airlineNumericCode: 176,
      pnrMaxDigit: 6,
      tktMaxDigit: 13,
      isTktNumberOnly: false,
      isActive: true,
      createdBy: CREATED_BY,
    },
    update: {
      airlineTypeId: fullService.airlineTypeId,
      airlineName: "Emirates",
      isActive: true,
    },
  });

  const ae = await prisma.country.findUnique({ where: { countryCode: "AE" } });
  const dubai = ae
    ? await prisma.city.findFirst({ where: { countryId: ae.countryId, cityCode: "DUBAI" } })
    : null;
  if (ae && dubai) {
    await prisma.airport.upsert({
      where: { airportCode: "DXB" },
      create: {
        airportCode: "DXB",
        airportName: "Dubai International Airport",
        countryId: ae.countryId,
        cityId: dubai.cityId,
        parentAirportId: 0,
        latitude: "25.2532",
        longitude: "55.3657",
        isActive: true,
        createdBy: CREATED_BY,
      },
      update: {
        airportName: "Dubai International Airport",
        countryId: ae.countryId,
        cityId: dubai.cityId,
        isActive: true,
      },
    });
  }
}

async function seedCompanies() {
  const ae = await prisma.country.findUnique({ where: { countryCode: "AE" } });
  const dubai = ae
    ? await prisma.city.findFirst({ where: { countryId: ae.countryId, cityCode: "DUBAI" } })
    : null;
  const usd = await prisma.currency.findUnique({ where: { currencyCode: "USD" } });
  if (!ae || !dubai || !usd) return;

  const rows = [
    {
      companyUid: "company_leisure",
      companyCode: "regencyTravel",
      companyName: "Regency Travel & Tours",
    },
    {
      companyUid: "company_myholidays",
      companyCode: "myHolidays",
      companyName: "MyHolidays",
    },
    {
      companyUid: "company_alasmakh",
      companyCode: "alAsmakhRealEstate",
      companyName: "Al Asmakh Real Estate",
    },
    {
      companyUid: "company_corporate",
      companyCode: "regencyCorporate",
      companyName: "Regency Corporate Travel",
    },
  ] as const;

  for (const row of rows) {
    await prisma.company.upsert({
      where: { companyUid: row.companyUid },
      create: {
        companyUid: row.companyUid,
        companyCode: row.companyCode,
        companyName: row.companyName,
        address1: "Business Bay",
        address2: "Dubai",
        countryId: ae.countryId,
        cityId: dubai.cityId,
        currencyId: usd.currencyId,
        zipCode: "00000",
        countryDialCode: "+971",
        contactNumber: null,
        emailAddress: null,
        isActive: true,
        isRoundOff: false,
        noOfSignificantDigits: 2,
        isDisplayNumberInThousands: false,
        tenantId: 1,
        companyLogo: "",
        companyFavIcon: "",
        createdBy: CREATED_BY,
      },
      update: {
        companyName: row.companyName,
        companyCode: row.companyCode,
        isActive: true,
        countryId: ae.countryId,
        cityId: dubai.cityId,
        currencyId: usd.currencyId,
      },
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"Company"', 'CompanyID'), (SELECT COALESCE(MAX("CompanyID"), 1) FROM "Company"))`
  );
}

async function seedDepartments() {
  const leisure = await prisma.company.findUnique({ where: { companyUid: "company_leisure" } });
  if (!leisure) return;

  const rows = [
    { departmentCode: "SALES", departmentName: "Sales" },
    { departmentCode: "OPS", departmentName: "Operations" },
    { departmentCode: "FIN", departmentName: "Finance" },
    { departmentCode: "HR", departmentName: "Human Resources" },
  ] as const;

  for (const row of rows) {
    await prisma.department.upsert({
      where: {
        tenantId_companyId_departmentCode: {
          tenantId: leisure.tenantId,
          companyId: leisure.companyId,
          departmentCode: row.departmentCode,
        },
      },
      create: {
        departmentCode: row.departmentCode,
        departmentName: row.departmentName,
        tenantId: leisure.tenantId,
        companyId: leisure.companyId,
        isActive: true,
        createdBy: CREATED_BY,
      },
      update: {
        departmentName: row.departmentName,
        isActive: true,
      },
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"Department"', 'DepartmentID'), (SELECT COALESCE(MAX("DepartmentID"), 1) FROM "Department"))`
  );
}

async function seedDesignations() {
  const leisure = await prisma.company.findUnique({ where: { companyUid: "company_leisure" } });
  if (!leisure) return;

  const rows = [
    { designationCode: "MGR", designationName: "Manager" },
    { designationCode: "EXE", designationName: "Executive" },
    { designationCode: "SR_EXE", designationName: "Senior Executive" },
    { designationCode: "TL", designationName: "Team Lead" },
  ] as const;

  for (const row of rows) {
    await prisma.designation.upsert({
      where: {
        tenantId_companyId_designationCode: {
          tenantId: leisure.tenantId,
          companyId: leisure.companyId,
          designationCode: row.designationCode,
        },
      },
      create: {
        designationCode: row.designationCode,
        designationName: row.designationName,
        tenantId: leisure.tenantId,
        companyId: leisure.companyId,
        isActive: true,
        createdBy: CREATED_BY,
      },
      update: {
        designationName: row.designationName,
        isActive: true,
      },
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"Designation"', 'DesignationID'), (SELECT COALESCE(MAX("DesignationID"), 1) FROM "Designation"))`
  );
}

async function seedBranchTypes() {
  const leisure = await prisma.company.findUnique({ where: { companyUid: "company_leisure" } });
  const corporate = await prisma.company.findUnique({ where: { companyUid: "company_corporate" } });
  if (!leisure || !corporate) return;

  const names = ["Head Office", "Branch Office", "Regional Office", "Sales Office"];

  for (const company of [leisure, corporate]) {
    for (const branchTypeName of names) {
      await prisma.branchType.upsert({
        where: {
          tenantId_companyId_branchTypeName: {
            tenantId: company.tenantId,
            companyId: company.companyId,
            branchTypeName,
          },
        },
        create: {
          branchTypeName,
          tenantId: company.tenantId,
          companyId: company.companyId,
          isActive: true,
          createdBy: CREATED_BY,
        },
        update: { isActive: true },
      });
    }
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"BranchType"', 'BranchTypeID'), (SELECT COALESCE(MAX("BranchTypeID"), 1) FROM "BranchType"))`
  );
}

async function seedPropertyTypes() {
  const leisure = await prisma.company.findUnique({ where: { companyUid: "company_leisure" } });
  const corporate = await prisma.company.findUnique({ where: { companyUid: "company_corporate" } });
  if (!leisure || !corporate) return;

  const names = [
    "Hotel",
    "Apartment",
    "Villa",
    "Resort",
    "Camp",
    "Office",
    "Warehouse",
    "Retail Shop",
    "Building",
    "Land",
    "Holiday Home",
    "Staff Accommodation",
    "Labour Camp",
    "Rental Property",
    "Commercial Property",
    "Mixed Use Building",
  ];

  for (const company of [leisure, corporate]) {
    for (const propertyTypeName of names) {
      await prisma.propertyType.upsert({
        where: {
          tenantId_companyId_propertyTypeName: {
            tenantId: company.tenantId,
            companyId: company.companyId,
            propertyTypeName,
          },
        },
        create: {
          propertyTypeName,
          tenantId: company.tenantId,
          companyId: company.companyId,
          isActive: true,
          createdBy: CREATED_BY,
        },
        update: { isActive: true },
      });
    }

    // Drop short-lived seed alias replaced by "Commercial Property".
    await prisma.propertyType.deleteMany({
      where: {
        tenantId: company.tenantId,
        companyId: company.companyId,
        propertyTypeName: "Commercial",
      },
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"PropertyType"', 'PropertyTypeID'), (SELECT COALESCE(MAX("PropertyTypeID"), 1) FROM "PropertyType"))`
  );
}

async function seedNamedPropertyMasters() {
  const leisure = await prisma.company.findUnique({ where: { companyUid: "company_leisure" } });
  const corporate = await prisma.company.findUnique({ where: { companyUid: "company_corporate" } });
  if (!leisure || !corporate) return;

  const catalogs: {
    names: string[];
    upsert: (companyId: number, tenantId: number, name: string) => Promise<unknown>;
    table: string;
    idColumn: string;
  }[] = [
    {
      names: ["Luxury", "Budget", "Midscale", "Upscale", "Economy"],
      upsert: (companyId, tenantId, propertyCategoryName) =>
        prisma.propertyCategory.upsert({
          where: {
            tenantId_companyId_propertyCategoryName: { tenantId, companyId, propertyCategoryName },
          },
          create: {
            propertyCategoryName,
            tenantId,
            companyId,
            isActive: true,
            createdBy: CREATED_BY,
          },
          update: { isActive: true },
        }),
      table: "PropertyCategory",
      idColumn: "PropertyCategoryID",
    },
    {
      names: ["Rental", "Owned", "Leasing"],
      upsert: (companyId, tenantId, propertyUsageName) =>
        prisma.propertyUsage.upsert({
          where: {
            tenantId_companyId_propertyUsageName: { tenantId, companyId, propertyUsageName },
          },
          create: {
            propertyUsageName,
            tenantId,
            companyId,
            isActive: true,
            createdBy: CREATED_BY,
          },
          update: { isActive: true },
        }),
      table: "PropertyUsage",
      idColumn: "PropertyUsageID",
    },
    {
      names: ["Company Owned", "Third Party"],
      upsert: (companyId, tenantId, ownershipTypeName) =>
        prisma.ownershipType.upsert({
          where: {
            tenantId_companyId_ownershipTypeName: { tenantId, companyId, ownershipTypeName },
          },
          create: {
            ownershipTypeName,
            tenantId,
            companyId,
            isActive: true,
            createdBy: CREATED_BY,
          },
          update: { isActive: true },
        }),
      table: "OwnershipType",
      idColumn: "OwnershipTypeID",
    },
    {
      names: ["Hilton", "Accor", "Marriott", "IHG", "Independent"],
      upsert: (companyId, tenantId, propertyBrandName) =>
        prisma.propertyBrand.upsert({
          where: {
            tenantId_companyId_propertyBrandName: { tenantId, companyId, propertyBrandName },
          },
          create: {
            propertyBrandName,
            tenantId,
            companyId,
            isActive: true,
            createdBy: CREATED_BY,
          },
          update: { isActive: true },
        }),
      table: "PropertyBrand",
      idColumn: "PropertyBrandID",
    },
  ];

  for (const company of [leisure, corporate]) {
    for (const catalog of catalogs) {
      for (const name of catalog.names) {
        await catalog.upsert(company.companyId, company.tenantId, name);
      }
    }
  }

  for (const catalog of catalogs) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${catalog.table}"', '${catalog.idColumn}'), (SELECT COALESCE(MAX("${catalog.idColumn}"), 1) FROM "${catalog.table}"))`
    );
  }
}

async function seedProperties() {
  const leisure = await prisma.company.findUnique({ where: { companyUid: "company_leisure" } });
  if (!leisure) return;

  const qa = await prisma.country.findUnique({ where: { countryCode: "QA" } });
  if (!qa) return;
  const doha = await prisma.city.findFirst({
    where: { countryId: qa.countryId, cityCode: "DOHA" },
  });

  const hotelType = await prisma.propertyType.findFirst({
    where: { tenantId: leisure.tenantId, companyId: leisure.companyId, propertyTypeName: "Hotel" },
  });
  if (!hotelType) return;

  const apartmentType = await prisma.propertyType.findFirst({
    where: { tenantId: leisure.tenantId, companyId: leisure.companyId, propertyTypeName: "Apartment" },
  });
  const luxury = await prisma.propertyCategory.findFirst({
    where: { tenantId: leisure.tenantId, companyId: leisure.companyId, propertyCategoryName: "Luxury" },
  });
  const midscale = await prisma.propertyCategory.findFirst({
    where: { tenantId: leisure.tenantId, companyId: leisure.companyId, propertyCategoryName: "Midscale" },
  });
  const rental = await prisma.propertyUsage.findFirst({
    where: { tenantId: leisure.tenantId, companyId: leisure.companyId, propertyUsageName: "Rental" },
  });
  const companyOwned = await prisma.ownershipType.findFirst({
    where: {
      tenantId: leisure.tenantId,
      companyId: leisure.companyId,
      ownershipTypeName: "Company Owned",
    },
  });
  const hilton = await prisma.propertyBrand.findFirst({
    where: { tenantId: leisure.tenantId, companyId: leisure.companyId, propertyBrandName: "Hilton" },
  });

  const samples: {
    propertyCode: string;
    propertyName: string;
    propertyDisplayName: string;
    shortDescription: string;
    addressLine1: string;
    streetName: string;
    zoneNumber: string;
    landmark: string;
    latitude: number;
    longitude: number;
    starRating: number;
    rating: number;
    isFeatured: boolean;
    isPublished: boolean;
    typeIds: number[];
    categoryIds: number[];
  }[] = [
    {
      propertyCode: "HTL-DOH-001",
      propertyName: "Hilton Doha Corniche",
      propertyDisplayName: "Hilton Doha Corniche",
      shortDescription: "Waterfront luxury hotel on the Corniche.",
      addressLine1: "Corniche Road",
      streetName: "Corniche Road",
      zoneNumber: "60",
      landmark: "Near Museum of Islamic Art",
      latitude: 25.2867,
      longitude: 51.5333,
      starRating: 5,
      rating: 4.75,
      isFeatured: true,
      isPublished: true,
      typeIds: [hotelType.propertyTypeId],
      categoryIds: luxury ? [luxury.propertyCategoryId] : [],
    },
    {
      propertyCode: "HTL-DOH-002",
      propertyName: "Hilton Garden Inn West Bay",
      propertyDisplayName: "Hilton Garden Inn West Bay",
      shortDescription: "Business-friendly stay in West Bay.",
      addressLine1: "Diplomatic Street",
      streetName: "Diplomatic Street",
      zoneNumber: "61",
      landmark: "West Bay business district",
      latitude: 25.325,
      longitude: 51.531,
      starRating: 4,
      rating: 4.2,
      isFeatured: false,
      isPublished: true,
      typeIds: [hotelType.propertyTypeId, ...(apartmentType ? [apartmentType.propertyTypeId] : [])],
      categoryIds: [
        ...(luxury ? [luxury.propertyCategoryId] : []),
        ...(midscale ? [midscale.propertyCategoryId] : []),
      ],
    },
  ];

  for (const sample of samples) {
    const addressFields = {
      addressLine1: sample.addressLine1,
      streetName: sample.streetName,
      zoneNumber: sample.zoneNumber,
      countryId: qa.countryId,
      cityId: doha?.cityId ?? null,
      landmark: sample.landmark,
      latitude: sample.latitude,
      longitude: sample.longitude,
      googleMapUrl: `https://www.google.com/maps?q=${sample.latitude},${sample.longitude}`,
    };

    const row = await prisma.property.upsert({
      where: {
        tenantId_companyId_propertyCode: {
          tenantId: leisure.tenantId,
          companyId: leisure.companyId,
          propertyCode: sample.propertyCode,
        },
      },
      create: {
        tenantId: leisure.tenantId,
        companyId: leisure.companyId,
        propertyCode: sample.propertyCode,
        propertyName: sample.propertyName,
        propertyDisplayName: sample.propertyDisplayName,
        shortDescription: sample.shortDescription,
        propertyUsageId: rental?.propertyUsageId ?? null,
        ownershipTypeId: companyOwned?.ownershipTypeId ?? null,
        propertyBrandId: hilton?.propertyBrandId ?? null,
        ...addressFields,
        openingDate: new Date("2018-01-15"),
        rating: sample.rating,
        starRating: sample.starRating,
        isFeatured: sample.isFeatured,
        isPublished: sample.isPublished,
        isActive: true,
        createdBy: CREATED_BY,
        typeLinks: { create: sample.typeIds.map((propertyTypeId) => ({ propertyTypeId })) },
        categoryLinks: {
          create: sample.categoryIds.map((propertyCategoryId) => ({ propertyCategoryId })),
        },
      },
      update: {
        propertyName: sample.propertyName,
        propertyDisplayName: sample.propertyDisplayName,
        shortDescription: sample.shortDescription,
        propertyUsageId: rental?.propertyUsageId ?? null,
        ownershipTypeId: companyOwned?.ownershipTypeId ?? null,
        propertyBrandId: hilton?.propertyBrandId ?? null,
        ...addressFields,
        rating: sample.rating,
        starRating: sample.starRating,
        isFeatured: sample.isFeatured,
        isPublished: sample.isPublished,
        isActive: true,
      },
    });

    await prisma.propertyTypeLink.deleteMany({ where: { propertyId: row.propertyId } });
    await prisma.propertyCategoryLink.deleteMany({ where: { propertyId: row.propertyId } });
    if (sample.typeIds.length) {
      await prisma.propertyTypeLink.createMany({
        data: sample.typeIds.map((propertyTypeId) => ({
          propertyId: row.propertyId,
          propertyTypeId,
        })),
        skipDuplicates: true,
      });
    }
    if (sample.categoryIds.length) {
      await prisma.propertyCategoryLink.createMany({
        data: sample.categoryIds.map((propertyCategoryId) => ({
          propertyId: row.propertyId,
          propertyCategoryId,
        })),
        skipDuplicates: true,
      });
    }
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"Property"', 'PropertyID'), (SELECT COALESCE(MAX("PropertyID"), 1) FROM "Property"))`
  );
}

async function seedBranches() {
  const leisure = await prisma.company.findUnique({ where: { companyUid: "company_leisure" } });
  const corporate = await prisma.company.findUnique({ where: { companyUid: "company_corporate" } });
  if (!leisure || !corporate) return;

  const headOfficeLeisure = await prisma.branchType.findUnique({
    where: {
      tenantId_companyId_branchTypeName: {
        tenantId: leisure.tenantId,
        companyId: leisure.companyId,
        branchTypeName: "Head Office",
      },
    },
  });
  const branchOfficeLeisure = await prisma.branchType.findUnique({
    where: {
      tenantId_companyId_branchTypeName: {
        tenantId: leisure.tenantId,
        companyId: leisure.companyId,
        branchTypeName: "Branch Office",
      },
    },
  });
  const branchOfficeCorporate = await prisma.branchType.findUnique({
    where: {
      tenantId_companyId_branchTypeName: {
        tenantId: corporate.tenantId,
        companyId: corporate.companyId,
        branchTypeName: "Branch Office",
      },
    },
  });
  const inCountry = await prisma.country.findUnique({ where: { countryCode: "IN" } });
  const aeCountry = await prisma.country.findUnique({ where: { countryCode: "AE" } });
  const gbCountry = await prisma.country.findUnique({ where: { countryCode: "GB" } });
  if (
    !leisure ||
    !corporate ||
    !headOfficeLeisure ||
    !branchOfficeLeisure ||
    !branchOfficeCorporate ||
    !inCountry ||
    !aeCountry ||
    !gbCountry
  )
    return;

  const mumbai = await prisma.city.findFirst({ where: { countryId: inCountry.countryId, cityCode: "MUMBAI" } });
  const dubai = await prisma.city.findFirst({ where: { countryId: aeCountry.countryId, cityCode: "DUBAI" } });
  const london = await prisma.city.findFirst({ where: { countryId: gbCountry.countryId, cityCode: "LONDON" } });
  if (!mumbai || !dubai || !london) return;

  const rows = [
    {
      branchUid: "branch_mumbai",
      branchTypeId: headOfficeLeisure.branchTypeId,
      branchName: "Mumbai",
      companyId: leisure.companyId,
      countryId: inCountry.countryId,
      cityId: mumbai.cityId,
      dialCode: "91",
    },
    {
      branchUid: "branch_dubai",
      branchTypeId: branchOfficeLeisure.branchTypeId,
      branchName: "Dubai",
      companyId: leisure.companyId,
      countryId: aeCountry.countryId,
      cityId: dubai.cityId,
      dialCode: "971",
    },
    {
      branchUid: "branch_london",
      branchTypeId: branchOfficeCorporate.branchTypeId,
      branchName: "London",
      companyId: corporate.companyId,
      countryId: gbCountry.countryId,
      cityId: london.cityId,
      dialCode: "44",
    },
  ] as const;

  for (const row of rows) {
    const company = row.companyId === leisure.companyId ? leisure : corporate;
    await prisma.branch.upsert({
      where: { branchUid: row.branchUid },
      create: {
        branchUid: row.branchUid,
        branchTypeId: row.branchTypeId,
        branchName: row.branchName,
        companyId: row.companyId,
        tenantId: company.tenantId,
        address1: "Business Bay",
        address2: "",
        countryId: row.countryId,
        cityId: row.cityId,
        zipCode: "00000",
        contactPerson: "Branch Manager",
        emailAddress: "branch@example.com",
        countryDialCode: row.dialCode,
        phoneNumber: "0000000",
        faxNumber: null,
        isActive: true,
        createdBy: CREATED_BY,
      },
      update: {
        branchTypeId: row.branchTypeId,
        branchName: row.branchName,
        companyId: row.companyId,
        tenantId: company.tenantId,
        countryId: row.countryId,
        cityId: row.cityId,
        isActive: true,
      },
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"Branch"', 'BranchID'), (SELECT COALESCE(MAX("BranchID"), 1) FROM "Branch"))`
  );
}

async function seedEmployees() {
  const leisure = await prisma.company.findUnique({ where: { companyUid: "company_leisure" } });
  const mumbaiBranch = await prisma.branch.findUnique({ where: { branchUid: "branch_mumbai" } });
  const designation = leisure
    ? await prisma.designation.findFirst({
        where: {
          tenantId: leisure.tenantId,
          companyId: leisure.companyId,
          designationCode: "EXE",
        },
      })
    : null;
  const accessRole = await prisma.accessRole.findFirst({
    where: { tenantId: 1, companyId: 0, accessRoleName: "Tenant Admin" },
  });
  const salesDept = leisure
    ? await prisma.department.findFirst({
        where: {
          tenantId: leisure.tenantId,
          companyId: leisure.companyId,
          departmentCode: "SALES",
        },
      })
    : null;
  const inCountry = await prisma.country.findUnique({ where: { countryCode: "IN" } });
  const mumbai =
    inCountry != null
      ? await prisma.city.findFirst({
          where: { countryId: inCountry.countryId, cityCode: "MUMBAI" },
        })
      : null;

  if (!leisure || !mumbaiBranch || !designation || !accessRole || !inCountry || !mumbai) return;

  const passwordHash = hashPassword(DEMO_PASSWORD);
  const now = new Date();
  const username = "employee@travelsuite.com";
  const employeeNumber = "EMP001";

  const existing = await prisma.employee.findFirst({
    where: {
      tenantId: leisure.tenantId,
      companyId: leisure.companyId,
      employeeNumber,
    },
  });

  if (existing) {
    await prisma.user.update({
      where: { userId: existing.userId },
      data: {
        passwordHash,
        userDisplayName: "Raj Kumar",
        userTypeId: 3,
        isActive: true,
        lastPasswordChangeDtTm: now,
      },
    });
    await prisma.employee.update({
      where: { employeeId: existing.employeeId },
      data: {
        title: "Mr",
        firstName: "Raj",
        lastName: "Kumar",
        gender: "Male",
        countryDialCode: "+91",
        phoneNumber: "9876543210",
        email: username,
        address: "123 Business Park, Mumbai",
        countryId: inCountry.countryId,
        cityId: mumbai.cityId,
        designationId: designation.designationId,
        accessRoleId: accessRole.accessRoleId,
        departmentId: salesDept?.departmentId ?? null,
        branchId: mumbaiBranch.branchId,
        isActive: true,
      },
    });
  } else {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username,
          passwordHash,
          userDisplayName: "Raj Kumar",
          userTypeId: 3,
          tenantId: leisure.tenantId,
          companyId: leisure.companyId,
          isActive: true,
          createdBy: CREATED_BY,
          lastPasswordChangeDtTm: now,
        },
      });

      await tx.employee.create({
        data: {
          title: "Mr",
          firstName: "Raj",
          lastName: "Kumar",
          gender: "Male",
          countryDialCode: "+91",
          phoneNumber: "9876543210",
          faxNumber: null,
          email: username,
          address: "123 Business Park, Mumbai",
          countryId: inCountry.countryId,
          cityId: mumbai.cityId,
          employeeNumber,
          designationId: designation.designationId,
          joiningDate: now,
          accessRoleId: accessRole.accessRoleId,
          departmentId: salesDept?.departmentId ?? null,
          reportingEmployeeId: null,
          companyId: leisure.companyId,
          branchId: mumbaiBranch.branchId,
          userId: user.userId,
          employeeImage: null,
          tenantId: leisure.tenantId,
          isActive: true,
          createdBy: CREATED_BY,
        },
      });
    });
  }

  // Tenant Admin (User.companyId=0) still gets an Employee under a company so
  // session can resolve a logged-in company for company-scoped masters.
  const tenantAdminUser = await prisma.user.findUnique({
    where: { username: "admin@travelsuite.com" },
  });
  if (tenantAdminUser) {
    const adminEmployeeNumber = "EMP-ADMIN";
    const existingAdminEmp = await prisma.employee.findUnique({
      where: { userId: tenantAdminUser.userId },
    });
    if (existingAdminEmp) {
      await prisma.employee.update({
        where: { employeeId: existingAdminEmp.employeeId },
        data: {
          companyId: leisure.companyId,
          branchId: mumbaiBranch.branchId,
          tenantId: leisure.tenantId,
          designationId: designation.designationId,
          accessRoleId: accessRole.accessRoleId,
          departmentId: salesDept?.departmentId ?? null,
          countryId: inCountry.countryId,
          cityId: mumbai.cityId,
          isActive: true,
        },
      });
    } else {
      await prisma.employee.create({
        data: {
          title: "Mr",
          firstName: "Tenant",
          lastName: "Admin",
          gender: "Male",
          countryDialCode: "+91",
          phoneNumber: "9000000001",
          faxNumber: null,
          email: "admin@travelsuite.com",
          address: "Head Office",
          countryId: inCountry.countryId,
          cityId: mumbai.cityId,
          employeeNumber: adminEmployeeNumber,
          designationId: designation.designationId,
          joiningDate: now,
          accessRoleId: accessRole.accessRoleId,
          departmentId: salesDept?.departmentId ?? null,
          reportingEmployeeId: null,
          companyId: leisure.companyId,
          branchId: mumbaiBranch.branchId,
          userId: tenantAdminUser.userId,
          employeeImage: null,
          tenantId: leisure.tenantId,
          isActive: true,
          createdBy: CREATED_BY,
        },
      });
    }
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"Employee"', 'EmployeeID'), (SELECT COALESCE(MAX("EmployeeID"), 1) FROM "Employee"))`
  );
}

async function main() {
  await seedReferenceMasters();
  await seedStateAdministrativeTypes();
  await seedStates();
  await seedCultures();
  await seedTenants();
  await seedTenantCultures();
  await seedRegions();
  await seedUsers();
  await seedAccessRoles();
  await seedAviation();
  await seedSubscriptionCatalog();
  await seedCompanies();
  await seedDepartments();
  await seedDesignations();
  await seedBranchTypes();
  await seedPropertyTypes();
  await seedNamedPropertyMasters();
  await seedProperties();
  await seedBranches();
  await seedEmployees();
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
