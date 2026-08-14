import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const createSchema = z.object({
  propertyRoomId: z.number().int().positive(),
  extraBedTypeId: z.number().int().positive(),
  maxQuantity: z.number().int().positive().optional(),
  adultAllowed: z.boolean().optional(),
  childAllowed: z.boolean().optional(),
  isComplimentary: z.boolean().optional(),
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

const extraBedInclude = { extraBedType: { select: { bedTypeCode: true, bedTypeName: true } } } as const;

function serialize<
  T extends { propertyRoomTypeExtraBedId: bigint; propertyRoomId: bigint; extraBedTypeId: bigint },
>(row: T) {
  return {
    ...row,
    propertyRoomTypeExtraBedId: Number(row.propertyRoomTypeExtraBedId),
    propertyRoomId: Number(row.propertyRoomId),
    extraBedTypeId: Number(row.extraBedTypeId),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyRoomIdParam = searchParams.get("propertyRoomId");
    const tenantIdParam = searchParams.get("tenantId");

    const where: Prisma.PropertyRoomTypeExtraBedWhereInput = {};
    if (propertyRoomIdParam) where.propertyRoomId = BigInt(propertyRoomIdParam);
    if (tenantIdParam) where.tenantId = Number(tenantIdParam);

    const rows = await prisma.propertyRoomTypeExtraBed.findMany({
      where,
      include: extraBedInclude,
      orderBy: [{ createdDtTm: "asc" }],
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

    const room = await prisma.propertyRoom.findUnique({ where: { propertyRoomId: BigInt(data.propertyRoomId) } });
    if (!room) return NextResponse.json({ error: "Property room not found" }, { status: 400 });

    const created = await prisma.propertyRoomTypeExtraBed.create({
      data: {
        propertyRoomId: BigInt(data.propertyRoomId),
        extraBedTypeId: BigInt(data.extraBedTypeId),
        maxQuantity: data.maxQuantity ?? 1,
        adultAllowed: data.adultAllowed ?? true,
        childAllowed: data.childAllowed ?? true,
        isComplimentary: data.isComplimentary ?? false,
        tenantId: data.tenantId,
        companyId: data.companyId,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
      include: extraBedInclude,
    });
    return NextResponse.json(serialize(created), { status: 201 });
  } catch (error) {
    return dbUnavailable(error);
  }
}
