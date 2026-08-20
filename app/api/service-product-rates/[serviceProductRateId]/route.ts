import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { findDuplicateRate, validateRateBusinessRules } from "@/lib/api/service-product-rate-validation";

const idSchema = z.coerce.number().int().positive();

const dayInputSchema = z.object({
  dayOfWeekId: z.number().int().positive(),
  isActive: z.boolean(),
});

const updateSchema = z.object({
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
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

type RouteContext = { params: Promise<{ serviceProductRateId: string }> };

const rowInclude = {
  serviceProduct: { select: { serviceProductName: true } },
  supplierLink: { select: { supplier: { select: { supplierName: true } } } },
  option: { select: { optionName: true } },
  variant: { select: { variantName: true } },
  rateType: { select: { rateTypeName: true } },
  commonStatus: { select: { statusName: true } },
  days: { include: { dayOfWeek: { select: { dayOfWeekName: true } } } },
} as const;

function isForeignKeyRestrictError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") return true;
  const message = error instanceof Error ? error.message : "";
  return /23001|23503|violates[\s\S]*foreign key constraint/i.test(message);
}

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

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { serviceProductRateId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const row = await prisma.serviceProductRate.findUnique({ where: { serviceProductRateId: BigInt(id.data) }, include: rowInclude });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(toRow(row));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { serviceProductRateId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;
    const rateId = BigInt(id.data);

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
      excludeRateId: rateId,
    });
    if (isDuplicate) {
      return NextResponse.json(
        { error: "A rate already exists for this rate type/scope with an overlapping valid date range" },
        { status: 409 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.serviceProductRate.update({
        where: { serviceProductRateId: rateId },
        data: {
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
          isActive: data.isActive,
          modifiedBy: data.modifiedBy,
          modifiedDtTm: new Date(),
        },
      });

      if (data.days) {
        await tx.serviceProductRateDay.deleteMany({ where: { serviceProductRateId: rateId } });
        if (data.days.length) {
          await tx.serviceProductRateDay.createMany({
            data: data.days.map((d) => ({
              serviceProductRateId: rateId,
              dayOfWeekId: BigInt(d.dayOfWeekId),
              isActive: d.isActive,
              createdBy: data.modifiedBy,
            })),
          });
        }
      }

      return tx.serviceProductRate.findUniqueOrThrow({ where: { serviceProductRateId: rateId }, include: rowInclude });
    });
    return NextResponse.json(toRow(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { serviceProductRateId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.serviceProductRate.update({
      where: { serviceProductRateId: BigInt(id.data) },
      data: { isActive: parsed.data.isActive, modifiedBy: parsed.data.modifiedBy, modifiedDtTm: new Date() },
      include: rowInclude,
    });
    return NextResponse.json(toRow(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { serviceProductRateId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await prisma.serviceProductRate.delete({ where: { serviceProductRateId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (isForeignKeyRestrictError(error)) {
      return NextResponse.json({ error: "This rate is in use and cannot be deleted" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
