import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const createSchema = z.object({
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  serviceProductId: z.number().int().positive(),
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
  createdBy: z.number().int().positive(),
});

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productIdParam = searchParams.get("serviceProductId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.ServiceProductAdditionalInfoWhereInput = {};
    if (productIdParam != null && productIdParam !== "") where.serviceProductId = BigInt(productIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.serviceProductAdditionalInfo.findMany({
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

    const type = await prisma.additionalInfoTypeMaster.findUnique({
      where: { additionalInfoTypeId: BigInt(data.additionalInfoTypeId) },
    });
    if (!type) return NextResponse.json({ error: "Additional info type not found" }, { status: 400 });

    const created = await prisma.serviceProductAdditionalInfo.create({
      data: {
        tenantId: data.tenantId,
        companyId: data.companyId,
        serviceProductId: BigInt(data.serviceProductId),
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
        createdBy: data.createdBy,
      },
      include: rowInclude,
    });
    return NextResponse.json(toRow(created), { status: 201 });
  } catch (error) {
    return dbUnavailable(error);
  }
}
