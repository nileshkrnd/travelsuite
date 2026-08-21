import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { rowInclude } from "../route";

const idSchema = z.coerce.number().int().positive();

const optionSchema = z.object({
  optionCode: z.string().trim().min(1).max(50),
  optionName: z.string().trim().min(1).max(250),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const ruleSchema = z.object({
  parentQuestionId: z.number().int().positive(),
  parentQuestionOptionId: z.number().int().positive().nullable().optional(),
  bookingQuestionOperatorId: z.number().int().positive(),
  comparisonValue: z.string().trim().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
});

const updateSchema = z.object({
  serviceProductId: z.number().int().positive(),
  serviceProductOptionId: z.number().int().positive().nullable().optional(),
  serviceProductVariantId: z.number().int().positive().nullable().optional(),
  questionCode: z.string().trim().min(1).max(50),
  questionText: z.string().trim().min(1).max(1000),
  bookingQuestionTypeId: z.number().int().positive(),
  bookingQuestionRequirementId: z.number().int().positive(),
  maxLength: z.number().int().positive().nullable().optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  options: z.array(optionSchema).optional(),
  rules: z.array(ruleSchema).optional(),
  modifiedBy: z.number().int().positive(),
});

type RouteContext = { params: Promise<{ serviceProductBookingQuestionId: string }> };

function toRow<
  T extends {
    serviceProductBookingQuestionId: bigint;
    serviceProductId: bigint;
    serviceProductOptionId: bigint | null;
    serviceProductVariantId: bigint | null;
    bookingQuestionTypeId: bigint;
    bookingQuestionRequirementId: bigint;
    options?: { serviceProductBookingQuestionOptionId: bigint; serviceProductBookingQuestionId: bigint }[];
    rules?: {
      serviceProductBookingQuestionRuleId: bigint;
      serviceProductBookingQuestionId: bigint;
      parentQuestionId: bigint;
      parentQuestionOptionId: bigint | null;
      bookingQuestionOperatorId: bigint;
    }[];
  },
>(row: T) {
  return {
    ...row,
    serviceProductBookingQuestionId: Number(row.serviceProductBookingQuestionId),
    serviceProductId: Number(row.serviceProductId),
    serviceProductOptionId: row.serviceProductOptionId != null ? Number(row.serviceProductOptionId) : null,
    serviceProductVariantId: row.serviceProductVariantId != null ? Number(row.serviceProductVariantId) : null,
    bookingQuestionTypeId: Number(row.bookingQuestionTypeId),
    bookingQuestionRequirementId: Number(row.bookingQuestionRequirementId),
    options: row.options?.map((o) => ({
      ...o,
      serviceProductBookingQuestionOptionId: Number(o.serviceProductBookingQuestionOptionId),
      serviceProductBookingQuestionId: Number(o.serviceProductBookingQuestionId),
    })),
    rules: row.rules?.map((r) => ({
      ...r,
      serviceProductBookingQuestionRuleId: Number(r.serviceProductBookingQuestionRuleId),
      serviceProductBookingQuestionId: Number(r.serviceProductBookingQuestionId),
      parentQuestionId: Number(r.parentQuestionId),
      parentQuestionOptionId: r.parentQuestionOptionId != null ? Number(r.parentQuestionOptionId) : null,
      bookingQuestionOperatorId: Number(r.bookingQuestionOperatorId),
    })),
  };
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { serviceProductBookingQuestionId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;
    const questionId = BigInt(id.data);

    const product = await prisma.serviceProduct.findUnique({ where: { serviceProductId: BigInt(data.serviceProductId) } });
    if (!product) return NextResponse.json({ error: "Service product not found" }, { status: 400 });

    for (const rule of data.rules ?? []) {
      if (rule.parentQuestionId === id.data) {
        return NextResponse.json({ error: "A question cannot depend on itself" }, { status: 400 });
      }
      const parent = await prisma.serviceProductBookingQuestion.findUnique({
        where: { serviceProductBookingQuestionId: BigInt(rule.parentQuestionId) },
      });
      if (!parent || parent.serviceProductId !== BigInt(data.serviceProductId)) {
        return NextResponse.json({ error: "Parent question not found on this product" }, { status: 400 });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.serviceProductBookingQuestion.update({
        where: { serviceProductBookingQuestionId: questionId },
        data: {
          serviceProductOptionId: data.serviceProductOptionId != null ? BigInt(data.serviceProductOptionId) : null,
          serviceProductVariantId: data.serviceProductVariantId != null ? BigInt(data.serviceProductVariantId) : null,
          questionCode: data.questionCode.trim(),
          questionText: data.questionText.trim(),
          bookingQuestionTypeId: BigInt(data.bookingQuestionTypeId),
          bookingQuestionRequirementId: BigInt(data.bookingQuestionRequirementId),
          maxLength: data.maxLength ?? null,
          displayOrder: data.displayOrder ?? 0,
          isActive: data.isActive ?? true,
          modifiedBy: data.modifiedBy,
          modifiedDtTm: new Date(),
        },
      });

      await tx.serviceProductBookingQuestionOption.deleteMany({ where: { serviceProductBookingQuestionId: questionId } });
      if (data.options?.length) {
        await tx.serviceProductBookingQuestionOption.createMany({
          data: data.options.map((o) => ({
            serviceProductBookingQuestionId: questionId,
            tenantId: product.tenantId,
            companyId: product.companyId,
            optionCode: o.optionCode.trim(),
            optionName: o.optionName.trim(),
            displayOrder: o.displayOrder ?? 0,
            isActive: o.isActive ?? true,
            createdBy: data.modifiedBy,
          })),
        });
      }

      await tx.serviceProductBookingQuestionRule.deleteMany({ where: { serviceProductBookingQuestionId: questionId } });
      if (data.rules?.length) {
        await tx.serviceProductBookingQuestionRule.createMany({
          data: data.rules.map((r) => ({
            serviceProductBookingQuestionId: questionId,
            tenantId: product.tenantId,
            companyId: product.companyId,
            parentQuestionId: BigInt(r.parentQuestionId),
            parentQuestionOptionId: r.parentQuestionOptionId != null ? BigInt(r.parentQuestionOptionId) : null,
            bookingQuestionOperatorId: BigInt(r.bookingQuestionOperatorId),
            comparisonValue: r.comparisonValue?.trim() || null,
            isActive: r.isActive ?? true,
            createdBy: data.modifiedBy,
          })),
        });
      }

      return tx.serviceProductBookingQuestion.findUniqueOrThrow({
        where: { serviceProductBookingQuestionId: questionId },
        include: rowInclude,
      });
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
    const { serviceProductBookingQuestionId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const inUse = await prisma.serviceProductBookingQuestionRule.findFirst({
      where: { parentQuestionId: BigInt(id.data) },
    });
    if (inUse) {
      return NextResponse.json(
        { error: "This question is referenced by another question's conditional rule — remove that rule first" },
        { status: 409 }
      );
    }

    await prisma.serviceProductBookingQuestion.delete({ where: { serviceProductBookingQuestionId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
