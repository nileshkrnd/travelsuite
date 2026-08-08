import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const facilityInclude = {
  facility: {
    select: {
      facilityId: true,
      facilityCode: true,
      facilityName: true,
      icon: true,
      amenityFacilityCategoryId: true,
      category: { select: { categoryName: true } },
    },
  },
} as const;

function serialize(row: {
  facility: {
    facilityId: bigint;
    facilityCode: string;
    facilityName: string;
    icon: string | null;
    amenityFacilityCategoryId: bigint;
    category: { categoryName: string };
  };
}) {
  return {
    facilityId: Number(row.facility.facilityId),
    facilityCode: row.facility.facilityCode,
    facilityName: row.facility.facilityName,
    icon: row.facility.icon,
    categoryId: Number(row.facility.amenityFacilityCategoryId),
    categoryName: row.facility.category.categoryName,
  };
}

/** Facilities selected for a property (joined with the Facility master for name/icon/category). */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyIdParam = searchParams.get("propertyId");
    if (!propertyIdParam) return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    const propertyId = Number(propertyIdParam);
    if (!Number.isFinite(propertyId) || propertyId <= 0) {
      return NextResponse.json({ error: "Invalid propertyId" }, { status: 400 });
    }

    const rows = await prisma.propertyFacility.findMany({
      where: { propertyId, facility: { isDeleted: false } },
      include: facilityInclude,
      orderBy: { facility: { displayOrder: "asc" } },
    });
    return NextResponse.json(rows.map(serialize));
  } catch (error) {
    return dbUnavailable(error);
  }
}

const putSchema = z.object({
  propertyId: z.number().int().positive(),
  facilityIds: z.array(z.number().int().positive()),
});

/** Replaces the full set of facilities selected for a property. */
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
    const { propertyId, facilityIds } = parsed.data;

    const property = await prisma.property.findUnique({ where: { propertyId } });
    if (!property) return NextResponse.json({ error: "Property not found" }, { status: 400 });

    const uniqueIds = [...new Set(facilityIds)];
    if (uniqueIds.length > 0) {
      const found = await prisma.facility.findMany({
        where: { facilityId: { in: uniqueIds.map(BigInt) } },
      });
      if (found.length !== uniqueIds.length) {
        return NextResponse.json({ error: "One or more facilities were not found" }, { status: 400 });
      }
    }

    await prisma.$transaction([
      prisma.propertyFacility.deleteMany({ where: { propertyId } }),
      prisma.propertyFacility.createMany({
        data: uniqueIds.map((facilityId) => ({ propertyId, facilityId: BigInt(facilityId) })),
      }),
    ]);

    const rows = await prisma.propertyFacility.findMany({
      where: { propertyId },
      include: facilityInclude,
      orderBy: { facility: { displayOrder: "asc" } },
    });
    return NextResponse.json(rows.map(serialize));
  } catch (error) {
    return dbUnavailable(error);
  }
}
