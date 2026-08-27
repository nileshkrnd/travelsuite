/**
 * Seeds CashCustomerTypeMaster and the CASH_CUSTOMER CommonStatusType/CommonStatus
 * lifecycle for the primary dev tenant/company.
 * Run: npx tsx scripts/seed-cash-customer-lookups.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TENANT_ID = 1;
const COMPANY_ID = 1;
const CREATED_BY = 1;

const CUSTOMER_TYPES: { code: string; name: string }[] = [
  { code: "RETAIL", name: "Retail" },
  { code: "WALK_IN", name: "Walk-In" },
];

const CASH_CUSTOMER_STATUSES: { code: string; name: string; isInitial?: boolean; isFinal?: boolean }[] = [
  { code: "ACTIVE", name: "Active", isInitial: true },
  { code: "SUSPENDED", name: "Suspended" },
  { code: "BLACKLISTED", name: "Blacklisted", isFinal: true },
];

async function main() {
  for (const [index, item] of CUSTOMER_TYPES.entries()) {
    const row = await prisma.cashCustomerTypeMaster.upsert({
      where: { tenantId_companyId_customerTypeCode: { tenantId: TENANT_ID, companyId: COMPANY_ID, customerTypeCode: item.code } },
      create: {
        tenantId: TENANT_ID,
        companyId: COMPANY_ID,
        customerTypeCode: item.code,
        customerTypeName: item.name,
        displayOrder: index,
        isActive: true,
        createdBy: CREATED_BY,
      },
      update: { customerTypeName: item.name, displayOrder: index, modifiedBy: CREATED_BY, modifiedDtTm: new Date() },
    });
    console.log("CashCustomerTypeMaster", row.customerTypeCode, Number(row.cashCustomerTypeId));
  }

  const statusType = await prisma.commonStatusType.upsert({
    where: { tenantId_companyId_statusTypeCode: { tenantId: TENANT_ID, companyId: COMPANY_ID, statusTypeCode: "CASH_CUSTOMER" } },
    create: { tenantId: TENANT_ID, companyId: COMPANY_ID, statusTypeCode: "CASH_CUSTOMER", statusTypeName: "Cash Customer", isActive: true, createdBy: CREATED_BY },
    update: { statusTypeName: "Cash Customer", modifiedBy: CREATED_BY, modifiedDtTm: new Date() },
  });
  console.log("CommonStatusType", statusType.statusTypeCode, Number(statusType.commonStatusTypeId));

  for (const [index, item] of CASH_CUSTOMER_STATUSES.entries()) {
    const row = await prisma.commonStatus.upsert({
      where: {
        tenantId_companyId_commonStatusTypeId_statusCode: {
          tenantId: TENANT_ID,
          companyId: COMPANY_ID,
          commonStatusTypeId: statusType.commonStatusTypeId,
          statusCode: item.code,
        },
      },
      create: {
        tenantId: TENANT_ID,
        companyId: COMPANY_ID,
        commonStatusTypeId: statusType.commonStatusTypeId,
        statusCode: item.code,
        statusName: item.name,
        displayOrder: index,
        isInitial: item.isInitial ?? false,
        isFinal: item.isFinal ?? false,
        isActive: true,
        createdBy: CREATED_BY,
      },
      update: {
        statusName: item.name,
        displayOrder: index,
        isInitial: item.isInitial ?? false,
        isFinal: item.isFinal ?? false,
        modifiedBy: CREATED_BY,
        modifiedDtTm: new Date(),
      },
    });
    console.log("CommonStatus CASH_CUSTOMER /", row.statusCode, Number(row.commonStatusId));
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
