/**
 * Adds the SIGHTSEEING classification under Tour and its 12 categories,
 * from the user's classification -> category table. Category codes are
 * used exactly as given (no classification prefix needed - verified no
 * collisions with existing TOUR categories).
 *
 * Run: npx tsx scripts/seed-sightseeing-category.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TENANT_ID = 1;
const COMPANY_ID = 1;
const CREATED_BY = 1;

const CATEGORIES: { code: string; name: string }[] = [
  { code: "CITY_SIGHTSEEING", name: "City Sightseeing" },
  { code: "PANORAMIC_SIGHTSEEING", name: "Panoramic Sightseeing" },
  { code: "HOP_ON_HOP_OFF", name: "Hop-on Hop-off" },
  { code: "LANDMARK_SIGHTSEEING", name: "Landmark Sightseeing" },
  { code: "SCENIC_SIGHTSEEING", name: "Scenic Sightseeing" },
  { code: "NIGHT_SIGHTSEEING", name: "Night Sightseeing" },
  { code: "HISTORICAL_SIGHTSEEING", name: "Historical Sightseeing" },
  { code: "CULTURAL_SIGHTSEEING", name: "Cultural Sightseeing" },
  { code: "ARCHITECTURAL_SIGHTSEEING", name: "Architectural Sightseeing" },
  { code: "WATER_SIGHTSEEING", name: "Water Sightseeing" },
  { code: "DESERT_SIGHTSEEING", name: "Desert Sightseeing" },
  { code: "COMBO_SIGHTSEEING", name: "Sightseeing Combo" },
];

async function main() {
  const serviceType = await prisma.serviceTypeMaster.findUnique({
    where: { tenantId_companyId_serviceTypeCode: { tenantId: TENANT_ID, companyId: COMPANY_ID, serviceTypeCode: "TOUR" } },
  });
  if (!serviceType) throw new Error("TOUR service type not found");

  const existingCount = await prisma.serviceProductClassificationMaster.count({
    where: { tenantId: TENANT_ID, companyId: COMPANY_ID, serviceTypeId: serviceType.serviceTypeId },
  });

  const classification = await prisma.serviceProductClassificationMaster.upsert({
    where: {
      tenantId_companyId_serviceTypeId_classificationCode: {
        tenantId: TENANT_ID,
        companyId: COMPANY_ID,
        serviceTypeId: serviceType.serviceTypeId,
        classificationCode: "SIGHTSEEING",
      },
    },
    create: {
      tenantId: TENANT_ID,
      companyId: COMPANY_ID,
      serviceTypeId: serviceType.serviceTypeId,
      classificationCode: "SIGHTSEEING",
      classificationName: "Sightseeing",
      displayOrder: existingCount,
      isActive: true,
      createdBy: CREATED_BY,
    },
    update: { classificationName: "Sightseeing", modifiedBy: CREATED_BY, modifiedDtTm: new Date() },
  });
  console.log("Classification", classification.classificationCode, Number(classification.serviceProductClassificationId));

  for (const [index, item] of CATEGORIES.entries()) {
    const row = await prisma.serviceProductCategory.upsert({
      where: {
        tenantId_companyId_serviceTypeId_categoryCode: {
          tenantId: TENANT_ID,
          companyId: COMPANY_ID,
          serviceTypeId: serviceType.serviceTypeId,
          categoryCode: item.code,
        },
      },
      create: {
        tenantId: TENANT_ID,
        companyId: COMPANY_ID,
        serviceTypeId: serviceType.serviceTypeId,
        serviceProductClassificationId: classification.serviceProductClassificationId,
        categoryCode: item.code,
        categoryName: item.name,
        displayOrder: index,
        isActive: true,
        createdBy: CREATED_BY,
      },
      update: {
        serviceProductClassificationId: classification.serviceProductClassificationId,
        categoryName: item.name,
        displayOrder: index,
        modifiedBy: CREATED_BY,
        modifiedDtTm: new Date(),
      },
    });
    console.log("Category", row.categoryCode, "->", row.categoryName, Number(row.serviceProductCategoryId));
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
