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

/** AmenityFacilityCategoryID is a BigInt column — convert to number before NextResponse.json(). */
function serialize<T extends { amenityFacilityCategoryId: bigint }>(row: T) {
  return { ...row, amenityFacilityCategoryId: Number(row.amenityFacilityCategoryId) };
}

const applicableToEnum = z.enum(["PROPERTY", "ROOM", "BOTH"]);

const createSchema = z.object({
  categoryCode: z.string().trim().min(1).max(50),
  categoryName: z.string().trim().min(1).max(150),
  applicableTo: applicableToEnum,
  description: z.string().trim().max(20000).optional().or(z.literal("")).nullable(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

/** Amenity/Facility Category master — Property Facilities, Room Amenities, … Global. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const includeDeleted = searchParams.get("includeDeleted") === "true";
    const applicableTo = applicableToEnum.safeParse(searchParams.get("applicableTo"));

    const rows = await prisma.amenityFacilityCategory.findMany({
      where: {
        ...(activeOnly ? { isActive: true } : {}),
        ...(includeDeleted ? {} : { isDeleted: false }),
        ...(applicableTo.success ? { applicableTo: applicableTo.data } : {}),
      },
      orderBy: [{ displayOrder: "asc" }, { categoryName: "asc" }],
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
    const created = await prisma.amenityFacilityCategory.create({
      data: {
        categoryCode: data.categoryCode.trim().toUpperCase(),
        categoryName: data.categoryName,
        applicableTo: data.applicableTo,
        description: data.description?.trim() || null,
        displayOrder: data.displayOrder ?? 0,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
    });
    return NextResponse.json(serialize(created), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This category code already exists" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
