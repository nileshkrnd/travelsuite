/**
 * Seeds one "City Excursion" Service Product under Tour > Half Day Tour,
 * with a daily 4-hour schedule (09:00-13:00, every day) — same full chain as
 * seed-sample-product-chain.ts: Product -> Configuration, Option -> Variant,
 * Supplier link, Availability -> AvailabilityDay (all 7 days), Schedule, Rate.
 *
 * Idempotent: deletes any existing product with the same code first (cascades
 * clean up every child row) and recreates fresh.
 *
 * Run: npx tsx scripts/seed-excursion-product.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TENANT_ID = 1;
const COMPANY_ID = 1;
const CREATED_BY = 1;
const PRODUCT_CODE = "CITY_EXCURSION";

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function main() {
  const type = await prisma.serviceTypeMaster.findFirst({ where: { tenantId: TENANT_ID, companyId: COMPANY_ID, serviceTypeCode: "TOUR" } });
  if (!type) throw new Error("TOUR service type not found");

  const classification = await prisma.serviceProductClassificationMaster.findFirst({
    where: { tenantId: TENANT_ID, companyId: COMPANY_ID, serviceTypeId: type.serviceTypeId, classificationCode: "HALF_DAY_TOUR" },
  });
  if (!classification) throw new Error("HALF_DAY_TOUR classification not found");

  const category = await prisma.serviceProductCategory.findFirst({
    where: { tenantId: TENANT_ID, companyId: COMPANY_ID, serviceProductClassificationId: classification.serviceProductClassificationId, isActive: true },
    orderBy: { displayOrder: "asc" },
  });

  const statusType = await prisma.commonStatusType.findFirst({ where: { tenantId: TENANT_ID, companyId: COMPANY_ID, statusTypeCode: "SERVICE_PRODUCT" } });
  if (!statusType) throw new Error("SERVICE_PRODUCT status type not found");
  const publishedStatus = await prisma.commonStatus.findFirst({ where: { commonStatusTypeId: statusType.commonStatusTypeId, statusCode: "PUBLISHED" } });
  if (!publishedStatus) throw new Error("PUBLISHED status not found");

  const rateType = await prisma.rateType.findFirst({ where: { tenantId: TENANT_ID, companyId: COMPANY_ID, rateTypeCode: "ADULT" } });
  if (!rateType) throw new Error("ADULT rate type not found");

  const days = await prisma.dayOfWeek.findMany({ where: { isActive: true }, orderBy: { displayOrder: "asc" } });
  if (days.length === 0) throw new Error("No active DayOfWeek rows found");

  const supplier = await prisma.supplier.findFirst({ where: { tenantId: TENANT_ID, companyId: COMPANY_ID, isActive: true } });
  if (!supplier) throw new Error("No active supplier found");

  const durationUnit = await prisma.durationUnit.findFirst({ where: { tenantId: TENANT_ID, companyId: COMPANY_ID, isActive: true, durationUnitCode: "HOUR" } });
  const bookingModel = await prisma.bookingModel.findFirst({ where: { tenantId: TENANT_ID, companyId: COMPANY_ID, isActive: true } });
  const pricingModel = await prisma.pricingModel.findFirst({ where: { tenantId: TENANT_ID, companyId: COMPANY_ID, isActive: true } });

  const today = new Date();

  const existing = await prisma.serviceProduct.findUnique({
    where: { tenantId_companyId_serviceProductCode: { tenantId: TENANT_ID, companyId: COMPANY_ID, serviceProductCode: PRODUCT_CODE } },
  });
  if (existing) {
    await prisma.serviceProduct.delete({ where: { serviceProductId: existing.serviceProductId } });
    console.log("Removed existing", PRODUCT_CODE, "before recreating");
  }

  const product = await prisma.serviceProduct.create({
    data: {
      tenantId: TENANT_ID,
      companyId: COMPANY_ID,
      serviceProductCode: PRODUCT_CODE,
      serviceProductName: "City Excursion",
      serviceTypeId: type.serviceTypeId,
      serviceProductClassificationId: classification.serviceProductClassificationId,
      serviceProductCategoryId: category?.serviceProductCategoryId ?? null,
      supplierId: supplier.supplierId,
      shortDescription: "Half-day guided city excursion, 4 hours, runs daily.",
      isOnlineSellable: true,
      displayOrder: 0,
      commonStatusId: publishedStatus.commonStatusId,
      isActive: true,
      createdBy: CREATED_BY,
    },
  });
  console.log("Created product", product.serviceProductCode, Number(product.serviceProductId));

  await prisma.serviceProductConfiguration.create({
    data: {
      serviceProductId: product.serviceProductId,
      durationValue: 4,
      durationUnitId: durationUnit?.durationUnitId ?? null,
      bookingModelId: bookingModel?.bookingModelId ?? null,
      pricingModelId: pricingModel?.pricingModelId ?? null,
      minimumPax: 1,
      maximumPax: 15,
      isInstantConfirmation: true,
      isDateRequired: true,
      isScheduleRequired: true,
      isAvailabilityRequired: true,
      createdBy: CREATED_BY,
    },
  });

  const option = await prisma.serviceProductOption.create({
    data: {
      serviceProductId: product.serviceProductId,
      optionCode: "STANDARD",
      optionName: "Standard",
      description: "Standard half-day city excursion.",
      displayOrder: 0,
      isDefault: true,
      isOnlineSellable: true,
      commonStatusId: publishedStatus.commonStatusId,
      isActive: true,
      createdBy: CREATED_BY,
    },
  });

  await prisma.serviceProductVariant.create({
    data: {
      serviceProductOptionId: option.serviceProductOptionId,
      variantCode: "DEFAULT",
      variantName: "Default",
      description: "Default variant.",
      displayOrder: 0,
      isDefault: true,
      isOnlineSellable: true,
      commonStatusId: publishedStatus.commonStatusId,
      isActive: true,
      createdBy: CREATED_BY,
    },
  });

  const supplierLink = await prisma.serviceProductSupplier.create({
    data: {
      serviceProductId: product.serviceProductId,
      supplierId: supplier.supplierId,
      supplierProductCode: `${PRODUCT_CODE}-SUP`,
      isPrimary: true,
      isActive: true,
      createdBy: CREATED_BY,
    },
  });

  const availability = await prisma.serviceProductAvailability.create({
    data: {
      serviceProductId: product.serviceProductId,
      bookingFromDate: today,
      bookingToDate: addDays(today, 90),
      serviceFromDate: today,
      serviceToDate: addDays(today, 365),
      isAvailable: true,
      commonStatusId: publishedStatus.commonStatusId,
      isActive: true,
      createdBy: CREATED_BY,
    },
  });

  await prisma.serviceProductAvailabilityDay.createMany({
    data: days.map((d) => ({
      serviceProductAvailabilityId: availability.serviceProductAvailabilityId,
      dayOfWeekId: d.dayOfWeekId,
      isAvailable: true,
      createdBy: CREATED_BY,
    })),
  });

  const schedule = await prisma.serviceProductSchedule.create({
    data: {
      serviceProductAvailabilityId: availability.serviceProductAvailabilityId,
      serviceProductId: product.serviceProductId,
      startTime: new Date("1970-01-01T09:00:00.000Z"),
      endTime: new Date("1970-01-01T13:00:00.000Z"),
      capacity: 15,
      isAvailable: true,
      commonStatusId: publishedStatus.commonStatusId,
      isActive: true,
      createdBy: CREATED_BY,
    },
  });
  console.log("Schedule: every day, 09:00-13:00 (4 hours), capacity 15");

  await prisma.serviceProductRate.create({
    data: {
      serviceProductId: product.serviceProductId,
      serviceProductSupplierId: supplierLink.serviceProductSupplierId,
      serviceProductScheduleId: schedule.serviceProductScheduleId,
      rateTypeId: rateType.rateTypeId,
      minimumPax: 1,
      maximumPax: 15,
      rateAmount: 75.0,
      validFrom: today,
      validTo: addDays(today, 365),
      commonStatusId: publishedStatus.commonStatusId,
      isActive: true,
      createdBy: CREATED_BY,
    },
  });

  console.log("\nDone. City Excursion (Tour > Half Day Tour) seeded with a 4-hour daily schedule.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
