import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
  serviceProductOptionId: z.number().int().positive().nullable().optional(),
  serviceProductVariantId: z.number().int().positive().nullable().optional(),
  additionalInfoTypeId: z.number().int().positive(),
  valueBoolean: z.boolean().nullable().optional(),
  valueText: z.string().trim().max(2000).nullable().optional(),
  valueNumber: z.number().nullable().optional(),
  valueDate: z.string().trim().min(1).nullable().optional(),
  valueTime: z.string().trim().min(1).nullable().optional(),
  valueDateTime: z.string().trim().min(1).nullable().optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
});

type RouteContext = { params: Promise<{ serviceProductAdditionalInfoId: string }> };

const rowInclude = {
  serviceProduct: { select: { serviceProductName: true } },
  serviceProductOption: { select: { optionName: true } },
  serviceProductVariant: { select: { variantName: true } },
  additionalInfoType: { select: { infoTypeCode: true, infoTypeName: true, valueTypeCode: true } },
} as const;

function toRow<
  T extends {
    serviceProductAdditionalInfoId: bigint;
    serviceProductId: bigint;
    serviceProductOptionId: bigint | null;
    serviceProductVariantId: bigint | null;
    additionalInfoTypeId: bigint;
  },
>(row: T) {
  return {
    ...row,
    serviceProductAdditionalInfoId: Number(row.serviceProductAdditionalInfoId),
    serviceProductId: Number(row.serviceProductId),
    serviceProductOptionId: row.serviceProductOptionId != null ? Number(row.serviceProductOptionId) : null,
    serviceProductVariantId: row.serviceProductVariantId != null ? Number(row.serviceProductVariantId) : null,
    additionalInfoTypeId: Number(row.additionalInfoTypeId),
  };
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { serviceProductAdditionalInfoId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;

    const updated = await prisma.serviceProductAdditionalInfo.update({
      where: { serviceProductAdditionalInfoId: BigInt(id.data) },
      data: {
        serviceProductOptionId: data.serviceProductOptionId != null ? BigInt(data.serviceProductOptionId) : null,
        serviceProductVariantId: data.serviceProductVariantId != null ? BigInt(data.serviceProductVariantId) : null,
        additionalInfoTypeId: BigInt(data.additionalInfoTypeId),
        valueBoolean: data.valueBoolean ?? null,
        valueText: data.valueText?.trim() || null,
        valueNumber: data.valueNumber ?? null,
        valueDate: data.valueDate ? new Date(data.valueDate) : null,
        valueTime: data.valueTime ? new Date(`1970-01-01T${data.valueTime}`) : null,
        valueDateTime: data.valueDateTime ? new Date(data.valueDateTime) : null,
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
    const { serviceProductAdditionalInfoId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await prisma.serviceProductAdditionalInfo.delete({ where: { serviceProductAdditionalInfoId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
