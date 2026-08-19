/**
 * Seeds classifications under Transfer / Tour / Activity, plus one example
 * category (Jet Ski) under Activity > Water Sport, for the primary dev tenant/company.
 * Run: npx tsx scripts/seed-service-classifications.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TENANT_ID = 1;
const COMPANY_ID = 1;
const CREATED_BY = 1;

const CLASSIFICATIONS_BY_SERVICE_TYPE: Record<string, { code: string; name: string }[]> = {
  TRANSFER: [
    { code: "AIRPORT_TRANSFER", name: "Airport Transfer" },
    { code: "HOTEL_TRANSFER", name: "Hotel Transfer" },
    { code: "CITY_TRANSFER", name: "City Transfer" },
    { code: "INTERCITY_TRANSFER", name: "Intercity Transfer" },
    { code: "PRIVATE_TRANSFER", name: "Private Transfer" },
    { code: "SHARED_TRANSFER", name: "Shared Transfer" },
  ],
  TOUR: [
    { code: "DAY_TOUR", name: "Day Tour" },
    { code: "HALF_DAY_TOUR", name: "Half Day Tour" },
    { code: "MULTI_DAY_TOUR", name: "Multi Day Tour" },
    { code: "GUIDED_TOUR", name: "Guided Tour" },
    { code: "PRIVATE_TOUR", name: "Private Tour" },
    { code: "GROUP_TOUR", name: "Group Tour" },
  ],
  ACTIVITY: [
    { code: "ADVENTURE", name: "Adventure" },
    { code: "WATER_SPORT", name: "Water Sport" },
    { code: "DESERT_ACTIVITY", name: "Desert Activity" },
    { code: "CULTURAL", name: "Cultural" },
    { code: "WELLNESS", name: "Wellness" },
  ],
};

async function main() {
  const serviceTypes = await prisma.serviceTypeMaster.findMany({
    where: { tenantId: TENANT_ID, companyId: COMPANY_ID, serviceTypeCode: { in: Object.keys(CLASSIFICATIONS_BY_SERVICE_TYPE) } },
  });
  const serviceTypeByCode = new Map(serviceTypes.map((t) => [t.serviceTypeCode, t]));

  for (const [serviceTypeCode, items] of Object.entries(CLASSIFICATIONS_BY_SERVICE_TYPE)) {
    const serviceType = serviceTypeByCode.get(serviceTypeCode);
    if (!serviceType) {
      console.error("Service type not found, skipping:", serviceTypeCode);
      continue;
    }
    for (const [index, item] of items.entries()) {
      const row = await prisma.serviceProductClassificationMaster.upsert({
        where: {
          tenantId_companyId_serviceTypeId_classificationCode: {
            tenantId: TENANT_ID,
            companyId: COMPANY_ID,
            serviceTypeId: serviceType.serviceTypeId,
            classificationCode: item.code,
          },
        },
        create: {
          tenantId: TENANT_ID,
          companyId: COMPANY_ID,
          serviceTypeId: serviceType.serviceTypeId,
          classificationCode: item.code,
          classificationName: item.name,
          displayOrder: index,
          isActive: true,
          createdBy: CREATED_BY,
        },
        update: {
          classificationName: item.name,
          displayOrder: index,
          modifiedBy: CREATED_BY,
          modifiedDtTm: new Date(),
        },
      });
      console.log("Upserted classification", serviceTypeCode, "/", row.classificationCode, Number(row.serviceProductClassificationId));
    }
  }

  // Example category: Activity > Water Sport > Jet Ski
  const activity = serviceTypeByCode.get("ACTIVITY");
  if (activity) {
    const waterSport = await prisma.serviceProductClassificationMaster.findUnique({
      where: {
        tenantId_companyId_serviceTypeId_classificationCode: {
          tenantId: TENANT_ID,
          companyId: COMPANY_ID,
          serviceTypeId: activity.serviceTypeId,
          classificationCode: "WATER_SPORT",
        },
      },
    });
    if (waterSport) {
      const jetSki = await prisma.serviceProductCategory.upsert({
        where: {
          tenantId_companyId_serviceTypeId_categoryCode: {
            tenantId: TENANT_ID,
            companyId: COMPANY_ID,
            serviceTypeId: activity.serviceTypeId,
            categoryCode: "JET_SKI",
          },
        },
        create: {
          tenantId: TENANT_ID,
          companyId: COMPANY_ID,
          serviceTypeId: activity.serviceTypeId,
          serviceProductClassificationId: waterSport.serviceProductClassificationId,
          categoryCode: "JET_SKI",
          categoryName: "Jet Ski",
          displayOrder: 0,
          isActive: true,
          createdBy: CREATED_BY,
        },
        update: {
          serviceProductClassificationId: waterSport.serviceProductClassificationId,
          categoryName: "Jet Ski",
          modifiedBy: CREATED_BY,
          modifiedDtTm: new Date(),
        },
      });
      console.log("Upserted category ACTIVITY / WATER_SPORT /", jetSki.categoryCode, Number(jetSki.serviceProductCategoryId));
    } else {
      console.error("Water Sport classification not found — skipped Jet Ski category");
    }
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
