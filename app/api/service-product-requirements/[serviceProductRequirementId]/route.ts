import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
  serviceProductOptionId: z.number().int().positive().nullable().optional(),
  serviceProductVariantId: z.number().int().positive().nullable().optional(),
  requirementTypeId: z.number().int().positive(),
  requirementName: z.string().trim().min(1).max(250),
  description: z.string().trim().max(2000).nullable().optional(),
  isMandatory: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
});

type RouteContext = { params: Promise<{ serviceProductRequirementId: string }> };

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

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { serviceProductRequirementId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;

    const updated = await prisma.serviceProductRequirement.update({
      where: { serviceProductRequirementId: BigInt(id.data) },
      data: {
        serviceProductOptionId: data.serviceProductOptionId != null ? BigInt(data.serviceProductOptionId) : null,
        serviceProductVariantId: data.serviceProductVariantId != null ? BigInt(data.serviceProductVariantId) : null,
        requirementTypeId: BigInt(data.requirementTypeId),
        requirementName: data.requirementName.trim(),
        description: data.description?.trim() || null,
        isMandatory: data.isMandatory ?? false,
        displayOrder: data.displayOrder ?? 0,
        isActive: data.isActive ?? true,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
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
    const { serviceProductRequirementId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await prisma.serviceProductRequirement.delete({ where: { serviceProductRequirementId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
