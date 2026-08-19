/**
 * Seeds the standard Service Type catalog for the primary dev tenant/company.
 * Run: npx tsx scripts/seed-service-types.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TENANT_ID = 1;
const COMPANY_ID = 1;
const CREATED_BY = 1;

const SERVICE_TYPES: { code: string; name: string }[] = [
  { code: "FLIGHT", name: "Flight" },
  { code: "HOTEL", name: "Hotel" },
  { code: "TRANSFER", name: "Transfer" },
  { code: "VISA", name: "Visa" },
  { code: "CAR_HIRE", name: "Car Hire" },
  { code: "CRUISE", name: "Cruise" },
  { code: "RAIL", name: "Rail" },
  { code: "INSURANCE", name: "Insurance" },
  { code: "TOUR", name: "Tour" },
  { code: "ACTIVITY", name: "Activity" },
  { code: "SIGHTSEEING", name: "Sightseeing" },
  { code: "PACKAGE", name: "Package" },
  { code: "MISCELLANEOUS", name: "Miscellaneous" },
];

async function main() {
  for (const [index, item] of SERVICE_TYPES.entries()) {
    const row = await prisma.serviceTypeMaster.upsert({
      where: {
        tenantId_companyId_serviceTypeCode: {
          tenantId: TENANT_ID,
          companyId: COMPANY_ID,
          serviceTypeCode: item.code,
        },
      },
      create: {
        tenantId: TENANT_ID,
        companyId: COMPANY_ID,
        serviceTypeCode: item.code,
        serviceTypeName: item.name,
        displayOrder: index,
        isActive: true,
        createdBy: CREATED_BY,
      },
      update: {
        serviceTypeName: item.name,
        displayOrder: index,
        modifiedBy: CREATED_BY,
        modifiedDtTm: new Date(),
      },
    });
    console.log("Upserted", row.serviceTypeCode, Number(row.serviceTypeId));
  }
  console.log("Service types seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
