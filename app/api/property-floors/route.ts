import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { propertyFloorInclude } from "@/lib/api/property-floor-unit-helpers";

const createSchema = z.object({
  propertyId: z.number().int().positive(),
  floorCode: z.string().trim().min(1).max(50),
  floorNumber: z.number().int(),
  floorName: z.string().trim().min(1).max(100),
  floorTypeId: z.number().int().positive(),
  displayOrder: z.number().int().optional(),
  totalUnits: z.number().int().min(0).nullable().optional(),
  occupiedUnits: z.number().int().min(0).nullable().optional(),
  availableUnits: z.number().int().min(0).nullable().optional(),
  floorArea: z.number().nonnegative().nullable().optional(),
  areaUnitId: z.number().int().positive().nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

function serialize<T extends { propertyFloorId: bigint; floorTypeId: bigint; areaUnitId: bigint | null }>(row: T) {
  return {
    ...row,
    propertyFloorId: Number(row.propertyFloorId),
    floorTypeId: Number(row.floorTypeId),
    areaUnitId: row.areaUnitId != null ? Number(row.areaUnitId) : null,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyIdParam = searchParams.get("propertyId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.PropertyFloorWhereInput = {};
    if (propertyIdParam != null && propertyIdParam !== "") where.propertyId = Number(propertyIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.propertyFloor.findMany({
      where,
      include: propertyFloorInclude,
      orderBy: [{ displayOrder: "asc" }, { floorNumber: "asc" }],
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

    const property = await prisma.property.findUnique({ where: { propertyId: data.propertyId } });
    if (!property) return NextResponse.json({ error: "Property not found" }, { status: 400 });

    const floorType = await prisma.floorType.findUnique({ where: { floorTypeId: BigInt(data.floorTypeId) } });
    if (!floorType) return NextResponse.json({ error: "Floor type not found" }, { status: 400 });

    if (data.areaUnitId != null) {
      const areaUnit = await prisma.roomSizeUnit.findUnique({ where: { roomSizeUnitId: BigInt(data.areaUnitId) } });
      if (!areaUnit) return NextResponse.json({ error: "Area unit not found" }, { status: 400 });
    }

    const created = await prisma.propertyFloor.create({
      data: {
        propertyId: data.propertyId,
        floorCode: data.floorCode.trim().toUpperCase(),
        floorNumber: data.floorNumber,
        floorName: data.floorName.trim(),
        floorTypeId: BigInt(data.floorTypeId),
        displayOrder: data.displayOrder ?? data.floorNumber,
        totalUnits: data.totalUnits ?? null,
        occupiedUnits: data.occupiedUnits ?? null,
        availableUnits: data.availableUnits ?? null,
        floorArea: data.floorArea ?? null,
        areaUnitId: data.areaUnitId != null ? BigInt(data.areaUnitId) : null,
        description: data.description?.trim() || null,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
      include: propertyFloorInclude,
    });
    return NextResponse.json(serialize(created), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This floor code or number already exists for this property" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
