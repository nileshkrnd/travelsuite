/**
 * Seeds DurationUnit, BookingModel, PricingModel, CommonStatusType, and
 * CommonStatus (under Service Product) for the primary dev tenant/company.
 * Run: npx tsx scripts/seed-common-lookups.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TENANT_ID = 1;
const COMPANY_ID = 1;
const CREATED_BY = 1;

const DURATION_UNITS = ["MINUTE", "HOUR", "DAY", "NIGHT", "WEEK", "MONTH"];

const BOOKING_MODELS: { code: string; name: string }[] = [
  { code: "DATE", name: "Date" },
  { code: "DATE_TIME", name: "Date & Time" },
  { code: "TIME_SLOT", name: "Time Slot" },
  { code: "REQUEST", name: "Request" },
  { code: "OPEN_DATE", name: "Open Date" },
  { code: "MULTI_DAY", name: "Multi Day" },
];

const PRICING_MODELS: { code: string; name: string }[] = [
  { code: "PER_PERSON", name: "Per Person" },
  { code: "PER_ADULT", name: "Per Adult" },
  { code: "PER_CHILD", name: "Per Child" },
  { code: "PER_INFANT", name: "Per Infant" },
  { code: "PER_VEHICLE", name: "Per Vehicle" },
  { code: "PER_GROUP", name: "Per Group" },
  { code: "PER_ROOM", name: "Per Room" },
  { code: "PER_UNIT", name: "Per Unit" },
  { code: "PER_DAY", name: "Per Day" },
  { code: "PER_HOUR", name: "Per Hour" },
  { code: "FLAT", name: "Flat" },
];

const STATUS_TYPES: { code: string; name: string }[] = [
  { code: "TENANT_REGISTRATION", name: "Tenant Registration" },
  { code: "PROPERTY", name: "Property" },
  { code: "SERVICE_PRODUCT", name: "Service Product" },
  { code: "SUPPLIER", name: "Supplier" },
  { code: "CONTRACT", name: "Contract" },
  { code: "BOOKING", name: "Booking" },
  { code: "PURCHASE_ORDER", name: "Purchase Order" },
  { code: "INVOICE", name: "Invoice" },
];

const SERVICE_PRODUCT_STATUSES: { code: string; name: string; isInitial?: boolean; isFinal?: boolean }[] = [
  { code: "DRAFT", name: "Draft", isInitial: true },
  { code: "UNDER_REVIEW", name: "Under Review" },
  { code: "CHANGES_REQUIRED", name: "Changes Required" },
  { code: "APPROVED", name: "Approved" },
  { code: "PUBLISHED", name: "Published", isFinal: true },
  { code: "SUSPENDED", name: "Suspended" },
  { code: "REJECTED", name: "Rejected", isFinal: true },
  { code: "ARCHIVED", name: "Archived", isFinal: true },
];

async function main() {
  for (const [index, code] of DURATION_UNITS.entries()) {
    const name = code.charAt(0) + code.slice(1).toLowerCase();
    const row = await prisma.durationUnit.upsert({
      where: { tenantId_companyId_durationUnitCode: { tenantId: TENANT_ID, companyId: COMPANY_ID, durationUnitCode: code } },
      create: { tenantId: TENANT_ID, companyId: COMPANY_ID, durationUnitCode: code, durationUnitName: name, displayOrder: index, isActive: true, createdBy: CREATED_BY },
      update: { durationUnitName: name, displayOrder: index, modifiedBy: CREATED_BY, modifiedDtTm: new Date() },
    });
    console.log("DurationUnit", row.durationUnitCode, Number(row.durationUnitId));
  }

  for (const [index, item] of BOOKING_MODELS.entries()) {
    const row = await prisma.bookingModel.upsert({
      where: { tenantId_companyId_bookingModelCode: { tenantId: TENANT_ID, companyId: COMPANY_ID, bookingModelCode: item.code } },
      create: { tenantId: TENANT_ID, companyId: COMPANY_ID, bookingModelCode: item.code, bookingModelName: item.name, displayOrder: index, isActive: true, createdBy: CREATED_BY },
      update: { bookingModelName: item.name, displayOrder: index, modifiedBy: CREATED_BY, modifiedDtTm: new Date() },
    });
    console.log("BookingModel", row.bookingModelCode, Number(row.bookingModelId));
  }

  for (const [index, item] of PRICING_MODELS.entries()) {
    const row = await prisma.pricingModel.upsert({
      where: { tenantId_companyId_pricingModelCode: { tenantId: TENANT_ID, companyId: COMPANY_ID, pricingModelCode: item.code } },
      create: { tenantId: TENANT_ID, companyId: COMPANY_ID, pricingModelCode: item.code, pricingModelName: item.name, displayOrder: index, isActive: true, createdBy: CREATED_BY },
      update: { pricingModelName: item.name, displayOrder: index, modifiedBy: CREATED_BY, modifiedDtTm: new Date() },
    });
    console.log("PricingModel", row.pricingModelCode, Number(row.pricingModelId));
  }

  for (const item of STATUS_TYPES) {
    const row = await prisma.commonStatusType.upsert({
      where: { tenantId_companyId_statusTypeCode: { tenantId: TENANT_ID, companyId: COMPANY_ID, statusTypeCode: item.code } },
      create: { tenantId: TENANT_ID, companyId: COMPANY_ID, statusTypeCode: item.code, statusTypeName: item.name, isActive: true, createdBy: CREATED_BY },
      update: { statusTypeName: item.name, modifiedBy: CREATED_BY, modifiedDtTm: new Date() },
    });
    console.log("CommonStatusType", row.statusTypeCode, Number(row.commonStatusTypeId));
  }

  const serviceProductType = await prisma.commonStatusType.findUnique({
    where: { tenantId_companyId_statusTypeCode: { tenantId: TENANT_ID, companyId: COMPANY_ID, statusTypeCode: "SERVICE_PRODUCT" } },
  });
  if (!serviceProductType) {
    console.error("SERVICE_PRODUCT status type not found — skipping statuses");
  } else {
    for (const [index, item] of SERVICE_PRODUCT_STATUSES.entries()) {
      const row = await prisma.commonStatus.upsert({
        where: {
          tenantId_companyId_commonStatusTypeId_statusCode: {
            tenantId: TENANT_ID,
            companyId: COMPANY_ID,
            commonStatusTypeId: serviceProductType.commonStatusTypeId,
            statusCode: item.code,
          },
        },
        create: {
          tenantId: TENANT_ID,
          companyId: COMPANY_ID,
          commonStatusTypeId: serviceProductType.commonStatusTypeId,
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
      console.log("CommonStatus SERVICE_PRODUCT /", row.statusCode, Number(row.commonStatusId));
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
