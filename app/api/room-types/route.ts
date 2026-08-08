import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";

function dbUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : "Database error";
  return NextResponse.json(
    { error: `Database unavailable: ${message}. Ensure PostgreSQL is running and DATABASE_URL is set.` },
    { status: 503 }
  );
}

/** RoomTypeID / RoomCategoryID are BigInt columns — convert to number before NextResponse.json(). */
function serialize<T extends { roomTypeId: bigint; roomCategoryId: bigint }>(row: T) {
  return {
    ...row,
    roomTypeId: Number(row.roomTypeId),
    roomCategoryId: Number(row.roomCategoryId),
  };
}

const roomTypeInclude = {
  category: { select: { roomCategoryName: true } },
} as const;

const createSchema = z.object({
  roomCategoryId: z.number().int().positive(),
  roomTypeCode: z.string().trim().min(1).max(50),
  roomTypeName: z.string().trim().min(1).max(200),
  description: z.string().trim().max(20000).optional().or(z.literal("")).nullable(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

/** Room Type master — individual room types (Standard King Room, Deluxe Sea View Room, …), grouped under a Room Category. Global. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const includeDeleted = searchParams.get("includeDeleted") === "true";
    const roomCategoryIdParam = searchParams.get("roomCategoryId");
    const roomCategoryId = roomCategoryIdParam ? Number(roomCategoryIdParam) : null;

    const rows = await prisma.roomType.findMany({
      where: {
        ...(activeOnly ? { isActive: true } : {}),
        ...(includeDeleted ? {} : { isDeleted: false }),
        ...(roomCategoryId ? { roomCategoryId: BigInt(roomCategoryId) } : {}),
      },
      include: roomTypeInclude,
      orderBy: [{ displayOrder: "asc" }, { roomTypeName: "asc" }],
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
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const category = await prisma.roomCategory.findUnique({
      where: { roomCategoryId: BigInt(data.roomCategoryId) },
    });
    if (!category) return NextResponse.json({ error: "Room category not found" }, { status: 400 });

    const created = await prisma.roomType.create({
      data: {
        roomCategoryId: BigInt(data.roomCategoryId),
        roomTypeCode: data.roomTypeCode.trim().toUpperCase(),
        roomTypeName: data.roomTypeName,
        description: data.description?.trim() || null,
        displayOrder: data.displayOrder ?? 0,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
      include: roomTypeInclude,
    });
    return NextResponse.json(serialize(created), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This room type code already exists" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
