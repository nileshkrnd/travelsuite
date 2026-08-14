import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import {
  propertyRoomInclude,
  propertyRoomWriteSchema,
  serializePropertyRoomRow,
  toPropertyRoomCreateData,
  validatePropertyRoomLookups,
} from "@/lib/api/property-room-helpers";

const createSchema = propertyRoomWriteSchema.and(z.object({ createdBy: z.number().int().positive() }));

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get("tenantId");
    const companyIdParam = searchParams.get("companyId");
    const propertyIdParam = searchParams.get("propertyId");
    const roomTypeIdParam = searchParams.get("roomTypeId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.PropertyRoomWhereInput = {};
    if (tenantIdParam) where.tenantId = Number(tenantIdParam);
    if (companyIdParam) where.companyId = Number(companyIdParam);
    if (propertyIdParam) where.propertyId = Number(propertyIdParam);
    if (roomTypeIdParam) where.roomTypeId = BigInt(roomTypeIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.propertyRoom.findMany({
      where,
      include: propertyRoomInclude,
      orderBy: [{ displayOrder: "asc" }, { roomName: "asc" }],
    });
    return NextResponse.json(rows.map(serializePropertyRoomRow));
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
    const lookupError = await validatePropertyRoomLookups(data);
    if (lookupError) return lookupError;

    const created = await prisma.propertyRoom.create({
      data: toPropertyRoomCreateData(data),
      include: propertyRoomInclude,
    });
    return NextResponse.json(serializePropertyRoomRow(created), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "A room with this code already exists for this property" },
        { status: 409 }
      );
    }
    return dbUnavailable(error);
  }
}
