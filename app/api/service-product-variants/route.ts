import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const createSchema = z.object({
  serviceProductOptionId: z.number().int().positive(),
  variantCode: z.string().trim().min(1).max(50),
  variantName: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional(),
  displayOrder: z.number().int().optional(),
  isDefault: z.boolean().optional(),
  isOnlineSellable: z.boolean().optional(),
  commonStatusId: z.number().int().positive(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

export const rowInclude = {
  option: { select: { optionName: true } },
  commonStatus: { select: { statusName: true } },
} as const;

function serialize<T extends { serviceProductVariantId: bigint; serviceProductOptionId: bigint; commonStatusId: bigint }>(row: T) {
  return {
    ...row,
    serviceProductVariantId: Number(row.serviceProductVariantId),
    serviceProductOptionId: Number(row.serviceProductOptionId),
    commonStatusId: Number(row.commonStatusId),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const optionIdParam = searchParams.get("serviceProductOptionId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.ServiceProductVariantWhereInput = {};
    if (optionIdParam != null && optionIdParam !== "") where.serviceProductOptionId = BigInt(optionIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.serviceProductVariant.findMany({
      where,
      include: rowInclude,
      orderBy: [{ displayOrder: "asc" }, { variantCode: "asc" }],
    });
    return NextResponse.json(rows.map(serialize));
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

    const option = await prisma.serviceProductOption.findUnique({ where: { serviceProductOptionId: BigInt(data.serviceProductOptionId) } });
    if (!option) {
      return NextResponse.json({ error: "Option not found" }, { status: 400 });
    }
    const status = await prisma.commonStatus.findUnique({ where: { commonStatusId: BigInt(data.commonStatusId) } });
    if (!status) {
      return NextResponse.json({ error: "Status not found" }, { status: 400 });
    }

    const created = await prisma.serviceProductVariant.create({
      data: {
        serviceProductOptionId: BigInt(data.serviceProductOptionId),
        variantCode: data.variantCode.trim().toUpperCase(),
        variantName: data.variantName.trim(),
        description: data.description?.trim() || null,
        displayOrder: data.displayOrder ?? 0,
        isDefault: data.isDefault ?? false,
        isOnlineSellable: data.isOnlineSellable ?? false,
        commonStatusId: BigInt(data.commonStatusId),
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
      include: rowInclude,
    });
    return NextResponse.json(serialize(created), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This variant code already exists for this option" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
