import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const createSchema = z.object({
  propertyRoomId: z.number().int().positive(),
  viewTypeId: z.number().int().positive(),
  isPrimary: z.boolean().optional(),
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

const viewInclude = { viewType: { select: { viewTypeCode: true, viewTypeName: true } } } as const;

function serialize<T extends { propertyRoomTypeViewId: bigint; propertyRoomId: bigint; viewTypeId: bigint }>(row: T) {
  return {
    ...row,
    propertyRoomTypeViewId: Number(row.propertyRoomTypeViewId),
    propertyRoomId: Number(row.propertyRoomId),
    viewTypeId: Number(row.viewTypeId),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyRoomIdParam = searchParams.get("propertyRoomId");
    const tenantIdParam = searchParams.get("tenantId");

    const where: Prisma.PropertyRoomTypeViewWhereInput = {};
    if (propertyRoomIdParam) where.propertyRoomId = BigInt(propertyRoomIdParam);
    if (tenantIdParam) where.tenantId = Number(tenantIdParam);

    const rows = await prisma.propertyRoomTypeView.findMany({
      where,
      include: viewInclude,
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

    const created = await prisma.$transaction(async (tx) => {
      if (data.isPrimary) {
        await tx.propertyRoomTypeView.updateMany({
          where: { propertyRoomId: BigInt(data.propertyRoomId) },
          data: { isPrimary: false },
        });
      }
      return tx.propertyRoomTypeView.create({
        data: {
          propertyRoomId: BigInt(data.propertyRoomId),
          viewTypeId: BigInt(data.viewTypeId),
          isPrimary: data.isPrimary ?? false,
          tenantId: data.tenantId,
          companyId: data.companyId,
          isActive: data.isActive ?? true,
          createdBy: data.createdBy,
        },
        include: viewInclude,
      });
    });
    return NextResponse.json(serialize(created), { status: 201 });
  } catch (error) {
    return dbUnavailable(error);
  }
}
