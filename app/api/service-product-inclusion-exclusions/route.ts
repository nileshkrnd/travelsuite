import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const createSchema = z.object({
  serviceProductId: z.number().int().positive(),
  inclusionExclusionTypeId: z.number().int().positive(),
  itemTypeId: z.number().int().positive().nullable().optional(),
  itemName: z.string().trim().min(1).max(250),
  description: z.string().trim().max(1000).nullable().optional(),
  quantity: z.number().nonnegative().nullable().optional(),
  unitId: z.number().int().positive().nullable().optional(),
  isMandatory: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  commonStatusId: z.number().int().positive(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

const rowInclude = {
  serviceProduct: { select: { serviceProductName: true } },
  inclusionExclusionType: { select: { typeName: true } },
  itemType: { select: { itemTypeName: true } },
  unit: { select: { itemTypeName: true } },
  commonStatus: { select: { statusName: true } },
} as const;

function toRow<
  T extends {
    serviceProductInclusionExclusionId: bigint;
    serviceProductId: bigint;
    inclusionExclusionTypeId: bigint;
    itemTypeId: bigint | null;
    unitId: bigint | null;
    commonStatusId: bigint;
  },
>(row: T) {
  return {
    ...row,
    serviceProductInclusionExclusionId: Number(row.serviceProductInclusionExclusionId),
    serviceProductId: Number(row.serviceProductId),
    inclusionExclusionTypeId: Number(row.inclusionExclusionTypeId),
    itemTypeId: row.itemTypeId != null ? Number(row.itemTypeId) : null,
    unitId: row.unitId != null ? Number(row.unitId) : null,
    commonStatusId: Number(row.commonStatusId),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productIdParam = searchParams.get("serviceProductId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.ServiceProductInclusionExclusionWhereInput = {};
    if (productIdParam != null && productIdParam !== "") where.serviceProductId = BigInt(productIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.serviceProductInclusionExclusion.findMany({
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

    const type = await prisma.inclusionExclusionType.findUnique({
      where: { inclusionExclusionTypeId: BigInt(data.inclusionExclusionTypeId) },
    });
    if (!type) return NextResponse.json({ error: "Inclusion/exclusion type not found" }, { status: 400 });

    const status = await prisma.commonStatus.findUnique({ where: { commonStatusId: BigInt(data.commonStatusId) } });
    if (!status) return NextResponse.json({ error: "Status not found" }, { status: 400 });

    const created = await prisma.serviceProductInclusionExclusion.create({
      data: {
        serviceProductId: BigInt(data.serviceProductId),
        inclusionExclusionTypeId: BigInt(data.inclusionExclusionTypeId),
        itemTypeId: data.itemTypeId != null ? BigInt(data.itemTypeId) : null,
        itemName: data.itemName.trim(),
        description: data.description?.trim() || null,
        quantity: data.quantity ?? null,
        unitId: data.unitId != null ? BigInt(data.unitId) : null,
        isMandatory: data.isMandatory ?? false,
        displayOrder: data.displayOrder ?? 0,
        commonStatusId: BigInt(data.commonStatusId),
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
