import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const createSchema = z.object({
  serviceProductId: z.number().int().positive(),
  serviceProductOptionId: z.number().int().positive().nullable().optional(),
  serviceProductVariantId: z.number().int().positive().nullable().optional(),
  requirementTypeId: z.number().int().positive(),
  requirementName: z.string().trim().min(1).max(250),
  description: z.string().trim().max(2000).nullable().optional(),
  isMandatory: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

const rowInclude = {
  serviceProduct: { select: { serviceProductName: true } },
  serviceProductOption: { select: { optionName: true } },
  serviceProductVariant: { select: { variantName: true } },
  requirementType: { select: { requirementTypeCode: true, requirementTypeName: true } },
} as const;

function toRow<
  T extends {
    serviceProductRequirementId: bigint;
    serviceProductId: bigint;
    serviceProductOptionId: bigint | null;
    serviceProductVariantId: bigint | null;
    requirementTypeId: bigint;
  },
>(row: T) {
  return {
    ...row,
    serviceProductRequirementId: Number(row.serviceProductRequirementId),
    serviceProductId: Number(row.serviceProductId),
    serviceProductOptionId: row.serviceProductOptionId != null ? Number(row.serviceProductOptionId) : null,
    serviceProductVariantId: row.serviceProductVariantId != null ? Number(row.serviceProductVariantId) : null,
    requirementTypeId: Number(row.requirementTypeId),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productIdParam = searchParams.get("serviceProductId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.ServiceProductRequirementWhereInput = {};
    if (productIdParam != null && productIdParam !== "") where.serviceProductId = BigInt(productIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.serviceProductRequirement.findMany({
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

    const type = await prisma.requirementTypeMaster.findUnique({
      where: { requirementTypeId: BigInt(data.requirementTypeId) },
    });
    if (!type) return NextResponse.json({ error: "Requirement type not found" }, { status: 400 });

    const created = await prisma.serviceProductRequirement.create({
      data: {
        serviceProductId: BigInt(data.serviceProductId),
        serviceProductOptionId: data.serviceProductOptionId != null ? BigInt(data.serviceProductOptionId) : null,
        serviceProductVariantId: data.serviceProductVariantId != null ? BigInt(data.serviceProductVariantId) : null,
        requirementTypeId: BigInt(data.requirementTypeId),
        requirementName: data.requirementName.trim(),
        description: data.description?.trim() || null,
        isMandatory: data.isMandatory ?? false,
        displayOrder: data.displayOrder ?? 0,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
      include: rowInclude,
    });
    return NextResponse.json(toRow(created), { status: 201 });
  } catch (error) {
    return dbUnavailable(error);
  }
}
