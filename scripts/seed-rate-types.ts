/**
 * Seeds RateTypeGroupMaster (6 rows) and RateType (11 rows) from the user's spec.
 * Run: npx tsx scripts/seed-rate-types.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TENANT_ID = 1;
const COMPANY_ID = 1;
const CREATED_BY = 1;

const GROUPS: { code: string; name: string }[] = [
  { code: "PAX", name: "Passenger" },
  { code: "UNIT", name: "Unit" },
  { code: "VEHICLE", name: "Vehicle" },
  { code: "GROUP", name: "Group" },
  { code: "ROOM", name: "Room" },
  { code: "APPLICATION", name: "Application" },
];

const RATE_TYPES: { code: string; name: string; groupCode: string; isPaxType: boolean; isQuantityType: boolean }[] = [
  { code: "ADULT", name: "Adult", groupCode: "PAX", isPaxType: true, isQuantityType: false },
  { code: "CHILD", name: "Child", groupCode: "PAX", isPaxType: true, isQuantityType: false },
  { code: "INFANT", name: "Infant", groupCode: "PAX", isPaxType: true, isQuantityType: false },
  { code: "YOUTH", name: "Youth", groupCode: "PAX", isPaxType: true, isQuantityType: false },
  { code: "SENIOR", name: "Senior", groupCode: "PAX", isPaxType: true, isQuantityType: false },
  { code: "PERSON", name: "Person", groupCode: "PAX", isPaxType: true, isQuantityType: false },
  { code: "VEHICLE", name: "Vehicle", groupCode: "VEHICLE", isPaxType: false, isQuantityType: true },
  { code: "GROUP", name: "Group", groupCode: "GROUP", isPaxType: false, isQuantityType: true },
  { code: "ROOM", name: "Room", groupCode: "ROOM", isPaxType: false, isQuantityType: true },
  { code: "UNIT", name: "Unit", groupCode: "UNIT", isPaxType: false, isQuantityType: true },
  { code: "APPLICANT", name: "Applicant", groupCode: "APPLICATION", isPaxType: true, isQuantityType: false },
];

async function main() {
  const groupByCode = new Map<string, bigint>();
  for (const [index, g] of GROUPS.entries()) {
    const row = await prisma.rateTypeGroupMaster.upsert({
      where: {
        tenantId_companyId_rateTypeGroupCode: { tenantId: TENANT_ID, companyId: COMPANY_ID, rateTypeGroupCode: g.code },
      },
      create: {
        tenantId: TENANT_ID,
        companyId: COMPANY_ID,
        rateTypeGroupCode: g.code,
        rateTypeGroupName: g.name,
        displayOrder: index,
        isActive: true,
        createdBy: CREATED_BY,
      },
      update: { rateTypeGroupName: g.name, displayOrder: index, modifiedBy: CREATED_BY, modifiedDtTm: new Date() },
    });
    groupByCode.set(g.code, row.rateTypeGroupId);
    console.log("RateTypeGroup", row.rateTypeGroupCode, Number(row.rateTypeGroupId));
  }

  for (const [index, rt] of RATE_TYPES.entries()) {
    const groupId = groupByCode.get(rt.groupCode);
    const row = await prisma.rateType.upsert({
      where: {
        tenantId_companyId_rateTypeCode: { tenantId: TENANT_ID, companyId: COMPANY_ID, rateTypeCode: rt.code },
      },
      create: {
        tenantId: TENANT_ID,
        companyId: COMPANY_ID,
        rateTypeCode: rt.code,
        rateTypeName: rt.name,
        rateTypeGroupId: groupId ?? null,
        isPaxType: rt.isPaxType,
        isQuantityType: rt.isQuantityType,
        displayOrder: index,
        isActive: true,
        createdBy: CREATED_BY,
      },
      update: {
        rateTypeName: rt.name,
        rateTypeGroupId: groupId ?? null,
        isPaxType: rt.isPaxType,
        isQuantityType: rt.isQuantityType,
        displayOrder: index,
        modifiedBy: CREATED_BY,
        modifiedDtTm: new Date(),
      },
    });
    console.log("RateType", row.rateTypeCode, Number(row.rateTypeId));
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
