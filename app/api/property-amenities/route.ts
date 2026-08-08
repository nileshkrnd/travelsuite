import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const amenityInclude = {
  amenity: {
    select: {
      amenityId: true,
      amenityCode: true,
      amenityName: true,
      icon: true,
      amenityFacilityCategoryId: true,
      category: { select: { categoryName: true } },
    },
  },
} as const;

function serialize(row: {
  amenity: {
    amenityId: bigint;
    amenityCode: string;
    amenityName: string;
    icon: string | null;
    amenityFacilityCategoryId: bigint;
    category: { categoryName: string };
  };
}) {
  return {
    amenityId: Number(row.amenity.amenityId),
    amenityCode: row.amenity.amenityCode,
    amenityName: row.amenity.amenityName,
    icon: row.amenity.icon,
    categoryId: Number(row.amenity.amenityFacilityCategoryId),
    categoryName: row.amenity.category.categoryName,
  };
}

/** Amenities selected for a property (joined with the Amenity master for name/icon/category). */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyIdParam = searchParams.get("propertyId");
    if (!propertyIdParam) return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    const propertyId = Number(propertyIdParam);
    if (!Number.isFinite(propertyId) || propertyId <= 0) {
      return NextResponse.json({ error: "Invalid propertyId" }, { status: 400 });
    }

    const rows = await prisma.propertyAmenity.findMany({
      where: { propertyId, amenity: { isDeleted: false } },
      include: amenityInclude,
      orderBy: { amenity: { displayOrder: "asc" } },
    });
    return NextResponse.json(rows.map(serialize));
  } catch (error) {
    return dbUnavailable(error);
  }
}

const putSchema = z.object({
  propertyId: z.number().int().positive(),
  amenityIds: z.array(z.number().int().positive()),
});

/** Replaces the full set of amenities selected for a property. */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const parsed = putSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }
    const { propertyId, amenityIds } = parsed.data;

    const property = await prisma.property.findUnique({ where: { propertyId } });
    if (!property) return NextResponse.json({ error: "Property not found" }, { status: 400 });

    const uniqueIds = [...new Set(amenityIds)];
    if (uniqueIds.length > 0) {
      const found = await prisma.amenity.findMany({
        where: { amenityId: { in: uniqueIds.map(BigInt) } },
      });
      if (found.length !== uniqueIds.length) {
        return NextResponse.json({ error: "One or more amenities were not found" }, { status: 400 });
      }
    }

    await prisma.$transaction([
      prisma.propertyAmenity.deleteMany({ where: { propertyId } }),
      prisma.propertyAmenity.createMany({
        data: uniqueIds.map((amenityId) => ({ propertyId, amenityId: BigInt(amenityId) })),
      }),
    ]);

    const rows = await prisma.propertyAmenity.findMany({
      where: { propertyId },
      include: amenityInclude,
      orderBy: { amenity: { displayOrder: "asc" } },
    });
    return NextResponse.json(rows.map(serialize));
  } catch (error) {
    return dbUnavailable(error);
  }
}
