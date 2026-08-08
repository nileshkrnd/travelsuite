import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";

/** Parses a route param into a positive BigInt id, or null if invalid. */
function parseId(raw: string | undefined): bigint | null {
  if (!raw || !/^\d+$/.test(raw)) return null;
  const value = BigInt(raw);
  return value > BigInt(0) ? value : null;
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

const updateSchema = z.object({
  roomCategoryId: z.number().int().positive(),
  roomTypeCode: z.string().trim().min(1).max(50),
  roomTypeName: z.string().trim().min(1).max(200),
  description: z.string().trim().max(20000).optional().or(z.literal("")).nullable(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

function dbUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : "Database error";
  return NextResponse.json(
    { error: `Database unavailable: ${message}. Ensure PostgreSQL is running and DATABASE_URL is set.` },
    { status: 503 }
  );
}

type RouteContext = { params: Promise<{ roomTypeId: string }> };

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { roomTypeId } = await context.params;
    const id = parseId(roomTypeId);
    if (id == null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
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

    const updated = await prisma.roomType.update({
      where: { roomTypeId: id },
      data: {
        roomCategoryId: BigInt(data.roomCategoryId),
        roomTypeCode: data.roomTypeCode.trim().toUpperCase(),
        roomTypeName: data.roomTypeName,
        description: data.description?.trim() || null,
        displayOrder: data.displayOrder ?? 0,
        isActive: data.isActive,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: roomTypeInclude,
    });
    return NextResponse.json(serialize(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Room type not found" }, { status: 404 });
      if (error.code === "P2002") {
        return NextResponse.json({ error: "This room type code already exists" }, { status: 409 });
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { roomTypeId } = await context.params;
    const id = parseId(roomTypeId);
    if (id == null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const updated = await prisma.roomType.update({
      where: { roomTypeId: id },
      data: {
        isActive: parsed.data.isActive,
        modifiedBy: parsed.data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: roomTypeInclude,
    });
    return NextResponse.json(serialize(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Room type not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

/** Soft delete — sets IsDeleted = true rather than removing the row. */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { roomTypeId } = await context.params;
    const id = parseId(roomTypeId);
    if (id == null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const modifiedBy = Number(searchParams.get("modifiedBy"));

    await prisma.roomType.update({
      where: { roomTypeId: id },
      data: {
        isDeleted: true,
        modifiedBy: Number.isFinite(modifiedBy) && modifiedBy > 0 ? modifiedBy : undefined,
        modifiedDtTm: new Date(),
      },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Room type not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
