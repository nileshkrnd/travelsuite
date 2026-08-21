import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

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

const createSchema = z.object({
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
  createdBy: z.number().int().positive(),
});

export const rowInclude = {
  serviceProduct: { select: { serviceProductName: true } },
  serviceProductOption: { select: { optionName: true } },
  serviceProductVariant: { select: { variantName: true } },
  questionType: { select: { questionTypeCode: true, questionTypeName: true } },
  requirement: { select: { requirementCode: true, requirementName: true } },
  options: { orderBy: [{ displayOrder: "asc" as const }] },
  rules: {
    include: {
      parentQuestion: { select: { questionCode: true, questionText: true } },
      parentQuestionOption: { select: { optionName: true } },
      operator: { select: { operatorCode: true, operatorName: true } },
    },
  },
};

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productIdParam = searchParams.get("serviceProductId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.ServiceProductBookingQuestionWhereInput = {};
    if (productIdParam != null && productIdParam !== "") where.serviceProductId = BigInt(productIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.serviceProductBookingQuestion.findMany({
      where,
      include: rowInclude,
      orderBy: [{ displayOrder: "asc" }],
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

    for (const rule of data.rules ?? []) {
      const parent = await prisma.serviceProductBookingQuestion.findUnique({
        where: { serviceProductBookingQuestionId: BigInt(rule.parentQuestionId) },
      });
      if (!parent || parent.serviceProductId !== BigInt(data.serviceProductId)) {
        return NextResponse.json({ error: "Parent question not found on this product" }, { status: 400 });
      }
    }

    const created = await prisma.serviceProductBookingQuestion.create({
      data: {
        serviceProductId: BigInt(data.serviceProductId),
        serviceProductOptionId: data.serviceProductOptionId != null ? BigInt(data.serviceProductOptionId) : null,
        serviceProductVariantId: data.serviceProductVariantId != null ? BigInt(data.serviceProductVariantId) : null,
        questionCode: data.questionCode.trim(),
        questionText: data.questionText.trim(),
        bookingQuestionTypeId: BigInt(data.bookingQuestionTypeId),
        bookingQuestionRequirementId: BigInt(data.bookingQuestionRequirementId),
        maxLength: data.maxLength ?? null,
        displayOrder: data.displayOrder ?? 0,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
        options: {
          create: (data.options ?? []).map((o) => ({
            tenantId: product.tenantId,
            companyId: product.companyId,
            optionCode: o.optionCode.trim(),
            optionName: o.optionName.trim(),
            displayOrder: o.displayOrder ?? 0,
            isActive: o.isActive ?? true,
            createdBy: data.createdBy,
          })),
        },
        rules: {
          create: (data.rules ?? []).map((r) => ({
            tenantId: product.tenantId,
            companyId: product.companyId,
            parentQuestionId: BigInt(r.parentQuestionId),
            parentQuestionOptionId: r.parentQuestionOptionId != null ? BigInt(r.parentQuestionOptionId) : null,
            bookingQuestionOperatorId: BigInt(r.bookingQuestionOperatorId),
            comparisonValue: r.comparisonValue?.trim() || null,
            isActive: r.isActive ?? true,
            createdBy: data.createdBy,
          })),
        },
      },
      include: rowInclude,
    });
    return NextResponse.json(toRow(created), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Question code already exists on this product" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
