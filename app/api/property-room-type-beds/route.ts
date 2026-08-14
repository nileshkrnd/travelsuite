import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const createSchema = z.object({
  propertyRoomId: z.number().int().positive(),
  bedTypeId: z.number().int().positive(),
  bedCount: z.number().int().positive().optional(),
  isExtraBed: z.boolean().optional(),
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

const bedInclude = { bedType: { select: { bedTypeCode: true, bedTypeName: true } } } as const;

function serialize<T extends { propertyRoomTypeBedId: bigint; propertyRoomId: bigint; bedTypeId: bigint }>(row: T) {
  return {
    ...row,
    propertyRoomTypeBedId: Number(row.propertyRoomTypeBedId),
    propertyRoomId: Number(row.propertyRoomId),
    bedTypeId: Number(row.bedTypeId),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyRoomIdParam = searchParams.get("propertyRoomId");
    const tenantIdParam = searchParams.get("tenantId");

    const where: Prisma.PropertyRoomTypeBedWhereInput = {};
    if (propertyRoomIdParam) where.propertyRoomId = BigInt(propertyRoomIdParam);
    if (tenantIdParam) where.tenantId = Number(tenantIdParam);

    const rows = await prisma.propertyRoomTypeBed.findMany({
      where,
      include: bedInclude,
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

    const created = await prisma.propertyRoomTypeBed.create({
      data: {
        propertyRoomId: BigInt(data.propertyRoomId),
        bedTypeId: BigInt(data.bedTypeId),
        bedCount: data.bedCount ?? 1,
        isExtraBed: data.isExtraBed ?? false,
        tenantId: data.tenantId,
        companyId: data.companyId,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
      include: bedInclude,
    });
    return NextResponse.json(serialize(created), { status: 201 });
  } catch (error) {
    return dbUnavailable(error);
  }
}
