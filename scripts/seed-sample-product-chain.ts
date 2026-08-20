/**
 * Seeds one fully-configured sample Service Product per Service Type that has
 * a classification — exercising the whole chain built this session:
 * ServiceProduct -> Configuration, Option -> Variant, Supplier link,
 * Availability -> AvailabilityDay (all 7 days), Schedule, Rate.
 *
 * Idempotent: if a sample product already exists for a service type (by its
 * SAMPLE_<CODE> serviceProductCode), it's deleted first (cascades clean up
 * every child row) and recreated fresh.
 *
 * Run: npx tsx scripts/seed-sample-product-chain.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TENANT_ID = 1;
const COMPANY_ID = 1;
const CREATED_BY = 1;

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function main() {
  const types = await prisma.serviceTypeMaster.findMany({
    where: { tenantId: TENANT_ID, companyId: COMPANY_ID, isActive: true },
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

  const durationUnit = await prisma.durationUnit.findFirst({ where: { tenantId: TENANT_ID, companyId: COMPANY_ID, isActive: true } });
  const bookingModel = await prisma.bookingModel.findFirst({ where: { tenantId: TENANT_ID, companyId: COMPANY_ID, isActive: true } });
  const pricingModel = await prisma.pricingModel.findFirst({ where: { tenantId: TENANT_ID, companyId: COMPANY_ID, isActive: true } });

  const today = new Date();
  const skipped: string[] = [];
  const created: string[] = [];

  for (const type of types) {
    const classification = await prisma.serviceProductClassificationMaster.findFirst({
      where: { tenantId: TENANT_ID, companyId: COMPANY_ID, serviceTypeId: type.serviceTypeId, isActive: true },
      orderBy: { displayOrder: "asc" },
    });
    if (!classification) {
      skipped.push(type.serviceTypeCode);
      continue;
    }

    const category = await prisma.serviceProductCategory.findFirst({
      where: { tenantId: TENANT_ID, companyId: COMPANY_ID, serviceProductClassificationId: classification.serviceProductClassificationId, isActive: true },
      orderBy: { displayOrder: "asc" },
    });

    const code = `SAMPLE_${type.serviceTypeCode}`;
    const existing = await prisma.serviceProduct.findUnique({
      where: { tenantId_companyId_serviceProductCode: { tenantId: TENANT_ID, companyId: COMPANY_ID, serviceProductCode: code } },
    });
    if (existing) {
      await prisma.serviceProduct.delete({ where: { serviceProductId: existing.serviceProductId } });
    }

    const product = await prisma.serviceProduct.create({
      data: {
        tenantId: TENANT_ID,
        companyId: COMPANY_ID,
        serviceProductCode: code,
        serviceProductName: `Sample ${type.serviceTypeName}`,
        serviceTypeId: type.serviceTypeId,
        serviceProductClassificationId: classification.serviceProductClassificationId,
        serviceProductCategoryId: category?.serviceProductCategoryId ?? null,
        supplierId: supplier.supplierId,
        shortDescription: `Sample ${type.serviceTypeName} product for end-to-end verification.`,
        isOnlineSellable: true,
        displayOrder: 0,
        commonStatusId: publishedStatus.commonStatusId,
        isActive: true,
        createdBy: CREATED_BY,
      },
    });

    await prisma.serviceProductConfiguration.create({
      data: {
        serviceProductId: product.serviceProductId,
        durationValue: 2,
        durationUnitId: durationUnit?.durationUnitId ?? null,
        bookingModelId: bookingModel?.bookingModelId ?? null,
        pricingModelId: pricingModel?.pricingModelId ?? null,
        minimumPax: 1,
        maximumPax: 10,
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
        description: "Standard option.",
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
        supplierProductCode: `${code}-SUP`,
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
        endTime: new Date("1970-01-01T17:00:00.000Z"),
        capacity: 20,
        isAvailable: true,
        commonStatusId: publishedStatus.commonStatusId,
        isActive: true,
        createdBy: CREATED_BY,
      },
    });

    await prisma.serviceProductRate.create({
      data: {
        serviceProductId: product.serviceProductId,
        serviceProductSupplierId: supplierLink.serviceProductSupplierId,
        serviceProductScheduleId: schedule.serviceProductScheduleId,
        rateTypeId: rateType.rateTypeId,
        minimumPax: 1,
        maximumPax: 10,
        rateAmount: 100.0,
        validFrom: today,
        validTo: addDays(today, 365),
        commonStatusId: publishedStatus.commonStatusId,
        isActive: true,
        createdBy: CREATED_BY,
      },
    });

    created.push(`${type.serviceTypeCode} -> ${code} (product #${Number(product.serviceProductId)})`);
    console.log("Seeded", type.serviceTypeCode, "->", code);
  }

  console.log(`\nDone. ${created.length} sample product chains created.`);
  if (skipped.length) {
    console.log(`Skipped (no classification yet): ${skipped.join(", ")}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
