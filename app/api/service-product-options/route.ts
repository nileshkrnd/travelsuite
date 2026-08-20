import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const createSchema = z.object({
  serviceProductId: z.number().int().positive(),
  optionCode: z.string().trim().min(1).max(50),
  optionName: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional(),
  displayOrder: z.number().int().optional(),
  isDefault: z.boolean().optional(),
  isOnlineSellable: z.boolean().optional(),
  commonStatusId: z.number().int().positive(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

export const rowInclude = {
  serviceProduct: { select: { serviceProductName: true } },
  commonStatus: { select: { statusName: true } },
} as const;

function serialize<T extends { serviceProductOptionId: bigint; serviceProductId: bigint; commonStatusId: bigint }>(row: T) {
  return {
    ...row,
    serviceProductOptionId: Number(row.serviceProductOptionId),
    serviceProductId: Number(row.serviceProductId),
    commonStatusId: Number(row.commonStatusId),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productIdParam = searchParams.get("serviceProductId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.ServiceProductOptionWhereInput = {};
    if (productIdParam != null && productIdParam !== "") where.serviceProductId = BigInt(productIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.serviceProductOption.findMany({
      where,
      include: rowInclude,
      orderBy: [{ displayOrder: "asc" }, { optionCode: "asc" }],
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

    const product = await prisma.serviceProduct.findUnique({ where: { serviceProductId: BigInt(data.serviceProductId) } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 400 });
    }
    const status = await prisma.commonStatus.findUnique({ where: { commonStatusId: BigInt(data.commonStatusId) } });
    if (!status) {
      return NextResponse.json({ error: "Status not found" }, { status: 400 });
    }

    const created = await prisma.serviceProductOption.create({
      data: {
        serviceProductId: BigInt(data.serviceProductId),
        optionCode: data.optionCode.trim().toUpperCase(),
        optionName: data.optionName.trim(),
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
      return NextResponse.json({ error: "This option code already exists for this product" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
