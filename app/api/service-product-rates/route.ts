import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { findDuplicateRate, validateRateBusinessRules } from "@/lib/api/service-product-rate-validation";

const dayInputSchema = z.object({
  dayOfWeekId: z.number().int().positive(),
  isActive: z.boolean(),
});

const createSchema = z.object({
  serviceProductId: z.number().int().positive(),
  serviceProductSupplierId: z.number().int().positive(),
  serviceProductOptionId: z.number().int().positive().nullable().optional(),
  serviceProductVariantId: z.number().int().positive().nullable().optional(),
  serviceProductScheduleId: z.number().int().positive().nullable().optional(),
  rateTypeId: z.number().int().positive(),
  minimumPax: z.number().int().positive().nullable().optional(),
  maximumPax: z.number().int().positive().nullable().optional(),
  minimumQuantity: z.number().positive().nullable().optional(),
  maximumQuantity: z.number().positive().nullable().optional(),
  rateAmount: z.number().positive(),
  validFrom: z.string().trim().min(1).optional().nullable(),
  validTo: z.string().trim().min(1).optional().nullable(),
  commonStatusId: z.number().int().positive(),
  days: z.array(dayInputSchema).optional(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

const rowInclude = {
  serviceProduct: { select: { serviceProductName: true } },
  supplierLink: { select: { supplier: { select: { supplierName: true } } } },
  option: { select: { optionName: true } },
  variant: { select: { variantName: true } },
  rateType: { select: { rateTypeName: true } },
  commonStatus: { select: { statusName: true } },
  days: { include: { dayOfWeek: { select: { dayOfWeekName: true } } } },
} as const;

function toRow<
  T extends {
    serviceProductRateId: bigint;
    serviceProductId: bigint;
    serviceProductSupplierId: bigint;
    serviceProductOptionId: bigint | null;
    serviceProductVariantId: bigint | null;
    serviceProductScheduleId: bigint | null;
    rateTypeId: bigint;
    commonStatusId: bigint;
    days?: { serviceProductRateDayId: bigint; serviceProductRateId: bigint; dayOfWeekId: bigint }[];
  },
>(row: T) {
  return {
    ...row,
    serviceProductRateId: Number(row.serviceProductRateId),
    serviceProductId: Number(row.serviceProductId),
    serviceProductSupplierId: Number(row.serviceProductSupplierId),
    serviceProductOptionId: row.serviceProductOptionId != null ? Number(row.serviceProductOptionId) : null,
    serviceProductVariantId: row.serviceProductVariantId != null ? Number(row.serviceProductVariantId) : null,
    serviceProductScheduleId: row.serviceProductScheduleId != null ? Number(row.serviceProductScheduleId) : null,
    rateTypeId: Number(row.rateTypeId),
    commonStatusId: Number(row.commonStatusId),
    days: row.days?.map((d) => ({
      ...d,
      serviceProductRateDayId: Number(d.serviceProductRateDayId),
      serviceProductRateId: Number(d.serviceProductRateId),
      dayOfWeekId: Number(d.dayOfWeekId),
    })),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productIdParam = searchParams.get("serviceProductId");
    const productIdsParam = searchParams.get("serviceProductIds");
    const supplierLinkIdParam = searchParams.get("serviceProductSupplierId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.ServiceProductRateWhereInput = {};
    if (productIdParam != null && productIdParam !== "") where.serviceProductId = BigInt(productIdParam);
    if (productIdsParam != null && productIdsParam !== "") {
      const ids = productIdsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => BigInt(s));
      if (ids.length > 0) where.serviceProductId = { in: ids };
    }
    if (supplierLinkIdParam != null && supplierLinkIdParam !== "") where.serviceProductSupplierId = BigInt(supplierLinkIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.serviceProductRate.findMany({
      where,
      include: rowInclude,
      orderBy: [{ createdDtTm: "desc" }],
    });
    return NextResponse.json(rows.map(toRow));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;

    const product = await prisma.serviceProduct.findUnique({ where: { serviceProductId: BigInt(data.serviceProductId) } });
    if (!product) return NextResponse.json({ error: "Service product not found" }, { status: 400 });

    const supplierLink = await prisma.serviceProductSupplier.findUnique({ where: { serviceProductSupplierId: BigInt(data.serviceProductSupplierId) } });
    if (!supplierLink) return NextResponse.json({ error: "Supplier link not found" }, { status: 400 });

    const rateType = await prisma.rateType.findUnique({ where: { rateTypeId: BigInt(data.rateTypeId) } });
    if (!rateType) return NextResponse.json({ error: "Rate type not found" }, { status: 400 });

    const status = await prisma.commonStatus.findUnique({ where: { commonStatusId: BigInt(data.commonStatusId) } });
    if (!status) return NextResponse.json({ error: "Status not found" }, { status: 400 });

    const validFrom = data.validFrom ? new Date(data.validFrom) : null;
    const validTo = data.validTo ? new Date(data.validTo) : null;

    const ruleError = validateRateBusinessRules({
      validFrom,
      validTo,
      minimumPax: data.minimumPax,
      maximumPax: data.maximumPax,
      minimumQuantity: data.minimumQuantity,
      maximumQuantity: data.maximumQuantity,
    });
    if (ruleError) return NextResponse.json({ error: ruleError }, { status: 400 });

    const isDuplicate = await findDuplicateRate(prisma, {
      serviceProductId: BigInt(data.serviceProductId),
      serviceProductSupplierId: BigInt(data.serviceProductSupplierId),
      rateTypeId: BigInt(data.rateTypeId),
      serviceProductOptionId: data.serviceProductOptionId != null ? BigInt(data.serviceProductOptionId) : null,
      serviceProductVariantId: data.serviceProductVariantId != null ? BigInt(data.serviceProductVariantId) : null,
      serviceProductScheduleId: data.serviceProductScheduleId != null ? BigInt(data.serviceProductScheduleId) : null,
      validFrom,
      validTo,
    });
    if (isDuplicate) {
      return NextResponse.json(
        { error: "A rate already exists for this rate type/scope with an overlapping valid date range" },
        { status: 409 }
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.serviceProductRate.create({
        data: {
          serviceProductId: BigInt(data.serviceProductId),
          serviceProductSupplierId: BigInt(data.serviceProductSupplierId),
          serviceProductOptionId: data.serviceProductOptionId != null ? BigInt(data.serviceProductOptionId) : null,
          serviceProductVariantId: data.serviceProductVariantId != null ? BigInt(data.serviceProductVariantId) : null,
          serviceProductScheduleId: data.serviceProductScheduleId != null ? BigInt(data.serviceProductScheduleId) : null,
          rateTypeId: BigInt(data.rateTypeId),
          minimumPax: data.minimumPax ?? null,
          maximumPax: data.maximumPax ?? null,
          minimumQuantity: data.minimumQuantity ?? null,
          maximumQuantity: data.maximumQuantity ?? null,
          rateAmount: data.rateAmount,
          validFrom,
          validTo,
          commonStatusId: BigInt(data.commonStatusId),
          isActive: data.isActive ?? true,
          createdBy: data.createdBy,
        },
      });
      if (data.days?.length) {
        await tx.serviceProductRateDay.createMany({
          data: data.days.map((d) => ({
            serviceProductRateId: row.serviceProductRateId,
            dayOfWeekId: BigInt(d.dayOfWeekId),
            isActive: d.isActive,
            createdBy: data.createdBy,
          })),
        });
      }
      return tx.serviceProductRate.findUniqueOrThrow({ where: { serviceProductRateId: row.serviceProductRateId }, include: rowInclude });
    });
    return NextResponse.json(toRow(created), { status: 201 });
  } catch (error) {
    return dbUnavailable(error);
  }
}
