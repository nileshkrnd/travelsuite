import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
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
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

type RouteContext = { params: Promise<{ serviceProductInclusionExclusionId: string }> };

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

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { serviceProductInclusionExclusionId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const row = await prisma.serviceProductInclusionExclusion.findUnique({
      where: { serviceProductInclusionExclusionId: BigInt(id.data) },
      include: rowInclude,
    });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(toRow(row));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { serviceProductInclusionExclusionId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;

    const updated = await prisma.serviceProductInclusionExclusion.update({
      where: { serviceProductInclusionExclusionId: BigInt(id.data) },
      data: {
        inclusionExclusionTypeId: BigInt(data.inclusionExclusionTypeId),
        itemTypeId: data.itemTypeId != null ? BigInt(data.itemTypeId) : null,
        itemName: data.itemName.trim(),
        description: data.description?.trim() || null,
        quantity: data.quantity ?? null,
        unitId: data.unitId != null ? BigInt(data.unitId) : null,
        isMandatory: data.isMandatory ?? false,
        displayOrder: data.displayOrder ?? 0,
        commonStatusId: BigInt(data.commonStatusId),
        isActive: data.isActive,
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

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { serviceProductInclusionExclusionId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.serviceProductInclusionExclusion.update({
      where: { serviceProductInclusionExclusionId: BigInt(id.data) },
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
    const { serviceProductInclusionExclusionId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await prisma.serviceProductInclusionExclusion.delete({ where: { serviceProductInclusionExclusionId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
