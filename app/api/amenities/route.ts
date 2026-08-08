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

/** AmenityID / AmenityFacilityCategoryID are BigInt columns — convert to number before NextResponse.json(). */
function serialize<T extends { amenityId: bigint; amenityFacilityCategoryId: bigint }>(row: T) {
  return {
    ...row,
    amenityId: Number(row.amenityId),
    amenityFacilityCategoryId: Number(row.amenityFacilityCategoryId),
  };
}

const amenityInclude = {
  category: { select: { categoryName: true } },
} as const;

const createSchema = z.object({
  amenityFacilityCategoryId: z.number().int().positive(),
  amenityCode: z.string().trim().min(1).max(50),
  amenityName: z.string().trim().min(1).max(250),
  description: z.string().trim().max(20000).optional().or(z.literal("")).nullable(),
  icon: z.string().trim().max(255).optional().or(z.literal("")).nullable(),
  isFilterable: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

/** Amenity master — WiFi, TV, Mini Bar, … grouped under an Amenity/Facility Category. Global. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const includeDeleted = searchParams.get("includeDeleted") === "true";
    const filterableOnly = searchParams.get("filterableOnly") === "true";
    const categoryIdParam = searchParams.get("categoryId");
    const categoryId = categoryIdParam ? Number(categoryIdParam) : null;

    const rows = await prisma.amenity.findMany({
      where: {
        ...(activeOnly ? { isActive: true } : {}),
        ...(includeDeleted ? {} : { isDeleted: false }),
        ...(filterableOnly ? { isFilterable: true } : {}),
        ...(categoryId ? { amenityFacilityCategoryId: BigInt(categoryId) } : {}),
      },
      include: amenityInclude,
      orderBy: [{ displayOrder: "asc" }, { amenityName: "asc" }],
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
    const category = await prisma.amenityFacilityCategory.findUnique({
      where: { amenityFacilityCategoryId: BigInt(data.amenityFacilityCategoryId) },
    });
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 400 });

    const created = await prisma.amenity.create({
      data: {
        amenityFacilityCategoryId: BigInt(data.amenityFacilityCategoryId),
        amenityCode: data.amenityCode.trim().toUpperCase(),
        amenityName: data.amenityName,
        description: data.description?.trim() || null,
        icon: data.icon?.trim() || null,
        isFilterable: data.isFilterable ?? false,
        displayOrder: data.displayOrder ?? 0,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
      include: amenityInclude,
    });
    return NextResponse.json(serialize(created), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This amenity code already exists" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
