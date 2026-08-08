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

/** RoomCategoryID is a BigInt column — convert to number before NextResponse.json(). */
function serialize<T extends { roomCategoryId: bigint }>(row: T) {
  return { ...row, roomCategoryId: Number(row.roomCategoryId) };
}

const createSchema = z.object({
  roomCategoryCode: z.string().trim().min(1).max(50),
  roomCategoryName: z.string().trim().min(1).max(200),
  description: z.string().trim().max(20000).optional().or(z.literal("")).nullable(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

/** Room Category master — Standard, Superior, Deluxe, Executive, Suite, Villa, … Global. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const includeDeleted = searchParams.get("includeDeleted") === "true";

    const rows = await prisma.roomCategory.findMany({
      where: {
        ...(activeOnly ? { isActive: true } : {}),
        ...(includeDeleted ? {} : { isDeleted: false }),
      },
      orderBy: [{ displayOrder: "asc" }, { roomCategoryName: "asc" }],
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
    const created = await prisma.roomCategory.create({
      data: {
        roomCategoryCode: data.roomCategoryCode.trim().toUpperCase(),
        roomCategoryName: data.roomCategoryName,
        description: data.description?.trim() || null,
        displayOrder: data.displayOrder ?? 0,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
    });
    return NextResponse.json(serialize(created), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This room category code already exists" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
