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

/** SmokingTypeID is a BigInt column — convert to number before NextResponse.json(). */
function serialize<T extends { smokingTypeId: bigint }>(row: T) {
  return { ...row, smokingTypeId: Number(row.smokingTypeId) };
}

const createSchema = z.object({
  smokingTypeCode: z.string().trim().min(1).max(50),
  smokingTypeName: z.string().trim().min(1).max(200),
  description: z.string().trim().max(20000).optional().or(z.literal("")).nullable(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

/** Smoking Type master — Non Smoking, Smoking Allowed, Balcony Smoking, … Global. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const includeDeleted = searchParams.get("includeDeleted") === "true";

    const rows = await prisma.smokingType.findMany({
      where: {
        ...(activeOnly ? { isActive: true } : {}),
        ...(includeDeleted ? {} : { isDeleted: false }),
      },
      orderBy: [{ displayOrder: "asc" }, { smokingTypeName: "asc" }],
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
    const created = await prisma.smokingType.create({
      data: {
        smokingTypeCode: data.smokingTypeCode.trim().toUpperCase(),
        smokingTypeName: data.smokingTypeName,
        description: data.description?.trim() || null,
        displayOrder: data.displayOrder ?? 0,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
    });
    return NextResponse.json(serialize(created), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This smoking type code already exists" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
